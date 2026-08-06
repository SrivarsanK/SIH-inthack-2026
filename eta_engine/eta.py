"""
eta_engine/eta.py
==================
ETA component calculator.

T_outbound and T_inbound use the ML predictor (GradientBoostingRegressor
trained on real Chennai MTC GTFS data). T_dwell remains formula-based
(no GTFS signal for dwell variance). delay_accumulated_sec is added on
top of the ML prediction — injected at runtime, not in training data.
"""
import datetime
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from eta_engine import eta_predictor
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
    hour_of_day: int = 0,
    outbound_total_sec: int = OUTBOUND_TOTAL_SEC,
    inbound_total_sec: int = INBOUND_TOTAL_SEC,
) -> Tuple[int, int, int, int]:
    """
    Calculate (T_outbound_sec, T_dwell_sec, T_inbound_sec, T_total_sec).

    T_outbound / T_inbound: ML-predicted remaining time (data-driven, non-linear).
    T_dwell: formula-based with dynamic delay-recovery shrinkage.
    delay_accumulated_sec: added post-prediction (runtime injected, not in training).
    """
    # ---- T_outbound ----
    if leg == "outbound":
        ml_remaining = eta_predictor.predict_remaining_sec(
            progress=progress,
            hour_of_day=hour_of_day,
            direction_id=0,
            fallback_total_sec=outbound_total_sec,
        )
        t_outbound = float(ml_remaining) + delay_accumulated_sec
    else:
        t_outbound = 0.0

    # ---- T_dwell (formula — no GTFS dwell data) ----
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

    # ---- T_inbound ----
    if leg == "inbound":
        ml_remaining_in = eta_predictor.predict_remaining_sec(
            progress=progress,
            hour_of_day=hour_of_day,
            direction_id=1,
            fallback_total_sec=inbound_total_sec,
        )
        t_inbound = float(ml_remaining_in)
    else:
        # Full inbound trip remaining (bus hasn't started inbound yet)
        t_inbound = float(
            eta_predictor.predict_remaining_sec(
                progress=0.0,
                hour_of_day=hour_of_day,
                direction_id=1,
                fallback_total_sec=inbound_total_sec,
            )
        )

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
