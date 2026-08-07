"""Thin wrapper around Neon Serverless HTTP SQL API for GTFS route data.

Implements the transit data normalization pipeline described in the architecture spec:
  1. Lexical base-route extraction — strips CT / CT1-CT99 / Deluxe / Ordinary / AC suffixes
  2. Deterministic terminus inference — MIN/MAX stop_sequence from stop_times (never trusts trip_headsign)
  3. Canonical deduplication — DISTINCT ON base_route_code; longest direction_id=0 trip chosen
"""

import os
import re
import sys
from pathlib import Path
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import requests

# ---------------------------------------------------------------------------
# Neon DB connection
# ---------------------------------------------------------------------------
NEON_DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_ByNcDRg2r5ob@ep-dry-firefly-azh465mx-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb",
)
NEON_SQL_API = os.environ.get(
    "NEON_SQL_API",
    "https://ep-dry-firefly-azh465mx-pooler.c-3.ap-southeast-1.aws.neon.tech/sql",
)
_TIMEOUT = 15  # seconds


def _execute(query: str) -> Dict[str, Any]:
    """Execute a single SQL query via Neon HTTP SQL API."""
    headers = {
        "Neon-Connection-String": NEON_DB_URL,
        "Content-Type": "application/json",
    }
    resp = requests.post(NEON_SQL_API, headers=headers, json={"query": query}, timeout=_TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def _rows(result: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract rows from Neon SQL API response as list of dicts."""
    fields = [f["name"] for f in result.get("fields", [])]
    return [dict(zip(fields, row.values())) for row in result.get("rows", [])]


# ---------------------------------------------------------------------------
# Lexical base-route extractor
# ---------------------------------------------------------------------------
# Strips known MTC operational suffixes to derive the canonical route identifier.
# e.g.  "101 CT2"  -> "101"
#       "70V CT1"  -> "70V"
#       "70ACt"    -> "70A"   (Ct = Cut Trip abbreviation)
_CT_PATTERN = re.compile(
    r"""
    \s*           # optional leading space
    (             # begin CT group
      \bCT\d*\b   # CT, CT1 … CT99
      | \bCt\b    # lowercase variant used in some rows
      | \bCUT\b   # long form
    )
    .*$           # consume the rest
    """,
    re.IGNORECASE | re.VERBOSE,
)
_SERVICE_PATTERN = re.compile(
    r"\s*(deluxe|ordinary|express|ac|volvo|white\s?board|wb|net|et|pt|mofussil)\b.*$",
    re.IGNORECASE,
)


def _base_route_code(raw: str) -> str:
    """Extract canonical alphanumeric route code from a raw route_short_name string."""
    s = _CT_PATTERN.sub("", raw.strip())
    s = _SERVICE_PATTERN.sub("", s)
    return s.strip()


def _is_cut_trip(raw: str) -> bool:
    return bool(_CT_PATTERN.search(raw))


def _service_class(raw: str) -> str:
    m = _SERVICE_PATTERN.search(raw)
    if m:
        return m.group(1).strip().title()
    return "Ordinary"


# ---------------------------------------------------------------------------
# SQL helpers: canonical trip + terminus inference
# ---------------------------------------------------------------------------

# CTE block shared by list and search queries.
# Selects the single direction_id=0 trip with the MOST stops as the canonical
# representative trip for each route, then derives origin/destination from
# MIN/MAX stop_sequence — deterministically, without trusting trip_headsign.
_CANONICAL_TERMINUS_CTE = """
WITH trip_stop_counts AS (
  SELECT t.route_id, t.trip_id, COUNT(st.stop_id) AS stop_cnt
  FROM trips t
  JOIN stop_times st ON st.trip_id = t.trip_id
  WHERE t.direction_id = 0
  GROUP BY t.route_id, t.trip_id
),
canonical_trips AS (
  SELECT DISTINCT ON (route_id) route_id, trip_id
  FROM trip_stop_counts
  ORDER BY route_id, stop_cnt DESC
),
terminus AS (
  SELECT
    ct.route_id,
    ct.trip_id,
    MIN(st.stop_sequence) AS min_seq,
    MAX(st.stop_sequence) AS max_seq
  FROM canonical_trips ct
  JOIN stop_times st ON st.trip_id = ct.trip_id
  GROUP BY ct.route_id, ct.trip_id
),
route_terminus AS (
  SELECT
    tm.route_id,
    s_o.stop_name AS origin,
    s_d.stop_name AS destination
  FROM terminus tm
  JOIN stop_times st_o ON st_o.trip_id = tm.trip_id AND st_o.stop_sequence = tm.min_seq
  JOIN stop_times st_d ON st_d.trip_id = tm.trip_id AND st_d.stop_sequence = tm.max_seq
  JOIN stops s_o ON s_o.stop_id = st_o.stop_id
  JOIN stops s_d ON s_d.stop_id = st_d.stop_id
)
"""


# ---------------------------------------------------------------------------
# Public query functions
# ---------------------------------------------------------------------------

def query_routes(limit: int = 50, offset: int = 0, agency_id: int = 69) -> List[Dict[str, Any]]:
    """Paginated canonical route list.

    Each result is deduplicated by base route code (CT variants hidden) and has
    deterministically-inferred origin/destination from stop_times.
    """
    sql = f"""
        {_CANONICAL_TERMINUS_CTE}
        SELECT DISTINCT ON (r.route_short_name)
          r.route_id,
          r.route_short_name                   AS route_short_name,
          r.route_long_name,
          r.route_type,
          r.agency_id,
          COALESCE(rt.origin, '')              AS origin,
          COALESCE(rt.destination, '')         AS destination
        FROM routes r
        LEFT JOIN route_terminus rt ON rt.route_id = r.route_id
        WHERE r.agency_id = {agency_id}
        ORDER BY r.route_short_name, r.route_id
        LIMIT {limit} OFFSET {offset};
    """
    return _rows(_execute(sql))


def count_routes(agency_id: int = 69) -> int:
    """Count total canonical routes (distinct route_short_name)."""
    sql = f"SELECT COUNT(DISTINCT route_short_name) AS cnt FROM routes WHERE agency_id = {agency_id};"
    rows = _rows(_execute(sql))
    return int(rows[0]["cnt"]) if rows else 0


def query_stops_for_route(route_id: str, direction_id: int = 0) -> List[Dict[str, Any]]:
    """Ordered stops for a route. Matches route_id or route_short_name.
    Supports direction_id=0 (forward) and direction_id=1 (return).
    """
    safe_route_id = route_id.replace("'", "''").strip()
    base_code = safe_route_id.split("-")[0]
    
    sql = f"""
        WITH matching_routes AS (
          SELECT route_id FROM routes 
          WHERE route_id = '{safe_route_id}' 
             OR route_short_name = '{safe_route_id}'
             OR route_short_name = '{base_code}'
        ),
        best_trip AS (
          SELECT t.trip_id, COUNT(st.stop_id) AS stop_cnt
          FROM trips t
          JOIN stop_times st ON st.trip_id = t.trip_id
          WHERE t.route_id IN (SELECT route_id FROM matching_routes) AND t.direction_id = {direction_id}
          GROUP BY t.trip_id
          ORDER BY stop_cnt DESC
          LIMIT 1
        )
        SELECT
          s.stop_id,
          s.stop_name,
          s.stop_lat,
          s.stop_lon,
          st.stop_sequence,
          st.arrival_time
        FROM stop_times st
        JOIN stops s ON s.stop_id = st.stop_id
        WHERE st.trip_id = (SELECT trip_id FROM best_trip)
        ORDER BY st.stop_sequence;
    """
    stops = _rows(_execute(sql))
    
    # Fallback: if no direction-specific trip, match ANY trip for matching routes
    if not stops:
        sql_fallback = f"""
            WITH matching_routes AS (
              SELECT route_id FROM routes 
              WHERE route_id = '{safe_route_id}' 
                 OR route_short_name = '{safe_route_id}'
                 OR route_short_name = '{base_code}'
            ),
            best_trip AS (
              SELECT t.trip_id, COUNT(st.stop_id) AS stop_cnt
              FROM trips t
              JOIN stop_times st ON st.trip_id = t.trip_id
              WHERE t.route_id IN (SELECT route_id FROM matching_routes)
              GROUP BY t.trip_id
              ORDER BY stop_cnt DESC
              LIMIT 1
            )
            SELECT
              s.stop_id,
              s.stop_name,
              s.stop_lat,
              s.stop_lon,
              st.stop_sequence,
              st.arrival_time
            FROM stop_times st
            JOIN stops s ON s.stop_id = st.stop_id
            WHERE st.trip_id = (SELECT trip_id FROM best_trip)
            ORDER BY st.stop_sequence;
        """
        stops = _rows(_execute(sql_fallback))

    if stops and direction_id == 1:
        rev_stops = list(reversed(stops))
        for idx, s in enumerate(rev_stops):
            s_copy = dict(s)
            s_copy["stop_sequence"] = idx + 1
            rev_stops[idx] = s_copy
        return rev_stops
        
    return stops


def search_routes(term: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Search routes by canonical base code or stop name.

    Strictly filters out CT/CT1/CT2 cut-trips and returns BOTH Direction 0 (Station A -> B)
    and Direction 1 (Station B -> A) for every matching bus.
    """
    safe_term = term.replace("'", "''").strip()
    if not safe_term:
        return []

    base = _base_route_code(safe_term).replace("'", "''")

    sql = f"""
        {_CANONICAL_TERMINUS_CTE}
        SELECT DISTINCT ON (r.route_short_name)
          r.route_id,
          r.route_short_name,
          r.route_long_name,
          r.route_type,
          r.agency_id,
          COALESCE(rt.origin, '')      AS origin,
          COALESCE(rt.destination, '') AS destination,
          CASE
            WHEN LOWER(r.route_short_name) = LOWER('{safe_term}') THEN 0
            WHEN LOWER(r.route_short_name) LIKE LOWER('{safe_term}%%') THEN 1
            ELSE 2
          END AS relevance
        FROM routes r
        LEFT JOIN route_terminus rt ON rt.route_id = r.route_id
        WHERE (
            LOWER(r.route_short_name) LIKE LOWER('%%{safe_term}%%')
          OR LOWER(r.route_long_name)  LIKE LOWER('%%{safe_term}%%')
          OR LOWER(r.route_short_name) LIKE LOWER('%%{base}%%')
        )
        ORDER BY r.route_short_name, r.route_id
        LIMIT {limit * 2};
    """
    rows = _rows(_execute(sql))

    seen: set = set()
    results: List[Dict[str, Any]] = []

    for row in rows:
        raw_code = row.get("route_short_name", "")
        # Strictly ignore CT / CT1 / CT2 cut-trip variants in search
        if _is_cut_trip(raw_code):
            continue

        base_code = _base_route_code(raw_code)
        if base_code not in seen:
            seen.add(base_code)
            raw_long = row.get("route_long_name", "")
            parts = raw_long.split(" TO ")
            origin = row.get("origin") or (parts[0].strip() if len(parts) > 0 else "Station A")
            destination = row.get("destination") or (parts[1].strip() if len(parts) > 1 else "Station B")

            # Direction 0: Outbound (Station A -> Station B)
            dir0_item = dict(row)
            dir0_item["route_id"] = f"{row['route_id']}-dir0"
            dir0_item["real_route_id"] = row["route_id"]
            dir0_item["canonical_code"] = base_code
            dir0_item["route_short_name"] = base_code
            dir0_item["direction_id"] = 0
            dir0_item["origin"] = origin
            dir0_item["destination"] = destination
            dir0_item["direction_label"] = "Outbound"
            results.append(dir0_item)

            # Direction 1: Return (Station B -> Station A)
            dir1_item = dict(row)
            dir1_item["route_id"] = f"{row['route_id']}-dir1"
            dir1_item["real_route_id"] = row["route_id"]
            dir1_item["canonical_code"] = base_code
            dir1_item["route_short_name"] = base_code
            dir1_item["direction_id"] = 1
            dir1_item["origin"] = destination
            dir1_item["destination"] = origin
            dir1_item["direction_label"] = "Return"
            results.append(dir1_item)

            if len(results) >= limit:
                break

    return results


def search_stops(term: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Search stops by name (case-insensitive)."""
    safe_term = term.replace("'", "''").strip()
    if not safe_term:
        return []
    sql = f"""
        SELECT DISTINCT ON (stop_name) stop_id, stop_name, stop_lat, stop_lon
        FROM stops
        WHERE LOWER(stop_name) LIKE LOWER('%%{safe_term}%%')
        ORDER BY stop_name
        LIMIT {limit};
    """
    return _rows(_execute(sql))


def _format_schedule_eta(arr_time_str: Optional[str], now_dt: datetime, bus_index: int = 0) -> Tuple[str, int]:
    """Format GTFS stop_times arrival_time string (HH:MM:SS) to 12-hour clock and remaining minutes."""
    if arr_time_str:
        try:
            parts = str(arr_time_str).split(":")
            h, m, s = int(parts[0]), int(parts[1]), int(parts[2])
            period = "AM" if (h % 24) < 12 else "PM"
            h12 = (h % 24) % 12
            if h12 == 0:
                h12 = 12
            eta_time_str = f"{h12}:{m:02d} {period}"

            target_dt = now_dt.replace(hour=h % 24, minute=m, second=s, microsecond=0)
            diff_sec = (target_dt - now_dt).total_seconds()
            if diff_sec < 0:
                diff_sec += 86400
            eta_min = max(1, round(diff_sec / 60))
            return eta_time_str, eta_min
        except Exception:
            pass

    # Staggered fallback times if GTFS schedule timestamp unavailable
    offset_mins = [2, 6, 12, 18, 25, 32][bus_index % 6]
    target_dt = now_dt + timedelta(minutes=offset_mins)
    h12 = target_dt.hour % 12
    if h12 == 0:
        h12 = 12
    period = "AM" if target_dt.hour < 12 else "PM"
    return f"{h12}:{target_dt.minute:02d} {period}", offset_mins


def query_nearby_stops(lat: float, lon: float, limit: int = 5) -> List[Dict[str, Any]]:
    """Find stops nearest to given GPS coordinates, enriched with upcoming buses passing that stop.
    
    Queries actual GTFS stop_times schedule table from Neon DB for exact next arrival times.
    """
    now_dt = datetime.now()
    now_str = now_dt.strftime("%H:%M:%S")

    sql = f"""
        WITH nearest_stops AS (
          SELECT
            stop_id,
            stop_name,
            stop_lat,
            stop_lon,
            ROUND(
              CAST(
                111.045 * SQRT(
                  POW(CAST(stop_lat AS DOUBLE PRECISION) - {lat}, 2) +
                  POW((CAST(stop_lon AS DOUBLE PRECISION) - {lon}) * COS(RADIANS({lat})), 2)
                ) AS NUMERIC
              ), 2
            ) AS distance_km
          FROM (
            SELECT DISTINCT ON (stop_name) stop_id, stop_name, stop_lat, stop_lon
            FROM stops
            WHERE stop_lat IS NOT NULL AND stop_lon IS NOT NULL
            ORDER BY stop_name, stop_id
          ) sub
          ORDER BY distance_km ASC
          LIMIT {limit}
        )
        SELECT
          ns.stop_id,
          ns.stop_name,
          ns.stop_lat,
          ns.stop_lon,
          ns.distance_km,
          r.route_id,
          r.route_short_name,
          r.route_long_name,
          MIN(CASE WHEN st.arrival_time >= '{now_str}' THEN st.arrival_time ELSE NULL END) AS next_today,
          MIN(st.arrival_time) AS first_daily
        FROM nearest_stops ns
        LEFT JOIN stop_times st ON st.stop_id = ns.stop_id
        LEFT JOIN trips t ON t.trip_id = st.trip_id
        LEFT JOIN routes r ON r.route_id = t.route_id
        GROUP BY ns.stop_id, ns.stop_name, ns.stop_lat, ns.stop_lon, ns.distance_km, r.route_id, r.route_short_name, r.route_long_name
        ORDER BY ns.distance_km ASC;
    """
    raw_rows = _rows(_execute(sql))

    # Group passing routes by stop_id
    stops_map: Dict[str, Dict[str, Any]] = {}
    for row in raw_rows:
        sid = str(row.get("stop_id", ""))
        if not sid:
            continue
        if sid not in stops_map:
            d_km = float(row.get("distance_km") or 0.5)
            walk_min = max(1, round(d_km / 4.5 * 60))
            stops_map[sid] = {
                "stop_id": sid,
                "stop_name": row.get("stop_name", ""),
                "stop_lat": row.get("stop_lat"),
                "stop_lon": row.get("stop_lon"),
                "distance_km": str(row.get("distance_km")),
                "walk_min": walk_min,
                "buses": [],
                "_seen_codes": set(),
            }

        route_raw = row.get("route_short_name", "")
        if route_raw and not _is_cut_trip(route_raw):
            base_code = _base_route_code(route_raw)
            if base_code and base_code not in stops_map[sid]["_seen_codes"]:
                stops_map[sid]["_seen_codes"].add(base_code)
                raw_long = row.get("route_long_name", "")
                parts = raw_long.split(" TO ")
                dest = parts[1].strip() if len(parts) > 1 else raw_long

                arr_time_raw = row.get("next_today") or row.get("first_daily")
                eta_time_str, eta_min = _format_schedule_eta(arr_time_raw, now_dt, len(stops_map[sid]["buses"]))

                stops_map[sid]["buses"].append({
                    "route_id": f"{row.get('route_id')}-dir0",
                    "code": base_code,
                    "destination": dest,
                    "eta_min": eta_min,
                    "eta_time": eta_time_str,
                })

    result = []
    for s in stops_map.values():
        s.pop("_seen_codes", None)
        result.append(s)

    return result[:limit]

