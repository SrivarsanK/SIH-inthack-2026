"""
eta_engine/gtfs_loader.py
=========================
Parses real Chennai MTC GTFS data from Data_train_test/data/ at startup.
Produces:
  - {trip_id → duration_sec} lookup
  - per-direction median duration (replaces hardcoded 25-min constant)
  - route info dict for /routes REST endpoint

Uses stdlib csv only — no pandas dependency.
"""
import csv
import statistics
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from shared.constants import INBOUND_TOTAL_SEC, OUTBOUND_TOTAL_SEC

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
_DATA_DIR = Path(__file__).resolve().parent / "Data_train_test" / "data"

# Loaded caches (populated by load())
_trip_durations: Dict[str, int] = {}        # trip_id → duration_sec
_trip_meta: Dict[str, Dict[str, Any]] = {}  # trip_id → {route_id, direction_id}
_route_info: Dict[str, Dict[str, str]] = {} # route_id → {short_name, long_name}
_direction_medians: Dict[int, int] = {}     # direction_id (0/1) → median_sec
_load_complete: bool = False
_network_stats: Dict[str, Any] = {}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_time_to_sec(t: str) -> int:
    """Convert HH:MM:SS (may exceed 24h) to total seconds."""
    parts = t.strip().split(":")
    if len(parts) != 3:
        return -1
    try:
        h, m, s = int(parts[0]), int(parts[1]), int(parts[2])
        return h * 3600 + m * 60 + s
    except ValueError:
        return -1


def _load_trips(data_dir: Path) -> Dict[str, Dict[str, Any]]:
    """Parse trips.txt → {trip_id: {route_id, direction_id}}."""
    result: Dict[str, Dict[str, Any]] = {}
    filepath = data_dir / "trips.txt"
    if not filepath.exists():
        return result
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            tid = row.get("trip_id", "").strip()
            if tid:
                result[tid] = {
                    "route_id": row.get("route_id", "").strip(),
                    "direction_id": int(row.get("direction_id", 0)),
                }
    return result


def _load_routes(data_dir: Path) -> Dict[str, Dict[str, str]]:
    """Parse routes.txt → {route_id: {short_name, long_name}}."""
    result: Dict[str, Dict[str, str]] = {}
    filepath = data_dir / "routes.txt"
    if not filepath.exists():
        return result
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rid = row.get("route_id", "").strip()
            if rid:
                result[rid] = {
                    "short_name": row.get("route_short_name", "").strip(),
                    "long_name": row.get("route_long_name", "").strip(),
                    "agency_id": row.get("agency_id", "").strip(),
                }
    return result


def _load_trip_durations(data_dir: Path) -> Dict[str, int]:
    """
    Parse stop_times.txt to compute per-trip duration in seconds.
    duration = last departure_time - first departure_time (by stop_sequence).
    Streams row-by-row to handle the 44 MB file without memory explosion.
    """
    filepath = data_dir / "stop_times.txt"
    if not filepath.exists():
        return {}

    # First pass: track first & last departure per trip using stop_sequence
    first_dep: Dict[str, tuple] = {}   # trip_id → (min_seq, dep_sec)
    last_dep: Dict[str, tuple] = {}    # trip_id → (max_seq, dep_sec)

    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            tid = row.get("trip_id", "").strip()
            if not tid:
                continue
            try:
                seq = int(row.get("stop_sequence", 0))
            except ValueError:
                continue
            dep_raw = row.get("departure_time", "").strip()
            dep_sec = _parse_time_to_sec(dep_raw)
            if dep_sec < 0:
                continue

            if tid not in first_dep or seq < first_dep[tid][0]:
                first_dep[tid] = (seq, dep_sec)
            if tid not in last_dep or seq > last_dep[tid][0]:
                last_dep[tid] = (seq, dep_sec)

    durations: Dict[str, int] = {}
    for tid in first_dep:
        if tid in last_dep:
            dur = last_dep[tid][1] - first_dep[tid][1]
            if dur > 0:
                durations[tid] = dur
    return durations


def _compute_direction_medians(
    durations: Dict[str, int],
    trip_meta: Dict[str, Dict[str, Any]],
) -> Dict[int, int]:
    """Compute median trip duration per direction_id."""
    grouped: Dict[int, List[int]] = {0: [], 1: []}
    for tid, dur in durations.items():
        meta = trip_meta.get(tid)
        if meta is None:
            continue
        d = meta["direction_id"]
        if d in grouped:
            grouped[d].append(dur)
    medians: Dict[int, int] = {}
    for d, vals in grouped.items():
        if vals:
            medians[d] = round(statistics.median(vals))
    return medians


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def load(data_dir: Optional[Path] = None) -> None:
    """
    Parse all GTFS files and populate in-memory caches.
    Called once at API startup. Idempotent — safe to call multiple times.
    """
    global _trip_durations, _trip_meta, _route_info
    global _direction_medians, _load_complete, _network_stats

    if _load_complete:
        return

    target = data_dir or _DATA_DIR
    print(f"[gtfs_loader] Loading GTFS data from: {target}")

    _trip_meta = _load_trips(target)
    _route_info = _load_routes(target)
    _trip_durations = _load_trip_durations(target)
    _direction_medians = _compute_direction_medians(_trip_durations, _trip_meta)

    valid_durs = [d for d in _trip_durations.values() if d > 0]
    _network_stats = {
        "trips_loaded": len(_trip_durations),
        "routes_loaded": len(_route_info),
        "stops_in_trips": len(_trip_meta),
        "median_outbound_sec": _direction_medians.get(0, OUTBOUND_TOTAL_SEC),
        "median_inbound_sec": _direction_medians.get(1, INBOUND_TOTAL_SEC),
        "min_trip_duration_sec": min(valid_durs) if valid_durs else 0,
        "max_trip_duration_sec": max(valid_durs) if valid_durs else 0,
        "data_source": str(target),
    }

    _load_complete = True
    print(
        f"[gtfs_loader] Loaded {len(_trip_durations):,} trip durations. "
        f"Median outbound={_direction_medians.get(0)}s, "
        f"Median inbound={_direction_medians.get(1)}s"
    )


def get_trip_duration_sec(trip_id: str) -> int:
    """Return exact GTFS duration for trip_id, or -1 if not found."""
    return _trip_durations.get(trip_id, -1)


def get_median_duration_sec(direction_id: int) -> int:
    """
    Return network-wide median duration for direction_id.
    direction_id=0 → outbound, direction_id=1 → inbound.
    Falls back to shared/constants.py values if GTFS not loaded.
    """
    if direction_id in _direction_medians:
        return _direction_medians[direction_id]
    return OUTBOUND_TOTAL_SEC if direction_id == 0 else INBOUND_TOTAL_SEC


def get_route_info(route_id: str) -> Dict[str, str]:
    """Return route metadata dict, or empty dict if not found."""
    return _route_info.get(route_id, {})


def get_network_stats() -> Dict[str, Any]:
    """Return summary statistics for /routes endpoint."""
    return dict(_network_stats)


def is_loaded() -> bool:
    """Return True if GTFS data has been successfully parsed."""
    return _load_complete
