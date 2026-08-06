import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from shared.constants import BLOCK_ID, INBOUND_TOTAL_SEC, OUTBOUND_TOTAL_SEC


@dataclass
class TransitState:
    """In-memory state for transit intelligence engine."""

    ts: int = field(default_factory=lambda: int(time.time()))
    lat: float = 12.9716
    lon: float = 77.5946
    leg: str = "outbound"
    progress: float = 0.0
    source: str = "gnss"
    trip_id: str = "trip_outbound_1"
    block_id: str = BLOCK_ID
    delay_accumulated_sec: float = 0.0
    last_delay_min_sec: float = 0.0
    mac_deltas: List[Tuple[float, int]] = field(default_factory=list)
    event_log: List[Dict[str, Any]] = field(default_factory=list)
    last_T_total_sec: int = 0
    # GTFS-derived leg durations (overridden at startup from real schedule data)
    outbound_duration_sec: int = OUTBOUND_TOTAL_SEC
    inbound_duration_sec: int = INBOUND_TOTAL_SEC
    lock: Lock = field(default_factory=Lock)

    def update_fused_telemetry(self, payload: Dict[str, Any]) -> None:
        """Update fused position state from CH-2 MQTT message."""
        with self.lock:
            self.ts = int(payload.get("ts", time.time()))
            self.lat = float(payload.get("lat", self.lat))
            self.lon = float(payload.get("lon", self.lon))
            self.leg = str(payload.get("leg", self.leg))
            self.progress = float(payload.get("progress", self.progress))
            self.source = str(payload.get("source", self.source))
            self.trip_id = str(payload.get("trip_id", self.trip_id))
            self.block_id = str(payload.get("block_id", self.block_id))

            event_flags = payload.get("event_flags", {})
            delay_min = float(event_flags.get("delay_min", 0.0))
            if delay_min > 0:
                current_delay_sec = delay_min * 60.0
                if current_delay_sec != self.last_delay_min_sec:
                    delta = current_delay_sec - self.last_delay_min_sec
                    if delta > 0:
                        self.delay_accumulated_sec += delta
                    self.last_delay_min_sec = current_delay_sec
            elif delay_min == 0:
                self.last_delay_min_sec = 0.0

    def add_mac_delta(self, delta: int) -> None:
        """Add MAC delta measurement to rolling window."""
        with self.lock:
            self.mac_deltas.append((time.time(), delta))

    def reset_state(self) -> None:
        """Reset state for system restarts/resets."""
        with self.lock:
            self.ts = int(time.time())
            self.delay_accumulated_sec = 0.0
            self.last_delay_min_sec = 0.0
            self.mac_deltas.clear()
            self.event_log.clear()
            self.last_T_total_sec = 0


# Shared singleton state store instance
state_store = TransitState()
