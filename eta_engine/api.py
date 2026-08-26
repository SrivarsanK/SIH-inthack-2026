import asyncio
import datetime
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import uvicorn
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from eta_engine import chennai_gtfs, chennai_gtfs_rt, delhi_live, eta_predictor, gtfs_loader, neon_client
from eta_engine.consumers import start_mqtt_consumer
from eta_engine.density import clean_and_get_mac_count, map_mac_to_band
from eta_engine.eta import calculate_eta_components, check_and_update_event_log
from eta_engine.state_store import state_store
from shared.constants import ETA_API_PORT

app = FastAPI(title="Yara CH-3 ETA Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    """Load GTFS data, load ML predictor, seed state, start MQTT consumer."""
    # 1. Load GTFS data (for /routes endpoint and fallback medians)
    gtfs_loader.load()
    state_store.outbound_duration_sec = gtfs_loader.get_median_duration_sec(0)
    state_store.inbound_duration_sec  = gtfs_loader.get_median_duration_sec(1)

    # 2. Load ML model (GradientBoostingRegressor)
    ml_ready = eta_predictor.load()
    if ml_ready:
        print("[api] ETA mode: ML prediction (GradientBoostingRegressor)")
    else:
        print("[api] ETA mode: calculative fallback (GTFS median durations)")

    # 3. Start MQTT consumer background thread
    start_mqtt_consumer()


def build_snapshot() -> Dict[str, Any]:
    """Construct latest transit engine snapshot dictionary."""
    with state_store.lock:
        mac_count     = clean_and_get_mac_count(state_store.mac_deltas)
        occupancy_band = map_mac_to_band(mac_count)
        hour_of_day    = datetime.datetime.now().hour

        t_out, t_dwell, t_in, t_total = calculate_eta_components(
            leg=state_store.leg,
            progress=state_store.progress,
            delay_accumulated_sec=state_store.delay_accumulated_sec,
            hour_of_day=hour_of_day,
            outbound_total_sec=state_store.outbound_duration_sec,
            inbound_total_sec=state_store.inbound_duration_sec,
        )

        state_store.last_T_total_sec = check_and_update_event_log(
            state_store.event_log, state_store.last_T_total_sec, t_total
        )

        return {
            "ts": state_store.ts,
            "vehicle": {
                "lat":      state_store.lat,
                "lon":      state_store.lon,
                "leg":      state_store.leg,
                "progress": state_store.progress,
                "source":   state_store.source,
                "trip_id":  state_store.trip_id,
                "block_id": state_store.block_id,
            },
            "outbound": {
                "T_outbound_sec":   t_out,
                "route_duration_sec": state_store.outbound_duration_sec,
            },
            "inbound": {
                "trip_id":          "trip_inbound_1",
                "T_total_sec":      t_total,
                "T_outbound_sec":   t_out,
                "T_dwell_sec":      t_dwell,
                "T_inbound_sec":    t_in,
                "occupancy_band":   occupancy_band,
                "route_duration_sec": state_store.inbound_duration_sec,
            },
            "meta": {
                "eta_mode":      "ml" if eta_predictor.is_available() else "calculative",
                "hour_of_day":   hour_of_day,
            },
            "event_log": list(state_store.event_log),
        }


# ---------------------------------------------------------------------------
# REST endpoints
# ---------------------------------------------------------------------------

@app.get("/eta")
def get_eta() -> Dict[str, Any]:
    """Single snapshot of current ETA state."""
    return build_snapshot()


@app.get("/model/info")
def get_model_info() -> Dict[str, Any]:
    """ML model metadata — MAE, R², training set size, features."""
    info = eta_predictor.get_model_info()
    info["model_available"] = eta_predictor.is_available()
    info["active_eta_mode"] = "ml" if eta_predictor.is_available() else "calculative"
    return info


@app.get("/routes")
def get_routes() -> Dict[str, Any]:
    """GTFS-derived network statistics."""
    stats = gtfs_loader.get_network_stats()
    return {
        "gtfs_loaded": gtfs_loader.is_loaded(),
        "network_stats": stats,
        "active_durations": {
            "outbound_sec": state_store.outbound_duration_sec,
            "inbound_sec":  state_store.inbound_duration_sec,
            "source":       "gtfs_median" if gtfs_loader.is_loaded() else "constant_fallback",
        },
    }


@app.get("/stream")
async def stream() -> StreamingResponse:
    """SSE endpoint — pushes live transit snapshot every 1 second."""

    async def generator():
        while True:
            snapshot = build_snapshot()
            yield f"data: {json.dumps(snapshot)}\n\n"
            await asyncio.sleep(1)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":              "no-cache",
            "Connection":                 "keep-alive",
            "Access-Control-Allow-Origin": "*",
        },
    )


# ---------------------------------------------------------------------------
# Neon DB GTFS Route Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/routes")
def api_routes(page: int = 1, limit: int = 50) -> Dict[str, Any]:
    """Paginated route list from Neon DB."""
    offset = (max(1, page) - 1) * limit
    try:
        routes = neon_client.query_routes(limit=limit, offset=offset)
        total = neon_client.count_routes()
        return {
            "routes": routes,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit,
        }
    except Exception as err:
        return {"error": str(err), "routes": [], "total": 0}


@app.get("/api/routes/search")
def api_routes_search(q: str = "", limit: int = 20) -> Dict[str, Any]:
    """Search routes by short_name or long_name."""
    try:
        routes = neon_client.search_routes(q, limit=limit)
        return {"routes": routes, "query": q}
    except Exception as err:
        return {"error": str(err), "routes": []}


@app.get("/api/routes/{route_id}/stops")
def api_route_stops(route_id: str, direction: int = 0) -> Dict[str, Any]:
    """Ordered stops for a specific route (direction=0 for forward, direction=1 for return)."""
    try:
        # Strip synthetic direction suffix if present (e.g., "16917-dir1" -> real_id "16917", direction 1)
        real_id = route_id
        req_dir = direction
        if "-dir0" in route_id:
            real_id = route_id.replace("-dir0", "")
            req_dir = 0
        elif "-dir1" in route_id:
            real_id = route_id.replace("-dir1", "")
            req_dir = 1

        stops = neon_client.query_stops_for_route(real_id, direction_id=req_dir)
        return {"route_id": route_id, "real_route_id": real_id, "direction": req_dir, "stops": stops, "total": len(stops)}
    except Exception as err:
        return {"error": str(err), "stops": []}


@app.get("/api/stops/search")
def api_stops_search(q: str = "", limit: int = 20) -> Dict[str, Any]:
    """Search stops by name."""
    try:
        stops = neon_client.search_stops(q, limit=limit)
        return {"stops": stops, "query": q}
    except Exception as err:
        return {"error": str(err), "stops": []}


@app.get("/api/stops/nearby")
def api_stops_nearby(lat: float = 0.0, lon: float = 0.0, limit: int = 5) -> Dict[str, Any]:
    """Find nearest bus stops to given GPS coordinates."""
    if lat == 0.0 and lon == 0.0:
        return {"error": "lat and lon are required", "stops": []}
    try:
        stops = neon_client.query_nearby_stops(lat, lon, limit=limit)
        return {"stops": stops, "lat": lat, "lon": lon, "total": len(stops)}
    except Exception as err:
        return {"error": str(err), "stops": []}


# ---------------------------------------------------------------------------
# Delhi Live Telemetry & OTD Endpoints (Real GTFS-Realtime)
# ---------------------------------------------------------------------------

@app.on_event("startup")
def startup_delhi_poller() -> None:
    """Start the OTD Delhi GTFS-Realtime background poller."""
    try:
        store = delhi_live.get_store()
        print(f"[api] OTD Delhi live poller started (interval={delhi_live.POLL_INTERVAL_SEC}s)")
    except Exception as exc:
        print(f"[api] OTD Delhi poller failed to start: {exc}")


@app.get("/api/live/delhi")
def api_delhi_live(limit: int = 0) -> Dict[str, Any]:
    """Return real-time GPS positions for all active Delhi buses from OTD.
    Optional ?limit=N to cap results (default: all ~4800+ vehicles)."""
    buses = delhi_live.fetch_delhi_live_telemetry()
    if limit > 0:
        buses = buses[:limit]
    stats = delhi_live.get_delhi_stats()
    return {
        "city": "Delhi",
        "agency": "DTC Delhi",
        "provider": "Delhi Open Transit Data (OTD)",
        "source": "https://otd.delhi.gov.in",
        "total_active_buses": stats.get("total_vehicles", len(buses)),
        "total_routes": stats.get("total_routes", 0),
        "feed_timestamp": stats.get("feed_timestamp", 0),
        "returned": len(buses),
        "buses": buses,
    }


@app.get("/api/live/delhi/{bus_id}")
def api_delhi_bus_live(bus_id: str) -> Dict[str, Any]:
    """Return real-time telemetry for a specific Delhi bus (by registration plate)."""
    bus = delhi_live.fetch_delhi_bus(bus_id)
    if not bus:
        return {"error": f"Bus {bus_id} not found in live feed", "city": "Delhi"}
    return {"city": "Delhi", "bus": bus}


@app.get("/api/live/delhi/route/{route_id}")
def api_delhi_route_vehicles(route_id: str) -> Dict[str, Any]:
    """Return all live vehicles on a specific OTD route ID."""
    buses = delhi_live.fetch_delhi_route_vehicles(route_id)
    return {
        "city": "Delhi",
        "route_id": route_id,
        "total": len(buses),
        "buses": buses,
    }


@app.get("/api/live/delhi/nearby")
def api_delhi_nearby(lat: float = 28.6315, lon: float = 77.2167, radius_km: float = 2.0) -> Dict[str, Any]:
    """Return live buses near a GPS coordinate within radius_km."""
    buses = delhi_live.fetch_delhi_nearby(lat, lon, radius_km)
    return {
        "city": "Delhi",
        "lat": lat,
        "lon": lon,
        "radius_km": radius_km,
        "total": len(buses),
        "buses": buses,
    }


@app.get("/api/live/buses")
def api_live_buses(city: str = "Delhi") -> Dict[str, Any]:
    """Multi-city live bus telemetry endpoint."""
    if city.lower() in ("delhi", "new delhi", "dtc"):
        buses = delhi_live.fetch_delhi_live_telemetry()
        stats = delhi_live.get_delhi_stats()
        return {
            "city": "Delhi",
            "agency": "DTC Delhi",
            "provider": "Delhi Open Transit Data (OTD)",
            "total_active_buses": stats.get("total_vehicles", len(buses)),
            "buses": buses,
        }
    elif city.lower() in ("chennai", "mtc", "cmrl"):
        buses = chennai_gtfs_rt.chennai_gtfs_rt_engine.get_live_vehicles_json()
        return {
            "city": "Chennai",
            "agency": "MTC Chennai",
            "provider": "Google Transit GTFS-Realtime (MTC)",
            "total_active_buses": len(buses),
            "buses": buses,
        }
    return {
        "city": city,
        "total_active_buses": 0,
        "buses": [],
    }


# ---------------------------------------------------------------------------
# Google Transit GTFS-Realtime Protocol Buffer Feeds (Chennai)
# Official spec: https://developers.google.com/transit/gtfs-realtime
# ---------------------------------------------------------------------------

@app.get("/gtfs-rt/chennai/vehicle-positions.pb")
def gtfs_rt_chennai_vehicle_positions() -> Response:
    """Official Google Transit GTFS-Realtime VehiclePositions binary Protocol Buffer."""
    pb_bytes = chennai_gtfs_rt.chennai_gtfs_rt_engine.get_vehicle_positions_pb()
    return Response(content=pb_bytes, media_type="application/x-protobuf")


@app.get("/gtfs-rt/chennai/trip-updates.pb")
def gtfs_rt_chennai_trip_updates() -> Response:
    """Official Google Transit GTFS-Realtime TripUpdates binary Protocol Buffer."""
    pb_bytes = chennai_gtfs_rt.chennai_gtfs_rt_engine.get_trip_updates_pb()
    return Response(content=pb_bytes, media_type="application/x-protobuf")


@app.get("/gtfs-rt/chennai/alerts.pb")
def gtfs_rt_chennai_alerts() -> Response:
    """Official Google Transit GTFS-Realtime ServiceAlerts binary Protocol Buffer."""
    pb_bytes = chennai_gtfs_rt.chennai_gtfs_rt_engine.get_alerts_pb()
    return Response(content=pb_bytes, media_type="application/x-protobuf")


# ---------------------------------------------------------------------------
# Chennai GTFS-RT JSON REST Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/live/chennai")
def api_chennai_live() -> Dict[str, Any]:
    """JSON representation of all active live Chennai buses with stop ETAs, speed, occupancy, and GPS fix."""
    vehicles = chennai_gtfs_rt.chennai_gtfs_rt_engine.get_live_vehicles_json()
    return {
        "city": "Chennai",
        "agency": "MTC Chennai",
        "provider": "Google Transit GTFS-Realtime (MTC)",
        "total_active_buses": len(vehicles),
        "buses": vehicles,
    }


@app.get("/api/live/chennai/{vehicle_id}")
def api_chennai_vehicle_live(vehicle_id: str) -> Dict[str, Any]:
    """JSON telemetry for a specific Chennai vehicle."""
    vehicles = chennai_gtfs_rt.chennai_gtfs_rt_engine.get_live_vehicles_json()
    for v in vehicles:
        if v["vehicle_id"] == vehicle_id or v["route_code"].lower() == vehicle_id.lower() or v["license_plate"].lower() == vehicle_id.lower():
            return {"city": "Chennai", "vehicle": v}
    return {"error": f"Vehicle {vehicle_id} not found in live fleet", "city": "Chennai"}


@app.get("/api/gtfs/chennai/routes")
def api_gtfs_chennai_routes() -> Dict[str, Any]:
    """List of all GTFS static routes for Chennai."""
    routes_list = [
        {
            "route_id": r.route_id,
            "route_short_name": r.route_short_name,
            "route_long_name": r.route_long_name,
            "route_type": r.route_type,
            "origin": r.origin,
            "destination": r.destination,
            "canonical_code": r.canonical_code,
        }
        for r in chennai_gtfs.chennai_gtfs_store.routes.values()
    ]
    return {"city": "Chennai", "total": len(routes_list), "routes": routes_list}


@app.get("/api/gtfs/chennai/routes/{route_id}/stops")
def api_gtfs_chennai_route_stops(route_id: str) -> Dict[str, Any]:
    """Ordered stops for a Chennai GTFS route."""
    stops = chennai_gtfs.chennai_gtfs_store.get_route_stops(route_id)
    return {
        "city": "Chennai",
        "route_id": route_id,
        "total": len(stops),
        "stops": [
            {
                "stop_id": s.stop_id,
                "stop_name": s.stop_name,
                "stop_lat": s.stop_lat,
                "stop_lon": s.stop_lon,
            }
            for s in stops
        ],
    }


@app.get("/api/gtfs/chennai/stops/nearby")
def api_gtfs_chennai_nearby_stops(lat: float = 13.0302, lon: float = 80.1806, radius_km: float = 3.0) -> Dict[str, Any]:
    """Find nearest stops in Chennai to GPS coordinates."""
    stops = chennai_gtfs.chennai_gtfs_store.get_nearby_stops(lat, lon, radius_km)
    return {"city": "Chennai", "lat": lat, "lon": lon, "total": len(stops), "stops": stops}


# ---------------------------------------------------------------------------
# Delhi Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/delhi/stops")
def api_delhi_stops() -> Dict[str, Any]:
    """Return registered major Delhi stops."""
    stops = delhi_live.get_delhi_stops()
    return {"city": "Delhi", "total": len(stops), "stops": stops}


@app.get("/api/delhi/routes")
def api_delhi_routes() -> Dict[str, Any]:
    """Return all active OTD route IDs with live vehicles."""
    store = delhi_live.get_store()
    store.ensure_fresh()
    route_ids = store.get_route_ids()
    return {
        "city": "Delhi",
        "provider": "Delhi Open Transit Data (OTD)",
        "total": len(route_ids),
        "route_ids": route_ids,
    }


@app.get("/api/delhi/stats")
def api_delhi_stats() -> Dict[str, Any]:
    """Return OTD feed stats: vehicle count, route count, last fetch time."""
    return delhi_live.get_delhi_stats()


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=ETA_API_PORT)


