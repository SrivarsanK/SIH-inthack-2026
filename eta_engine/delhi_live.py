"""
Yara — CH-3 Delhi Live Telemetry (Real OTD GTFS-Realtime)
==========================================================
Fetches real-time bus positions from Delhi Open Transit Data (OTD)
GTFS-Realtime VehiclePositions protobuf feed.

API: https://otd.delhi.gov.in/api/realtime/VehiclePositions.pb?key=...
Source: Delhi Transport Corporation (DTC) + Delhi Cluster Scheme buses.
Feed: ~4800+ live vehicles, ~1200 unique routes, updated every ~15s.

No mock data. All positions, speeds, and bearings are computed from
real GPS telemetry delivered via GTFS-Realtime protobuf.
"""

from __future__ import annotations

import logging
import math
import os
import threading
import time
from typing import Any, Dict, List, Optional

import requests
from google.transit import gtfs_realtime_pb2

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# OTD API Configuration
# ---------------------------------------------------------------------------
OTD_API_KEY = os.environ.get(
    "OTD_DELHI_API_KEY",
    "wwTy9yZQ6Z42NzZf63xwYSPazRY1aWA0",
)
OTD_VEHICLE_POSITIONS_URL = (
    f"https://otd.delhi.gov.in/api/realtime/VehiclePositions.pb?key={OTD_API_KEY}"
)
POLL_INTERVAL_SEC = 15  # OTD recommends 10-30s refresh

# ---------------------------------------------------------------------------
# Delhi Major Landmarks (for nearest-stop matching & display)
# ---------------------------------------------------------------------------
DELHI_STOPS: Dict[str, Dict[str, Any]] = {
    "DL-ST-101": {
        "stop_id": "DL-ST-101",
        "stop_name": "Kashmere Gate ISBT",
        "stop_lat": 28.6665,
        "stop_lon": 77.2332,
        "city": "Delhi",
    },
    "DL-ST-102": {
        "stop_id": "DL-ST-102",
        "stop_name": "Old Delhi Railway Station",
        "stop_lat": 28.6580,
        "stop_lon": 77.2300,
        "city": "Delhi",
    },
    "DL-ST-103": {
        "stop_id": "DL-ST-103",
        "stop_name": "Red Fort (Lal Qila)",
        "stop_lat": 28.6562,
        "stop_lon": 77.2410,
        "city": "Delhi",
    },
    "DL-ST-104": {
        "stop_id": "DL-ST-104",
        "stop_name": "Delhi Gate",
        "stop_lat": 28.6405,
        "stop_lon": 77.2405,
        "city": "Delhi",
    },
    "DL-ST-105": {
        "stop_id": "DL-ST-105",
        "stop_name": "ITO Crossing",
        "stop_lat": 28.6289,
        "stop_lon": 77.2415,
        "city": "Delhi",
    },
    "DL-ST-106": {
        "stop_id": "DL-ST-106",
        "stop_name": "Connaught Place (Palika Bazar)",
        "stop_lat": 28.6315,
        "stop_lon": 77.2167,
        "city": "Delhi",
    },
    "DL-ST-107": {
        "stop_id": "DL-ST-107",
        "stop_name": "AIIMS Hospital",
        "stop_lat": 28.5672,
        "stop_lon": 77.2100,
        "city": "Delhi",
    },
    "DL-ST-108": {
        "stop_id": "DL-ST-108",
        "stop_name": "Nehru Place",
        "stop_lat": 28.5491,
        "stop_lon": 77.2531,
        "city": "Delhi",
    },
    "DL-ST-109": {
        "stop_id": "DL-ST-109",
        "stop_name": "Anand Vihar ISBT",
        "stop_lat": 28.6469,
        "stop_lon": 77.3164,
        "city": "Delhi",
    },
    "DL-ST-110": {
        "stop_id": "DL-ST-110",
        "stop_name": "Mehrauli Terminal",
        "stop_lat": 28.5237,
        "stop_lon": 77.1855,
        "city": "Delhi",
    },
    "DL-ST-111": {
        "stop_id": "DL-ST-111",
        "stop_name": "Sarai Kale Khan ISBT",
        "stop_lat": 28.5893,
        "stop_lon": 77.2565,
        "city": "Delhi",
    },
    "DL-ST-112": {
        "stop_id": "DL-ST-112",
        "stop_name": "Janakpuri West",
        "stop_lat": 28.6208,
        "stop_lon": 77.0805,
        "city": "Delhi",
    },
    "DL-ST-113": {
        "stop_id": "DL-ST-113",
        "stop_name": "Dwarka Sector 21",
        "stop_lat": 28.5571,
        "stop_lon": 77.0589,
        "city": "Delhi",
    },
    "DL-ST-114": {
        "stop_id": "DL-ST-114",
        "stop_name": "Mundka Terminal",
        "stop_lat": 28.6837,
        "stop_lon": 77.0284,
        "city": "Delhi",
    },
    "DL-ST-115": {
        "stop_id": "DL-ST-115",
        "stop_name": "Shivaji Stadium (Connaught Place)",
        "stop_lat": 28.6267,
        "stop_lon": 77.2125,
        "city": "Delhi",
    },
}


