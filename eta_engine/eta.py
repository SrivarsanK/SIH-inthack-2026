import datetime
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from shared.constants import (
    DWELL_BASELINE_SEC,
    DWELL_MINIMUM_SEC,
    DWELL_RECOVERY_FACTOR,
    INBOUND_TOTAL_SEC,
    OUTBOUND_TOTAL_SEC,
)


def calculate_eta_components(
    leg: str,
    progress: float,
    delay_accumulated_sec: float,
    outbound_total_sec: Optional[int] = None,
    inbound_total_sec: Optional[int] = None,
) -> Tuple[int, int, int, int]:
    """
    Calculate (T_outbound_sec, T_dwell_sec, T_inbound_sec, T_total_sec).

    outbound_total_sec / inbound_total_sec: override with GTFS-derived duration.
    If None, falls back to shared/constants.py values.
    """
    eff_out = outbound_total_sec if outbound_total_sec is not None else OUTBOUND_TOTAL_SEC
    eff_in = inbound_total_sec if inbound_total_sec is not None else INBOUND_TOTAL_SEC

    if leg == "outbound":
        rem_out = max(0.0, 1.0 - progress)
        t_outbound = rem_out * eff_out + delay_accumulated_sec
    else:
        t_outbound = 0.0

    dwell_duration = max(
        float(DWELL_MINIMUM_SEC),
        float(DWELL_BASELINE_SEC) - (delay_accumulated_sec * DWELL_RECOVERY_FACTOR),
    )
    if leg == "outbound":
        t_dwell = dwell_duration
    elif leg == "dwell":
        rem_dwell = max(0.0, 1.0 - progress)
        t_dwell = rem_dwell * dwell_duration
    else:
        t_dwell = 0.0

    if leg == "inbound":
        rem_in = max(0.0, 1.0 - progress)
    else:
        rem_in = 1.0
    t_inbound = rem_in * eff_in

    t_total = t_outbound + t_dwell + t_inbound
    return round(t_outbound), round(t_dwell), round(t_inbound), round(t_total)


def check_and_update_event_log(
    event_log: List[Dict[str, Any]],
    last_t_total: int,
    current_t_total: int,
    max_entries: int = 20,
) -> int:
    """Append event log entry if T_total changes by > 30 seconds."""
    if last_t_total == 0:
        return current_t_total

    delta = current_t_total - last_t_total
    if abs(delta) > 30:
        now_str = datetime.datetime.now().strftime("%H:%M:%S")
        entry = {
            "ts": now_str,
            "event": "ETA recalculated",
            "T_total_before_sec": last_t_total,
            "T_total_after_sec": current_t_total,
            "delta_sec": delta,
        }
        event_log.append(entry)
        if len(event_log) > max_entries:
            event_log.pop(0)
        return current_t_total

    return last_t_total
