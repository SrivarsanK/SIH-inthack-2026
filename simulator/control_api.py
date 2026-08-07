"""
TransitSense — CH-1 Control API
=================================

File:      control_api.py
Channel:   CH-1 (simulator/)
Stack:     Python 3.10, FastAPI

Role
----
Thin REST layer over the simulator engine defined in simulator.py. On
startup it connects the engine to MQTT and schedules its 1Hz tick loop as a
background asyncio task on FastAPI's own event loop — so one process runs
both the telemetry publisher and the control API. Routes only translate
HTTP <-> engine calls; all simulation logic lives in simulator.py.

Endpoints
---------
GET  /health                                  liveness + fleet size
GET  /vehicles                                snapshot of every vehicle
GET  /vehicles/{vehicle_id}                   snapshot of one vehicle
GET  /blocks                                  block_id -> ordered leg chain
POST /vehicles/{vehicle_id}/delay             inject a live delay (hold)
POST /vehicles/{vehicle_id}/gnss-dropout      inject a GNSS fix loss
POST /vehicles/{vehicle_id}/crowd-spike       force an occupancy band

Run:
    pip install fastapi uvicorn paho-mqtt
    python control_api.py
    # or: uvicorn control_api:app --reload

Config (env vars, all optional):
    API_HOST   default "0.0.0.0"
    API_PORT   default 8000
    (plus every env var simulator.py reads: MQTT_BROKER_HOST, GTFS_DIR, ...)
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from simulator import OccupancyBand, VehicleNotFoundError, get_engine

logger = logging.getLogger("transitsense.control_api")


# --------------------------------------------------------------------------- #
# Request / response schemas
# --------------------------------------------------------------------------- #

class DelayRequest(BaseModel):
    seconds: float = Field(..., gt=0, le=3600, description="Duration to hold the vehicle in place, in seconds")


class GnssDropoutRequest(BaseModel):
    duration_s: float = Field(..., gt=0, le=600, description="How long the GNSS fix should be lost, in seconds")


class CrowdSpikeRequest(BaseModel):
    band: OccupancyBand = Field(..., description="Occupancy band to force onto the vehicle")
    duration_s: float = Field(..., gt=0, le=1800, description="How long the forced band should persist, in seconds")


class VehicleTelemetry(BaseModel):
    vehicle_id: str
    block_id: str
    trip_id: str
    route_id: str
    direction: str
    leg_state: str
    timestamp: str
    lat: float
    lon: float
    bearing_deg: float
    speed_kmh: float
    distance_covered_m: float
    leg_total_distance_m: float
    percent_leg_complete: float
    eta_leg_end_s: Optional[int] = None
    dwell_remaining_s: Optional[float] = None
    hold_remaining_s: float
    schedule_deviation_s: int
    gnss_fix: bool
    gnss_dropout_remaining_s: float
    occupancy_band: str
    crowd_spike_active: bool


class LegSummary(BaseModel):
    trip_id: str
    route_id: str
    direction: str
    total_distance_m: float
    dwell_s: int


class BlockSummary(BaseModel):
    block_id: str
    legs: List[LegSummary]


class HealthResponse(BaseModel):
    status: str
    vehicle_count: int
    block_count: int


# --------------------------------------------------------------------------- #
# App lifecycle: start the engine's MQTT connection + 1Hz loop with the API
# --------------------------------------------------------------------------- #

@asynccontextmanager
async def lifespan(app: FastAPI):
    engine = get_engine()
    engine.connect_mqtt()
    engine.start_background()
    logger.info("Simulator engine running in background (%d vehicles, %d blocks); control API ready",
                len(engine.vehicles), len(engine.blocks))
    yield
    engine.stop()
    logger.info("Simulator engine stopped")


app = FastAPI(
    title="Yara Control API",
    description="Injects live delays, GNSS dropouts, and crowd spikes into the CH-1 simulator engine.",
    version="1.0.0",
    lifespan=lifespan,
)

# Dev-friendly CORS default; tighten allow_origins for production deployments.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(VehicleNotFoundError)
async def vehicle_not_found_handler(request: Request, exc: VehicleNotFoundError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": str(exc)})


# --------------------------------------------------------------------------- #
# Read endpoints
# --------------------------------------------------------------------------- #

@app.get("/", include_in_schema=False)
def root():
    return {"service": "TransitSense Control API", "docs": "/docs", "health": "/health"}


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    engine = get_engine()
    return HealthResponse(status="ok", vehicle_count=len(engine.vehicles), block_count=len(engine.blocks))


@app.get("/vehicles", response_model=List[VehicleTelemetry])
def list_vehicles() -> List[dict]:
    return get_engine().list_vehicles()


@app.get("/vehicles/{vehicle_id}", response_model=VehicleTelemetry)
def get_vehicle(vehicle_id: str) -> dict:
    return get_engine().get_vehicle_state(vehicle_id)


@app.get("/blocks", response_model=List[BlockSummary])
def list_blocks() -> List[dict]:
    return get_engine().list_blocks()


# --------------------------------------------------------------------------- #
# Fault-injection endpoints
# --------------------------------------------------------------------------- #

@app.post("/vehicles/{vehicle_id}/delay", response_model=VehicleTelemetry)
def inject_delay(vehicle_id: str, req: DelayRequest) -> dict:
    return get_engine().inject_delay(vehicle_id, req.seconds)


@app.post("/vehicles/{vehicle_id}/gnss-dropout", response_model=VehicleTelemetry)
def inject_gnss_dropout(vehicle_id: str, req: GnssDropoutRequest) -> dict:
    return get_engine().inject_gnss_dropout(vehicle_id, req.duration_s)


@app.post("/vehicles/{vehicle_id}/crowd-spike", response_model=VehicleTelemetry)
def inject_crowd_spike(vehicle_id: str, req: CrowdSpikeRequest) -> dict:
    return get_engine().inject_crowd_spike(vehicle_id, req.band, req.duration_s)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    uvicorn.run(
        app,
        host=os.environ.get("API_HOST", "0.0.0.0"),
        port=int(os.environ.get("API_PORT", "8000")),
    )