# ---------------------------------------------------------------------------
# Haversine & Bearing Utilities
# ---------------------------------------------------------------------------
def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in km between two GPS coordinates."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _calc_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Forward azimuth bearing from point 1 to point 2 in degrees."""
    y = math.sin(math.radians(lon2 - lon1)) * math.cos(math.radians(lat2))
    x = math.cos(math.radians(lat1)) * math.sin(math.radians(lat2)) - math.sin(
        math.radians(lat1)
    ) * math.cos(math.radians(lat2)) * math.cos(math.radians(lon2 - lon1))
    return round((math.degrees(math.atan2(y, x)) + 360.0) % 360.0, 1)


def _find_nearest_stop(
    lat: float, lon: float
) -> tuple[str, str, float]:
    """Find closest known Delhi stop to given GPS. Returns (stop_id, name, dist_km)."""
    best_id = ""
    best_name = ""
    best_dist = float("inf")
    for sid, s in DELHI_STOPS.items():
        d = _haversine_km(lat, lon, s["stop_lat"], s["stop_lon"])
        if d < best_dist:
            best_dist = d
            best_id = sid
            best_name = s["stop_name"]
    return best_id, best_name, round(best_dist, 2)


# ---------------------------------------------------------------------------
# In-Memory Live State Store
# ---------------------------------------------------------------------------
class DelhiLiveStore:
    """Thread-safe store for real-time Delhi bus positions.

    Fetches GTFS-Realtime protobuf from OTD, parses VehiclePosition
    entities, computes derived fields (bearing, speed, nearest stop),
    and caches the result for API consumers.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._vehicles: Dict[str, Dict[str, Any]] = {}
        self._prev_positions: Dict[str, tuple[float, float, float]] = {}
        self._route_vehicles: Dict[str, List[str]] = {}
        self._last_fetch_ts: float = 0.0
        self._feed_timestamp: int = 0
        self._entity_count: int = 0
        self._fetch_error: Optional[str] = None
        self._bg_thread: Optional[threading.Thread] = None
        self._running = False

    # ── Protobuf Fetch & Parse ─────────────────────────────────────────────
    def _fetch_and_parse(self) -> None:
        """Fetch VehiclePositions.pb from OTD and update in-memory state."""
        try:
            resp = requests.get(OTD_VEHICLE_POSITIONS_URL, timeout=12)
            resp.raise_for_status()
        except requests.RequestException as exc:
            self._fetch_error = str(exc)
            logger.warning("OTD fetch failed: %s", exc)
            return

        feed = gtfs_realtime_pb2.FeedMessage()
        feed.ParseFromString(resp.content)

        now = time.time()
        new_vehicles: Dict[str, Dict[str, Any]] = {}
        new_route_map: Dict[str, List[str]] = {}

        for entity in feed.entity:
            vp = entity.vehicle
            vid = vp.vehicle.id or entity.id
            if not vid:
                continue

            lat = round(vp.position.latitude, 6)
            lon = round(vp.position.longitude, 6)
            route_id = vp.trip.route_id or ""
            trip_id = vp.trip.trip_id or ""
            direction_id = vp.trip.direction_id
            ts = vp.timestamp or int(now)

            # Skip invalid positions
            if lat == 0.0 and lon == 0.0:
                continue

            # ── Compute bearing & speed from previous position ──────────
            bearing = 0.0
            speed_kmh = 0.0
            prev = self._prev_positions.get(vid)
            if prev:
                plat, plon, pts = prev
                dist_km = _haversine_km(plat, plon, lat, lon)
                dt = max(ts - pts, 1)
                # Only compute if bus actually moved (>5m)
                if dist_km > 0.005:
                    bearing = _calc_bearing(plat, plon, lat, lon)
                    speed_kmh = round((dist_km / (dt / 3600.0)), 1)
                    # Clamp unrealistic speeds (GPS jumps)
                    if speed_kmh > 100.0:
                        speed_kmh = 0.0
                        bearing = 0.0

            # Store current position for next bearing computation
            self._prev_positions[vid] = (lat, lon, float(ts))

            # ── Find nearest known stop ─────────────────────────────────
            near_id, near_name, near_dist = _find_nearest_stop(lat, lon)

            # ── ETA to nearest stop (simple speed-based) ────────────────
            if speed_kmh > 2.0 and near_dist > 0.01:
                eta_sec = max(15, round((near_dist / speed_kmh) * 3600))
            else:
                eta_sec = 0  # stationary or at stop

            vehicle_data: Dict[str, Any] = {
                "bus_id": vid,
                "vehicle_label": vp.vehicle.label or vid,
                "city": "Delhi",
                "agency": "DTC Delhi",
                "provider": "Delhi Open Transit Data (OTD)",
                "route_id": route_id,
                "trip_id": trip_id,
                "direction_id": direction_id,
                "direction_label": "Return" if direction_id == 1 else "Outbound",
                "lat": lat,
                "lon": lon,
                "bearing": bearing,
                "speed_kmh": speed_kmh,
                "nearest_stop_id": near_id,
                "nearest_stop_name": near_name,
                "nearest_stop_dist_km": near_dist,
                "eta_nearest_stop_sec": eta_sec,
                "eta_nearest_stop_min": max(0, round(eta_sec / 60)),
                "gps_fix": True,
                "gps_timestamp": ts,
                "current_status": vp.current_status,
                "schedule_relationship": vp.trip.schedule_relationship,
                "updated_at": time.strftime(
                    "%Y-%m-%dT%H:%M:%SZ", time.gmtime(ts)
                ),
            }

            new_vehicles[vid] = vehicle_data

            # Index by route
            if route_id:
                new_route_map.setdefault(route_id, []).append(vid)

        with self._lock:
            self._vehicles = new_vehicles
            self._route_vehicles = new_route_map
            self._last_fetch_ts = now
            self._feed_timestamp = feed.header.timestamp
            self._entity_count = len(new_vehicles)
            self._fetch_error = None

        logger.info(
            "OTD feed parsed: %d vehicles, %d routes, feed_ts=%d",
            len(new_vehicles),
            len(new_route_map),
            feed.header.timestamp,
        )

    # ── Background Polling Thread ──────────────────────────────────────────
    def start_background_polling(self) -> None:
        """Start background thread that polls OTD every POLL_INTERVAL_SEC."""
        if self._running:
            return
        self._running = True
        self._bg_thread = threading.Thread(
            target=self._poll_loop, daemon=True, name="otd-delhi-poller"
        )
        self._bg_thread.start()
        logger.info("OTD Delhi background poller started (interval=%ds)", POLL_INTERVAL_SEC)

    def _poll_loop(self) -> None:
        while self._running:
            try:
                self._fetch_and_parse()
            except Exception as exc:
                logger.exception("OTD poll error: %s", exc)
            time.sleep(POLL_INTERVAL_SEC)

    def stop_polling(self) -> None:
        self._running = False

    # ── Public Query Methods ───────────────────────────────────────────────
    def get_all_vehicles(self) -> List[Dict[str, Any]]:
        """Return all live Delhi bus positions."""
        with self._lock:
            return list(self._vehicles.values())

    def get_vehicle(self, bus_id: str) -> Optional[Dict[str, Any]]:
        """Return a single vehicle by ID (registration plate)."""
        with self._lock:
            return self._vehicles.get(bus_id)

    def get_vehicles_by_route(self, route_id: str) -> List[Dict[str, Any]]:
        """Return all vehicles on a specific route."""
        with self._lock:
            vids = self._route_vehicles.get(route_id, [])
            return [self._vehicles[v] for v in vids if v in self._vehicles]

    def get_vehicles_near(
        self, lat: float, lon: float, radius_km: float = 2.0, limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Return vehicles within radius_km of a GPS point, sorted by distance."""
        with self._lock:
            results: list[tuple[float, Dict[str, Any]]] = []
            for v in self._vehicles.values():
                d = _haversine_km(lat, lon, v["lat"], v["lon"])
                if d <= radius_km:
                    results.append((d, {**v, "distance_km": round(d, 2)}))
            results.sort(key=lambda x: x[0])
            return [r[1] for r in results[:limit]]

    def get_route_ids(self) -> List[str]:
        """Return all active route IDs with live vehicles."""
        with self._lock:
            return sorted(self._route_vehicles.keys())

    def get_stats(self) -> Dict[str, Any]:
        """Return feed metadata & stats."""
        with self._lock:
            return {
                "total_vehicles": self._entity_count,
                "total_routes": len(self._route_vehicles),
                "feed_timestamp": self._feed_timestamp,
                "last_fetch_ts": self._last_fetch_ts,
                "poll_interval_sec": POLL_INTERVAL_SEC,
                "fetch_error": self._fetch_error,
                "api_source": "https://otd.delhi.gov.in",
                "provider": "Delhi Open Transit Data (OTD)",
            }

    def ensure_fresh(self) -> None:
        """Ensure data is fresh. If stale (>30s), do a blocking fetch."""
        if time.time() - self._last_fetch_ts > 30:
            self._fetch_and_parse()


