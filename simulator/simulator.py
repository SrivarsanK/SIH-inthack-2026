"""
TransitSense — CH-1 Simulator Engine
=====================================

File:      simulator.py
Channel:   CH-1 (simulator/)
Stack:     Python 3.10, paho-mqtt  (FastAPI lives in the companion control_api.py)

Role
----
Generates 1Hz vehicle telemetry along GTFS-style shapes and publishes it over
MQTT. Vehicles are simulated per `block_id` — i.e. a single physical bus is
followed continuously across its outbound leg, a dwell/layover, and its
inbound leg (and then it cycles again). This is what lets a downstream
ETA-projection service compute a *compounding* ETA
(T_outbound + T_dwell + T_inbound) instead of treating each trip as an
isolated silo — directly addressing the Trip-Bound Visibility Gap.

This module is the *engine only*. It does not run a REST server itself.
`control_api.py` (written separately) will:
    from simulator import get_engine, OccupancyBand, VehicleNotFoundError
    engine = get_engine()
    engine.connect_mqtt()
    engine.start_background()   # schedules engine.run() on the FastAPI event loop
and then call engine.inject_delay(...) / inject_gnss_dropout(...) /
inject_crowd_spike(...) / get_vehicle_state(...) / list_vehicles(...) from
its route handlers.

Run standalone (no REST API, just the simulator + MQTT publisher):
    pip install paho-mqtt
    python simulator.py

Config (env vars, all optional):
    MQTT_BROKER_HOST     default "localhost"
    MQTT_BROKER_PORT     default 1883
    MQTT_TOPIC_PREFIX    default "transitsense"
    TICK_HZ               default 1.0
    NUM_VEHICLES          default 4
    GTFS_DIR              default None -> falls back to a built-in synthetic
                           two-route demo network if unset or invalid

GTFS support: if GTFS_DIR points at a directory containing shapes.txt and
trips.txt, real shapes are loaded and grouped by block_id (dwell time
between legs is approximated at 60s since full stop_times-based layover
computation is out of scope for the simulator). Otherwise a synthetic
demo network (two out-and-back blocks) is generated automatically.
"""

from __future__ import annotations

import asyncio
import bisect
import csv
import json
import logging
import math
import os
import random
import time
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import paho.mqtt.client as mqtt

logger = logging.getLogger("transitsense.simulator")


# --------------------------------------------------------------------------- #
# Exceptions
# --------------------------------------------------------------------------- #

class VehicleNotFoundError(Exception):
    """Raised when a control operation references an unknown vehicle_id."""


# --------------------------------------------------------------------------- #
# Geo helpers
# --------------------------------------------------------------------------- #

