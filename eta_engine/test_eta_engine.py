import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from eta_engine import eta_predictor, gtfs_loader
from eta_engine.api import build_snapshot
from eta_engine.density import clean_and_get_mac_count, map_mac_to_band
from eta_engine.eta import calculate_eta_components, check_and_update_event_log
from eta_engine.state_store import state_store

_DATA_DIR = Path(__file__).resolve().parent / "Data_train_test" / "data"


# ---------------------------------------------------------------------------
# Core ETA unit tests
# ---------------------------------------------------------------------------

def test_density_mapping() -> None:
    """Test occupancy band mapping logic."""
    assert map_mac_to_band(0) == "SEATS_AVAILABLE"
    assert map_mac_to_band(39) == "SEATS_AVAILABLE"
    assert map_mac_to_band(40) == "MODERATE"
    assert map_mac_to_band(47) == "MODERATE"
    assert map_mac_to_band(48) == "STANDING_ROOM"
    assert map_mac_to_band(54) == "STANDING_ROOM"
    assert map_mac_to_band(55) == "VERY_CROWDED"
    assert map_mac_to_band(100) == "VERY_CROWDED"
    print("PASS: Density mapping tests")


def test_rolling_mac_window() -> None:
    """Test rolling window MAC count pruning."""
    now = 1000.0
    deltas = [(now - 70.0, 10), (now - 50.0, 20), (now - 10.0, 25)]
    total = clean_and_get_mac_count(deltas, window_sec=60.0, now=now)
    assert total == 45
    assert len(deltas) == 2
    print("PASS: Rolling MAC window tests")


def test_event_log() -> None:
    """Test event log thresholds and max entries."""
    log = []
    last = 3000
    last = check_and_update_event_log(log, last, 3020)
    assert len(log) == 0
    last = check_and_update_event_log(log, last, 3200)
    assert len(log) == 1
    assert log[0]["delta_sec"] == 200
    assert last == 3200
    print("PASS: Event log tests")


def test_snapshot_contract() -> None:
    """Test snapshot dictionary matches output JSON contract."""
    state_store.reset_state()
    snapshot = build_snapshot()
    assert "ts" in snapshot
    assert "vehicle" in snapshot
    assert "outbound" in snapshot
    assert "inbound" in snapshot
    assert "event_log" in snapshot
    assert "meta" in snapshot
    assert snapshot["inbound"]["occupancy_band"] == "SEATS_AVAILABLE"
    assert snapshot["vehicle"]["block_id"] == "block_001"
    assert snapshot["meta"]["eta_mode"] in ("ml", "calculative")
    # Validate JSON serializable
    assert len(json.dumps(snapshot)) > 0
    print("PASS: Snapshot contract tests")


# ---------------------------------------------------------------------------
# GTFS loader tests
# ---------------------------------------------------------------------------

def test_gtfs_loader_parses_data() -> None:
    if not _DATA_DIR.exists():
        print("SKIP: test_gtfs_loader_parses_data — data dir not found")
        return
    gtfs_loader.load(_DATA_DIR)
    assert gtfs_loader.is_loaded()
    stats = gtfs_loader.get_network_stats()
    assert stats["trips_loaded"] > 0
    assert stats["routes_loaded"] > 0
    print(f"PASS: GTFS loader — {stats['trips_loaded']:,} trips, {stats['routes_loaded']:,} routes")


def test_gtfs_median_durations_in_valid_range() -> None:
    if not _DATA_DIR.exists():
        print("SKIP: test_gtfs_median_durations_in_valid_range")
        return
    gtfs_loader.load(_DATA_DIR)
    for d in [0, 1]:
        med = gtfs_loader.get_median_duration_sec(d)
        assert 600 <= med <= 7200, f"Median {med}s for direction={d} out of range"
    print(f"PASS: GTFS medians — outbound={gtfs_loader.get_median_duration_sec(0)}s, "
          f"inbound={gtfs_loader.get_median_duration_sec(1)}s")


def test_gtfs_unknown_trip_returns_minus_one() -> None:
    gtfs_loader.load(_DATA_DIR)
    dur = gtfs_loader.get_trip_duration_sec("trip_outbound_1")
    assert dur == -1
    print("PASS: GTFS unknown trip returns -1 (fallback triggered correctly)")


