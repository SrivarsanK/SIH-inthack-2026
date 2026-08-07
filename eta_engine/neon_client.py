"""Thin wrapper around Neon Serverless HTTP SQL API for GTFS route data."""

import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

# Neon DB connection details
NEON_DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_ByNcDRg2r5ob@ep-dry-firefly-azh465mx-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb"
)
NEON_SQL_API = os.environ.get(
    "NEON_SQL_API",
    "https://ep-dry-firefly-azh465mx-pooler.c-3.ap-southeast-1.aws.neon.tech/sql"
)

_TIMEOUT = 10  # seconds


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
    """Extract rows from Neon SQL API response."""
    fields = [f["name"] for f in result.get("fields", [])]
    return [dict(zip(fields, row.values())) for row in result.get("rows", [])]


# ---------------------------------------------------------------------------
# Public query functions
# ---------------------------------------------------------------------------

def query_routes(limit: int = 50, offset: int = 0, agency_id: int = 69) -> List[Dict[str, Any]]:
    """Fetch paginated routes from Neon DB.

    Returns list of dicts with keys: route_id, route_short_name, route_long_name, route_type, agency_id
    """
    sql = f"""
        SELECT route_id, route_short_name, route_long_name, route_type, agency_id
        FROM routes
        WHERE agency_id = {agency_id}
        ORDER BY route_short_name
        LIMIT {limit} OFFSET {offset};
    """
    return _rows(_execute(sql))


def count_routes(agency_id: int = 69) -> int:
    """Count total routes for an agency."""
    sql = f"SELECT COUNT(*) as cnt FROM routes WHERE agency_id = {agency_id};"
    rows = _rows(_execute(sql))
    return int(rows[0]["cnt"]) if rows else 0


def query_stops_for_route(route_id: str) -> List[Dict[str, Any]]:
    """Fetch ordered stops for a route by joining trips -> stop_times -> stops.

    Uses direction_id=0 and picks the trip with the most stops as canonical.
    Returns list of dicts with keys: stop_id, stop_name, stop_lat, stop_lon, stop_sequence, arrival_time
    """
    safe_route_id = route_id.replace("'", "''")
    sql = f"""
        WITH canonical_trip AS (
            SELECT t.trip_id
            FROM trips t
            JOIN stop_times st ON st.trip_id = t.trip_id
            WHERE t.route_id = '{safe_route_id}' AND t.direction_id = 0
            GROUP BY t.trip_id
            ORDER BY COUNT(*) DESC
            LIMIT 1
        )
        SELECT s.stop_id, s.stop_name, s.stop_lat, s.stop_lon,
               st.stop_sequence, st.arrival_time
        FROM stop_times st
        JOIN stops s ON s.stop_id = st.stop_id
        WHERE st.trip_id = (SELECT trip_id FROM canonical_trip)
        ORDER BY st.stop_sequence;
    """
    return _rows(_execute(sql))


def search_routes(term: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Search routes by short_name or long_name (deduplicated by route_short_name)."""
    safe_term = term.replace("'", "''").strip()
    if not safe_term:
        return []
    sql = f"""
        SELECT DISTINCT ON (route_short_name) route_id, route_short_name, route_long_name, route_type, agency_id
        FROM routes
        WHERE LOWER(route_short_name) LIKE LOWER('%{safe_term}%')
           OR LOWER(route_long_name) LIKE LOWER('%{safe_term}%')
        ORDER BY route_short_name, route_id
        LIMIT {limit};
    """
    return _rows(_execute(sql))


def search_stops(term: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Search stops by name (case-insensitive)."""
    safe_term = term.replace("'", "''").strip()
    if not safe_term:
        return []
    sql = f"""
        SELECT stop_id, stop_name, stop_lat, stop_lon
        FROM stops
        WHERE LOWER(stop_name) LIKE LOWER('%{safe_term}%')
        ORDER BY stop_name
        LIMIT {limit};
    """
    return _rows(_execute(sql))
