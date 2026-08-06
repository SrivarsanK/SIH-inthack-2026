import sys
import time
from pathlib import Path
from typing import List, Optional, Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from shared.constants import BAND_MODERATE_RATIO, BUS_CAPACITY, BUS_MAX_CAPACITY


def clean_and_get_mac_count(
    mac_deltas: List[Tuple[float, int]], window_sec: float = 60.0, now: Optional[float] = None
) -> int:
    """Prune deltas older than window_sec and return total MAC count."""
    if now is None:
        now = time.time()
    cutoff = now - window_sec
    mac_deltas[:] = [item for item in mac_deltas if item[0] >= cutoff]
    return sum(item[1] for item in mac_deltas)


def map_mac_to_band(mac_count: int) -> str:
    """Map mac_count to standard occupancy band name."""
    moderate_threshold = int(BUS_CAPACITY * BAND_MODERATE_RATIO)
    if mac_count < BUS_CAPACITY:
        return "SEATS_AVAILABLE"
    if mac_count < moderate_threshold:
        return "MODERATE"
    if mac_count < BUS_MAX_CAPACITY:
        return "STANDING_ROOM"
    return "VERY_CROWDED"