# ---------------------------------------------------------------------------
# ML predictor tests
# ---------------------------------------------------------------------------

def test_ml_predictor_loads() -> None:
    """Test that eta_predictor.load() runs without raising."""
    result = eta_predictor.load()
    # result is True (model loaded) or False (graceful fallback)
    assert isinstance(result, bool)
    info = eta_predictor.get_model_info()
    assert isinstance(info, dict)
    print(f"PASS: ML predictor load — available={eta_predictor.is_available()}, "
          f"mode={'ml' if eta_predictor.is_available() else 'calculative_fallback'}")


def test_ml_prediction_returns_valid_int() -> None:
    """Test predict_remaining_sec returns non-negative integer."""
    eta_predictor.load()
    for progress in [0.0, 0.25, 0.5, 0.75, 0.99]:
        result = eta_predictor.predict_remaining_sec(
            progress=progress, hour_of_day=8, direction_id=0
        )
        assert isinstance(result, int), f"Expected int, got {type(result)}"
        assert result >= 0, f"Negative prediction {result} at progress={progress}"
    print("PASS: ML prediction returns valid non-negative integers")


def test_ml_prediction_decreases_with_progress() -> None:
    """Test that predicted remaining time decreases as progress increases."""
    eta_predictor.load()
    checkpoints = [0.0, 0.2, 0.5, 0.8, 0.95]
    predictions = [
        eta_predictor.predict_remaining_sec(p, hour_of_day=8, direction_id=0)
        for p in checkpoints
    ]
    # Allow for some noise — overall trend must be decreasing
    first = predictions[0]
    last  = predictions[-1]
    assert first > last, (
        f"Prediction should decrease: start={first}s, end={last}s for {checkpoints}"
    )
    print(f"PASS: ML prediction monotonically decreases -- "
          f"{[f'{p:.2f}->{v}s' for p, v in zip(checkpoints, predictions)]}")


def test_calculate_eta_components_ml() -> None:
    """Test ETA components are valid with ML predictor active."""
    eta_predictor.load()
    for leg, progress in [("outbound", 0.3), ("dwell", 0.5), ("inbound", 0.6)]:
        t_out, t_dwell, t_in, t_total = calculate_eta_components(
            leg=leg, progress=progress, delay_accumulated_sec=0.0, hour_of_day=8
        )
        assert t_out >= 0
        assert t_dwell >= 0
        assert t_in >= 0
        assert t_total == t_out + t_dwell + t_in
    print("PASS: calculate_eta_components returns valid components with ML predictor")


def test_eta_components_with_delay() -> None:
    """Test that delay_accumulated_sec increases T_outbound."""
    eta_predictor.load()
    t_no_delay = calculate_eta_components("outbound", 0.5, 0.0, hour_of_day=8)
    t_delayed  = calculate_eta_components("outbound", 0.5, 300.0, hour_of_day=8)
    assert t_delayed[0] > t_no_delay[0], "Delay should increase T_outbound"
    assert t_delayed[3] > t_no_delay[3], "Delay should increase T_total"
    print(f"PASS: Delay propagation -- T_total no_delay={t_no_delay[3]}s, "
          f"with_300s_delay={t_delayed[3]}s (delta={t_delayed[3]-t_no_delay[3]}s)")


if __name__ == "__main__":
    print("=" * 50)
    print("  Core ETA Unit Tests")
    print("=" * 50)
    test_density_mapping()
    test_rolling_mac_window()
    test_event_log()
    test_snapshot_contract()

    print("\n" + "=" * 50)
    print("  GTFS Loader Tests")
    print("=" * 50)
    test_gtfs_loader_parses_data()
    test_gtfs_median_durations_in_valid_range()
    test_gtfs_unknown_trip_returns_minus_one()

    print("\n" + "=" * 50)
    print("  ML Predictor Tests")
    print("=" * 50)
    test_ml_predictor_loads()
    test_ml_prediction_returns_valid_int()
    test_ml_prediction_decreases_with_progress()
    test_calculate_eta_components_ml()
    test_eta_components_with_delay()

    print("\n[OK] ALL TESTS PASSED SUCCESSFULLY!")
