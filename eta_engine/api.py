import asyncio
import json
import sys
from pathlib import Path
from typing import Any, Dict

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from eta_engine import gtfs_loader
from eta_engine.consumers import start_mqtt_consumer
from eta_engine.density import clean_and_get_mac_count, map_mac_to_band
from eta_engine.eta import calculate_eta_components, check_and_update_event_log
from eta_engine.state_store import state_store
from shared.constants import ETA_API_PORT

app = FastAPI(title="TransitSense CH-3 ETA Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    """Load GTFS data, seed state durations, then start MQTT consumer."""
    gtfs_loader.load()
    # Override state_store defaults with real GTFS-derived medians
    state_store.outbound_duration_sec = gtfs_loader.get_median_duration_sec(0)
    state_store.inbound_duration_sec = gtfs_loader.get_median_duration_sec(1)
    start_mqtt_consumer()


def build_snapshot() -> Dict[str, Any]:
    """Construct latest transit engine snapshot dictionary."""
    with state_store.lock:
        mac_count = clean_and_get_mac_count(state_store.mac_deltas)
        occupancy_band = map_mac_to_band(mac_count)

        # Use GTFS-derived duration if a matching trip exists, else state median
        gtfs_dur = gtfs_loader.get_trip_duration_sec(state_store.trip_id)
        if gtfs_dur > 0:
            eff_out = gtfs_dur
            eff_in = gtfs_dur
        else:
            eff_out = state_store.outbound_duration_sec
            eff_in = state_store.inbound_duration_sec

        t_out, t_dwell, t_in, t_total = calculate_eta_components(
            state_store.leg,
            state_store.progress,
            state_store.delay_accumulated_sec,
            outbound_total_sec=eff_out,
            inbound_total_sec=eff_in,
        )

        state_store.last_T_total_sec = check_and_update_event_log(
            state_store.event_log, state_store.last_T_total_sec, t_total
        )

        return {
            "ts": state_store.ts,
            "vehicle": {
                "lat": state_store.lat,
                "lon": state_store.lon,
                "leg": state_store.leg,
                "progress": state_store.progress,
                "source": state_store.source,
                "trip_id": state_store.trip_id,
                "block_id": state_store.block_id,
            },
            "outbound": {
                "T_outbound_sec": t_out,
                "route_duration_sec": eff_out,
            },
            "inbound": {
                "trip_id": "trip_inbound_1",
                "T_total_sec": t_total,
                "T_outbound_sec": t_out,
                "T_dwell_sec": t_dwell,
                "T_inbound_sec": t_in,
                "occupancy_band": occupancy_band,
                "route_duration_sec": eff_in,
            },
            "event_log": list(state_store.event_log),
        }


@app.get("/eta")
def get_eta() -> Dict[str, Any]:
    """REST endpoint returning single snapshot."""
    return build_snapshot()


@app.get("/routes")
def get_routes() -> Dict[str, Any]:
    """Return GTFS-derived network statistics and data provenance."""
    stats = gtfs_loader.get_network_stats()
    return {
        "gtfs_loaded": gtfs_loader.is_loaded(),
        "network_stats": stats,
        "active_durations": {
            "outbound_sec": state_store.outbound_duration_sec,
            "inbound_sec": state_store.inbound_duration_sec,
            "source": "gtfs_median" if gtfs_loader.is_loaded() else "constant_fallback",
        },
    }


@app.get("/stream")
async def stream() -> StreamingResponse:
    """SSE endpoint streaming live transit snapshot every 1s."""

    async def generator():
        while True:
            snapshot = build_snapshot()
            yield f"data: {json.dumps(snapshot)}\n\n"
            await asyncio.sleep(1)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        },
    )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=ETA_API_PORT)
