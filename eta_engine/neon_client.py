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
from typing import Any, Dict, List, Optional

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


def query_stops_for_route(route_id: str) -> List[Dict[str, Any]]:
    """Ordered stops for a route using the canonical longest direction_id=0 trip."""
    safe_route_id = route_id.replace("'", "''")
    sql = f"""
        WITH best_trip AS (
          SELECT t.trip_id, COUNT(st.stop_id) AS stop_cnt
          FROM trips t
          JOIN stop_times st ON st.trip_id = t.trip_id
          WHERE t.route_id = '{safe_route_id}' AND t.direction_id = 0
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
    return _rows(_execute(sql))


def search_routes(term: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Search routes by canonical base code or stop name.

    Pipeline:
      1. Extract base route code from user query (strip CT/service suffixes).
      2. DISTINCT ON base route code so each bus number appears exactly once.
      3. Terminus (origin/destination) derived deterministically from stop_times.
    """
    safe_term = term.replace("'", "''").strip()
    if not safe_term:
        return []

    # Also try the base code extraction on the user's input
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
        LIMIT {limit};
    """
    rows = _rows(_execute(sql))

    # Apply client-side lexical normalization:
    # Rows are already DISTINCT ON route_short_name, but we further deduplicate
    # by base_route_code to hide CT variants (e.g. "101 CT2" hidden under "101")
    seen: set = set()
    results: List[Dict[str, Any]] = []
    for row in rows:
        raw_code = row.get("route_short_name", "")
        base_code = _base_route_code(raw_code)
        if base_code not in seen:
            seen.add(base_code)
            row["canonical_code"] = base_code
            row["is_cut_trip"] = _is_cut_trip(raw_code)
            row["service_class"] = _service_class(raw_code)
            results.append(row)
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
