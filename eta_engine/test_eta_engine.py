import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from eta_engine.api import build_snapshot
from eta_engine.density import clean_and_get_mac_count, map_mac_to_band
from eta_engine.eta import calculate_eta_components, check_and_update_event_log
from eta_engine.state_store import state_store


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
    deltas = [
        (now - 70.0, 10),
        (now - 50.0, 20),
        (now - 10.0, 25),
    ]
    total = clean_and_get_mac_count(deltas, window_sec=60.0, now=now)
    assert total == 45
    assert len(deltas) == 2
    print("PASS: Rolling MAC window tests")


def test_eta_formulas() -> None:
    """Test T_outbound, T_dwell, T_inbound calculations."""
    # Outbound leg with 0 delay
    t_out, t_dwell, t_in, t_total = calculate_eta_components("outbound", 0.0, 0.0)
    assert t_out == 1500
    assert t_dwell == 300
    assert t_in == 1500
    assert t_total == 3300

    # Outbound leg with 180s delay
    t_out, t_dwell, t_in, t_total = calculate_eta_components("outbound", 0.5, 180.0)
    assert t_out == 750 + 180  # 930
    assert t_dwell == 300 - int(180 * 0.3)  # 300 - 54 = 246
    assert t_in == 1500
    assert t_total == 930 + 246 + 1500  # 2676

    # Dwell leg
    t_out, t_dwell, t_in, t_total = calculate_eta_components("dwell", 0.5, 0.0)
    assert t_out == 0
    assert t_dwell == 150
    assert t_in == 1500
    assert t_total == 1650

    # Inbound leg
    t_out, t_dwell, t_in, t_total = calculate_eta_components("inbound", 0.4, 0.0)
    assert t_out == 0
    assert t_dwell == 0
    assert t_in == round((1.0 - 0.4) * 1500)  # 900
    assert t_total == 900

    print("PASS: ETA formula tests")


def test_event_log() -> None:
    """Test event log thresholds and max entries."""
    log = []
    last = 3000
    # Change <= 30 -> no log
    last = check_and_update_event_log(log, last, 3020)
    assert len(log) == 0

    # Change > 30 -> log appended
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
    assert snapshot["inbound"]["occupancy_band"] == "SEATS_AVAILABLE"
    assert snapshot["vehicle"]["block_id"] == "block_001"

    # Validate JSON serializable
    dumped = json.dumps(snapshot)
    assert len(dumped) > 0
    print("PASS: Snapshot contract tests")


if __name__ == "__main__":
    test_density_mapping()
    test_rolling_mac_window()
    test_eta_formulas()
    test_event_log()
    test_snapshot_contract()
    print("ALL TESTS PASSED SUCCESSFULLY!")