def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two points, in meters."""
    r = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Initial compass bearing (0-360) from point 1 to point 2."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dlambda = math.radians(lon2 - lon1)
    x = math.sin(dlambda) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dlambda)
    theta = math.atan2(x, y)
    return (math.degrees(theta) + 360.0) % 360.0


def _densify(coords: List[Tuple[float, float]], points_per_segment: int = 12) -> List[Tuple[float, float]]:
    """Linearly interpolate extra points between anchor coords for smoother motion."""
    if not coords:
        return []
    dense = [coords[0]]
    for i in range(len(coords) - 1):
        lat1, lon1 = coords[i]
        lat2, lon2 = coords[i + 1]
        for s in range(1, points_per_segment + 1):
            t = s / points_per_segment
            dense.append((lat1 + (lat2 - lat1) * t, lon1 + (lon2 - lon1) * t))
    return dense


# --------------------------------------------------------------------------- #
# Domain model
# --------------------------------------------------------------------------- #

class OccupancyBand(str, Enum):
    """Subset of the GTFS-realtime OccupancyStatus enum."""
    EMPTY = "EMPTY"
    MANY_SEATS_AVAILABLE = "MANY_SEATS_AVAILABLE"
    FEW_SEATS_AVAILABLE = "FEW_SEATS_AVAILABLE"
    STANDING_ROOM_ONLY = "STANDING_ROOM_ONLY"
    CRUSHED_STANDING_ROOM_ONLY = "CRUSHED_STANDING_ROOM_ONLY"
    FULL = "FULL"


@dataclass
class ShapePoint:
    seq: int
    lat: float
    lon: float
    dist_m: float  # cumulative distance from the start of the leg


@dataclass
class TripLeg:
    trip_id: str
    route_id: str
    direction: str  # "outbound" | "inbound"
    shape: List[ShapePoint]
    total_distance_m: float
    dwell_s: int  # layover at the END of this leg, before the next leg starts
    dists: List[float] = field(default_factory=list)  # parallel array of shape[i].dist_m for bisect


@dataclass
class Block:
    """A continuous vehicle duty: an ordered, cyclic chain of trip legs sharing one block_id."""
    block_id: str
    legs: List[TripLeg]


@dataclass
class VehicleState:
    vehicle_id: str
    block_id: str
    leg_index: int = 0
    distance_covered_m: float = 0.0
    lat: float = 0.0
    lon: float = 0.0
    bearing_deg: float = 0.0
    speed_kmh: float = 0.0
    base_speed_kmh: float = 28.0
    in_dwell: bool = False
    dwell_remaining_s: float = 0.0
    hold_remaining_s: float = 0.0          # active injected delay (bus physically stalled)
    schedule_deviation_s: int = 0           # cumulative reported delay
    gnss_fix: bool = True
    gnss_dropout_remaining_s: float = 0.0
    last_known_lat: Optional[float] = None
    last_known_lon: Optional[float] = None
    occupancy_band: OccupancyBand = OccupancyBand.MANY_SEATS_AVAILABLE
    crowd_spike_band: Optional[OccupancyBand] = None
    crowd_spike_remaining_s: float = 0.0


# --------------------------------------------------------------------------- #
# Simulator engine
# --------------------------------------------------------------------------- #

class SimulatorEngine:
    def __init__(
        self,
        mqtt_host: str = "localhost",
        mqtt_port: int = 1883,
        tick_hz: float = 1.0,
        gtfs_dir: Optional[str] = None,
        num_vehicles: int = 4,
        topic_prefix: str = "transitsense",
    ) -> None:
        self.mqtt_host = mqtt_host
        self.mqtt_port = mqtt_port
        self.tick_hz = tick_hz
        self._tick_interval = 1.0 / tick_hz if tick_hz > 0 else 1.0
        self.gtfs_dir = gtfs_dir
        self.num_vehicles = num_vehicles
        self.topic_prefix = topic_prefix

        self.blocks: Dict[str, Block] = {}
        self.vehicles: Dict[str, VehicleState] = {}

        self._mqtt = self._make_mqtt_client()
        self._running = False
        self._task: Optional[asyncio.Task] = None

        self._init_blocks()
        self._spawn_vehicles()

    # -- construction ------------------------------------------------------ #

    @staticmethod
    def _make_mqtt_client() -> mqtt.Client:
        client_id = f"transitsense-sim-{uuid.uuid4().hex[:8]}"
        try:  # paho-mqtt >= 2.0 requires an explicit callback API version
            return mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=client_id)
        except AttributeError:  # paho-mqtt 1.x
            return mqtt.Client(client_id=client_id)

    @staticmethod
    def _make_leg(trip_id: str, route_id: str, direction: str,
                  coords: List[Tuple[float, float]], dwell_s: int) -> TripLeg:
        dense = _densify(coords)
        shape: List[ShapePoint] = []
        cum = 0.0
        prev = dense[0]
        for i, (lat, lon) in enumerate(dense):
            if i > 0:
                cum += haversine_m(prev[0], prev[1], lat, lon)
            shape.append(ShapePoint(seq=i, lat=lat, lon=lon, dist_m=cum))
            prev = (lat, lon)
        dists = [p.dist_m for p in shape]
        return TripLeg(trip_id=trip_id, route_id=route_id, direction=direction,
                        shape=shape, total_distance_m=shape[-1].dist_m,
                        dwell_s=dwell_s, dists=dists)

    def _init_blocks(self) -> None:
        blocks: Optional[List[Block]] = None
        if self.gtfs_dir:
            try:
                blocks = self._load_gtfs_dir(Path(self.gtfs_dir))
            except Exception as e:
                logger.error("Failed to parse GTFS dir %s — falling back to synthetic shapes: %s",
                                  self.gtfs_dir, e)
                blocks = None
        if not blocks:
            logger.info("Using built-in synthetic demo network (no valid GTFS_DIR found)")
            blocks = self._build_synthetic_blocks()
        self.blocks = {b.block_id: b for b in blocks}

    def _load_gtfs_dir(self, gtfs_dir: Path) -> Optional[List[Block]]:
        shapes_fp = gtfs_dir / "shapes.txt"
        trips_fp = gtfs_dir / "trips.txt"
        if not shapes_fp.exists() or not trips_fp.exists():
            return None

        shapes: Dict[str, List[Tuple[int, float, float]]] = defaultdict(list)
        with open(shapes_fp, newline="") as f:
            for row in csv.DictReader(f):
                shapes[row["shape_id"]].append(
                    (int(row["shape_pt_sequence"]), float(row["shape_pt_lat"]), float(row["shape_pt_lon"]))
                )
        for sid in shapes:
            shapes[sid].sort(key=lambda x: x[0])

        trips_by_block: Dict[str, List[dict]] = defaultdict(list)
        with open(trips_fp, newline="") as f:
            for row in csv.DictReader(f):
                block_id = row.get("block_id") or row["trip_id"]
                trips_by_block[block_id].append(row)

        blocks: Dict[str, Block] = {}
        for block_id, trip_rows in trips_by_block.items():
            legs: List[TripLeg] = []
            for row in trip_rows:
                shape_id = row.get("shape_id")
                if not shape_id or shape_id not in shapes:
                    continue
                coords = [(lat, lon) for _, lat, lon in shapes[shape_id]]
                direction = "inbound" if row.get("direction_id") == "1" else "outbound"
                leg = self._make_leg(row["trip_id"], row.get("route_id", "UNKNOWN"),
                                      direction, coords, dwell_s=60)
                legs.append(leg)
            if legs:
                blocks[block_id] = Block(block_id=block_id, legs=legs)
        return list(blocks.values()) or None

    def _build_synthetic_blocks(self) -> List[Block]:
        # Demo network: two independent out-and-back blocks (Chennai-ish corridors).
        broadway = (13.0878, 80.2785)
        tambaram = (12.9249, 80.1000)
        broadway_via = (13.0100, 80.2200)

        adyar = (13.0067, 80.2570)
        porur = (13.0381, 80.1565)
        adyar_via = (13.0250, 80.2050)

        out1 = self._make_leg("R1-OUT-1", "R1", "outbound",
                               [broadway, broadway_via, tambaram], dwell_s=90)
        in1 = self._make_leg("R1-IN-1", "R1", "inbound",
                              [tambaram, broadway_via, broadway], dwell_s=90)
        block1 = Block(block_id="BLOCK-1", legs=[out1, in1])

        out2 = self._make_leg("R2-OUT-1", "R2", "outbound",
                               [adyar, adyar_via, porur], dwell_s=75)
        in2 = self._make_leg("R2-IN-1", "R2", "inbound",
                              [porur, adyar_via, adyar], dwell_s=75)
        block2 = Block(block_id="BLOCK-2", legs=[out2, in2])

        return [block1, block2]

    def _spawn_vehicles(self) -> None:
        block_list = list(self.blocks.values())
        if not block_list:
            return
        for i in range(self.num_vehicles):
            block = block_list[i % len(block_list)]
            vehicle_id = f"BUS-{i + 1:03d}"
            leg0 = block.legs[0]
            # Stagger vehicles sharing a block so they aren't stacked on top of each other.
            stagger_fraction = (i // len(block_list)) / max(1, self.num_vehicles // len(block_list))
            v = VehicleState(
                vehicle_id=vehicle_id,
                block_id=block.block_id,
                leg_index=0,
                distance_covered_m=stagger_fraction * leg0.total_distance_m * 0.5,
                base_speed_kmh=random.uniform(22.0, 34.0),
            )
            lat, lon, brg = self._interpolate_position(leg0, v.distance_covered_m)
            v.lat, v.lon, v.bearing_deg = lat, lon, brg
            v.last_known_lat, v.last_known_lon = lat, lon
            self.vehicles[vehicle_id] = v

    # -- MQTT ---------------------------------------------------------------- #

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        if rc == 0:
            logger.info("Connected to MQTT broker %s:%s", self.mqtt_host, self.mqtt_port)
        else:
            logger.error("MQTT connection to %s:%s failed (rc=%s)", self.mqtt_host, self.mqtt_port, rc)

    def _on_disconnect(self, client, userdata, rc, properties=None):
        logger.warning("Disconnected from MQTT broker (rc=%s)", rc)

    def connect_mqtt(self) -> None:
        self._mqtt.on_connect = self._on_connect
        self._mqtt.on_disconnect = self._on_disconnect
        try:
            self._mqtt.connect(self.mqtt_host, self.mqtt_port, keepalive=30)
            self._mqtt.loop_start()
        except Exception as e:
            logger.error(
                "Could not connect to MQTT broker %s:%s — telemetry will not be published (Error: %s)",
                self.mqtt_host, self.mqtt_port, e
            )

    def _publish(self, v: VehicleState) -> None:
        payload = self._build_telemetry_payload(v)
        topic = f"{self.topic_prefix}/vehicle/{v.vehicle_id}/telemetry"
        try:
            self._mqtt.publish(topic, json.dumps(payload), qos=0, retain=False)
        except Exception as e:
            logger.warning("Failed to publish telemetry for %s: %s", v.vehicle_id, e)

    # -- simulation loop ------------------------------------------------------ #

    def _interpolate_position(self, leg: TripLeg, distance_m: float) -> Tuple[float, float, float]:
        dists = leg.dists
        if distance_m <= 0:
            p = leg.shape[0]
            nxt = leg.shape[1] if len(leg.shape) > 1 else p
            return p.lat, p.lon, bearing_deg(p.lat, p.lon, nxt.lat, nxt.lon)
        if distance_m >= dists[-1]:
            p = leg.shape[-1]
            prev = leg.shape[-2] if len(leg.shape) > 1 else p
            return p.lat, p.lon, bearing_deg(prev.lat, prev.lon, p.lat, p.lon)

        idx = bisect.bisect_right(dists, distance_m)
        idx = min(max(idx, 1), len(dists) - 1)
        p0, p1 = leg.shape[idx - 1], leg.shape[idx]
        seg_len = p1.dist_m - p0.dist_m
        t = 0.0 if seg_len <= 0 else (distance_m - p0.dist_m) / seg_len
        lat = p0.lat + (p1.lat - p0.lat) * t
        lon = p0.lon + (p1.lon - p0.lon) * t
        return lat, lon, bearing_deg(p0.lat, p0.lon, p1.lat, p1.lon)

    def _compute_occupancy_baseline(self, v: VehicleState) -> OccupancyBand:
        leg = self.blocks[v.block_id].legs[v.leg_index]
        pct = 0.0 if leg.total_distance_m <= 0 else v.distance_covered_m / leg.total_distance_m
        load = 0.15 + 0.6 * math.sin(math.pi * pct) + random.uniform(-0.05, 0.05)
        load = max(0.0, min(1.0, load))
        if load < 0.15:
            return OccupancyBand.EMPTY
        if load < 0.35:
            return OccupancyBand.MANY_SEATS_AVAILABLE
        if load < 0.55:
            return OccupancyBand.FEW_SEATS_AVAILABLE
        if load < 0.75:
            return OccupancyBand.STANDING_ROOM_ONLY
        if load < 0.90:
            return OccupancyBand.CRUSHED_STANDING_ROOM_ONLY
        return OccupancyBand.FULL

    def _tick_vehicle(self, v: VehicleState, dt: float) -> None:
        block = self.blocks[v.block_id]

        # 1. countdown timers for injected faults
        if v.gnss_dropout_remaining_s > 0:
            v.gnss_dropout_remaining_s = max(0.0, v.gnss_dropout_remaining_s - dt)
            v.gnss_fix = v.gnss_dropout_remaining_s <= 0
        if v.crowd_spike_remaining_s > 0:
            v.crowd_spike_remaining_s = max(0.0, v.crowd_spike_remaining_s - dt)
            if v.crowd_spike_remaining_s <= 0:
                v.crowd_spike_band = None

        # 2. motion state machine: HOLD (injected delay) > DWELL (layover) > EN_ROUTE
        if v.hold_remaining_s > 0:
            v.hold_remaining_s = max(0.0, v.hold_remaining_s - dt)
            v.speed_kmh = 0.0
        elif v.in_dwell:
            v.dwell_remaining_s -= dt
            v.speed_kmh = 0.0
            if v.dwell_remaining_s <= 0:
                v.in_dwell = False
                v.leg_index = (v.leg_index + 1) % len(block.legs)
                v.distance_covered_m = 0.0
        else:
            v.speed_kmh = max(5.0, v.base_speed_kmh + random.uniform(-3.0, 3.0))
            speed_mps = v.speed_kmh / 3.6
            v.distance_covered_m += speed_mps * dt
            current_leg = block.legs[v.leg_index]
            if v.distance_covered_m >= current_leg.total_distance_m:
                v.distance_covered_m = current_leg.total_distance_m
                v.in_dwell = True
                v.dwell_remaining_s = float(current_leg.dwell_s)

        # 3. recompute position from the (possibly just-updated) leg/distance
        leg = block.legs[v.leg_index]
        lat, lon, brg = self._interpolate_position(leg, v.distance_covered_m)
        v.bearing_deg = brg
        if v.gnss_fix:
            v.lat, v.lon = lat, lon
            v.last_known_lat, v.last_known_lon = lat, lon
        else:
            jitter = 0.00003  # dead-reckoning drift while GNSS is down
            base_lat = v.last_known_lat if v.last_known_lat is not None else lat
            base_lon = v.last_known_lon if v.last_known_lon is not None else lon
            v.lat = base_lat + random.uniform(-jitter, jitter)
            v.lon = base_lon + random.uniform(-jitter, jitter)

        # 4. occupancy
        v.occupancy_band = v.crowd_spike_band or self._compute_occupancy_baseline(v)

    def _build_telemetry_payload(self, v: VehicleState) -> dict:
        leg = self.blocks[v.block_id].legs[v.leg_index]
        remaining_m = max(0.0, leg.total_distance_m - v.distance_covered_m)
        speed_mps = v.speed_kmh / 3.6
        eta_leg_end_s = int(remaining_m / speed_mps) if speed_mps > 0.1 else None
        leg_state = "DWELL" if v.in_dwell else ("HOLD" if v.hold_remaining_s > 0 else "EN_ROUTE")

        return {
            "vehicle_id": v.vehicle_id,
            "block_id": v.block_id,
            "trip_id": leg.trip_id,
            "route_id": leg.route_id,
            "direction": leg.direction,
            "leg_state": leg_state,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "lat": round(v.lat, 6),
            "lon": round(v.lon, 6),
            "bearing_deg": round(v.bearing_deg, 1),
            "speed_kmh": round(v.speed_kmh, 1),
            "distance_covered_m": round(v.distance_covered_m, 1),
            "leg_total_distance_m": round(leg.total_distance_m, 1),
            "percent_leg_complete": round(100 * v.distance_covered_m / leg.total_distance_m, 1)
            if leg.total_distance_m else 0.0,
            "eta_leg_end_s": eta_leg_end_s,
            "dwell_remaining_s": round(v.dwell_remaining_s, 1) if v.in_dwell else None,
            "hold_remaining_s": round(v.hold_remaining_s, 1) if v.hold_remaining_s > 0 else 0.0,
            "schedule_deviation_s": v.schedule_deviation_s,
            "gnss_fix": v.gnss_fix,
            "gnss_dropout_remaining_s": round(v.gnss_dropout_remaining_s, 1) if v.gnss_dropout_remaining_s > 0 else 0.0,
            "occupancy_band": v.occupancy_band.value,
            "crowd_spike_active": v.crowd_spike_band is not None,
        }

    async def run(self) -> None:
        self._running = True
        logger.info("Simulator engine started: %d vehicles across %d blocks (tick=%.2fHz)",
                     len(self.vehicles), len(self.blocks), self.tick_hz)
        last = time.monotonic()
        while self._running:
            now = time.monotonic()
            dt = now - last
            last = now
            for v in self.vehicles.values():
                self._tick_vehicle(v, dt)
                self._publish(v)
            await asyncio.sleep(self._tick_interval)

    def start_background(self) -> asyncio.Task:
        """For use by control_api.py: schedule run() on the current event loop."""
        if self._task is None or self._task.done():
            self._task = asyncio.ensure_future(self.run())
        return self._task

    def stop(self) -> None:
        self._running = False
        try:
            self._mqtt.loop_stop()
            self._mqtt.disconnect()
        except Exception:
            pass

    # -- control surface (called by control_api.py) --------------------------- #

    def _get_vehicle(self, vehicle_id: str) -> VehicleState:
        v = self.vehicles.get(vehicle_id)
        if v is None:
            raise VehicleNotFoundError(f"Unknown vehicle_id: {vehicle_id}")
        return v

    def inject_delay(self, vehicle_id: str, seconds: float) -> dict:
        """Stall the vehicle in place for `seconds`, and record it as schedule deviation."""
        v = self._get_vehicle(vehicle_id)
        seconds = max(0.0, float(seconds))
        v.hold_remaining_s += seconds
        v.schedule_deviation_s += int(seconds)
        logger.info("Injected %.0fs delay on %s", seconds, vehicle_id)
        return self.get_vehicle_state(vehicle_id)

    def inject_gnss_dropout(self, vehicle_id: str, duration_s: float) -> dict:
        """Simulate a GNSS fix loss for `duration_s`; position freezes/drifts until it clears."""
        v = self._get_vehicle(vehicle_id)
        duration_s = max(0.0, float(duration_s))
        if v.last_known_lat is None:
            v.last_known_lat, v.last_known_lon = v.lat, v.lon
        v.gnss_dropout_remaining_s = duration_s
        v.gnss_fix = duration_s <= 0
        logger.info("Injected %.0fs GNSS dropout on %s", duration_s, vehicle_id)
        return self.get_vehicle_state(vehicle_id)

    def inject_crowd_spike(self, vehicle_id: str, band: "OccupancyBand | str", duration_s: float) -> dict:
        """Force occupancy_band to `band` for `duration_s`, overriding the baseline model."""
        v = self._get_vehicle(vehicle_id)
        band = OccupancyBand(band) if isinstance(band, str) else band
        v.crowd_spike_band = band
        v.crowd_spike_remaining_s = max(0.0, float(duration_s))
        v.occupancy_band = band
        logger.info("Injected crowd spike (%s, %.0fs) on %s", band.value, duration_s, vehicle_id)
        return self.get_vehicle_state(vehicle_id)

    def get_vehicle_state(self, vehicle_id: str) -> dict:
        v = self._get_vehicle(vehicle_id)
        return self._build_telemetry_payload(v)

    def list_vehicles(self) -> List[dict]:
        return [self.get_vehicle_state(vid) for vid in self.vehicles]

    def list_blocks(self) -> List[dict]:
        return [
            {
                "block_id": b.block_id,
                "legs": [
                    {
                        "trip_id": leg.trip_id,
                        "route_id": leg.route_id,
                        "direction": leg.direction,
                        "total_distance_m": round(leg.total_distance_m, 1),
                        "dwell_s": leg.dwell_s,
                    }
                    for leg in b.legs
                ],
            }
            for b in self.blocks.values()
        ]


# --------------------------------------------------------------------------- #
# Module-level singleton (importable by control_api.py)
# --------------------------------------------------------------------------- #

_engine_singleton: Optional[SimulatorEngine] = None


def get_engine() -> SimulatorEngine:
    global _engine_singleton
    if _engine_singleton is None:
        _engine_singleton = SimulatorEngine(
            mqtt_host=os.environ.get("MQTT_BROKER_HOST", "localhost"),
            mqtt_port=int(os.environ.get("MQTT_BROKER_PORT", "1883")),
            tick_hz=float(os.environ.get("TICK_HZ", "1.0")),
            gtfs_dir=os.environ.get("GTFS_DIR") or None,
            num_vehicles=int(os.environ.get("NUM_VEHICLES", "4")),
            topic_prefix=os.environ.get("MQTT_TOPIC_PREFIX", "transitsense"),
        )
    return _engine_singleton


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    engine = get_engine()
    engine.connect_mqtt()
    try:
        asyncio.run(engine.run())
    except KeyboardInterrupt:
        logger.info("Shutting down simulator engine...")
    finally:
        engine.stop()