# ---------------------------------------------------------------------------
# Module-Level Singleton
# ---------------------------------------------------------------------------
_store = DelhiLiveStore()


def get_store() -> DelhiLiveStore:
    """Get the singleton Delhi live store. Starts polling on first access."""
    if not _store._running:
        _store.start_background_polling()
    return _store


# ---------------------------------------------------------------------------
# Convenience Functions (used by api.py endpoints)
# ---------------------------------------------------------------------------
def fetch_delhi_live_telemetry() -> List[Dict[str, Any]]:
    """Fetch all live Delhi bus positions from OTD. Starts poller if needed."""
    store = get_store()
    store.ensure_fresh()
    return store.get_all_vehicles()


def fetch_delhi_bus(bus_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a single Delhi bus by registration plate ID."""
    store = get_store()
    store.ensure_fresh()
    return store.get_vehicle(bus_id)


def fetch_delhi_route_vehicles(route_id: str) -> List[Dict[str, Any]]:
    """Fetch all live vehicles on a specific OTD route."""
    store = get_store()
    store.ensure_fresh()
    return store.get_vehicles_by_route(route_id)


def fetch_delhi_nearby(
    lat: float, lon: float, radius_km: float = 2.0
) -> List[Dict[str, Any]]:
    """Fetch live buses near a GPS coordinate."""
    store = get_store()
    store.ensure_fresh()
    return store.get_vehicles_near(lat, lon, radius_km)


def get_delhi_stops() -> List[Dict[str, Any]]:
    """Return the Delhi known stops registry."""
    return list(DELHI_STOPS.values())


def get_delhi_stats() -> Dict[str, Any]:
    """Return OTD feed statistics."""
    store = get_store()
    return store.get_stats()
