import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from eta_engine import gtfs_loader
from eta_engine.api import build_snapshot
from eta_engine.density import clean_and_get_mac_count, map_mac_to_band
from eta_engine.eta import calculate_eta_components, check_and_update_event_log
from eta_engine.state_store import state_store

_DATA_DIR = Path(__file__).resolve().parent / "Data_train_test" / "data"


# ---------------------------------------------------------------------------
# Existing CH-3 unit tests
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
    """Test T_outbound, T_dwell, T_inbound calculations (using constant 1500s durations)."""
    # Outbound leg with 0 delay
    t_out, t_dwell, t_in, t_total = calculate_eta_components(
        "outbound", 0.0, 0.0, outbound_total_sec=1500, inbound_total_sec=1500
    )
    assert t_out == 1500
    assert t_dwell == 300
    assert t_in == 1500
    assert t_total == 3300

    # Outbound leg with 180s delay
    t_out, t_dwell, t_in, t_total = calculate_eta_components(
        "outbound", 0.5, 180.0, outbound_total_sec=1500, inbound_total_sec=1500
    )
    assert t_out == 750 + 180  # 930
    assert t_dwell == 300 - int(180 * 0.3)  # 246
    assert t_in == 1500
    assert t_total == 930 + 246 + 1500  # 2676

    # Dwell leg
    t_out, t_dwell, t_in, t_total = calculate_eta_components(
        "dwell", 0.5, 0.0, outbound_total_sec=1500, inbound_total_sec=1500
    )
    assert t_out == 0
    assert t_dwell == 150
    assert t_in == 1500
    assert t_total == 1650

    # Inbound leg
    t_out, t_dwell, t_in, t_total = calculate_eta_components(
        "inbound", 0.4, 0.0, outbound_total_sec=1500, inbound_total_sec=1500
    )
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


# ---------------------------------------------------------------------------
# GTFS Loader tests
# ---------------------------------------------------------------------------

def test_gtfs_loader_parses_data() -> None:
    """Test that GTFS data loads without error."""
    if not _DATA_DIR.exists():
        print("SKIP: test_gtfs_loader_parses_data — data dir not found")
        return

    gtfs_loader.load(_DATA_DIR)
    assert gtfs_loader.is_loaded(), "Expected GTFS loader to mark load_complete=True"
    stats = gtfs_loader.get_network_stats()
    assert stats["trips_loaded"] > 0, "Expected at least 1 trip to be parsed"
    assert stats["routes_loaded"] > 0, "Expected at least 1 route to be parsed"
    print(f"PASS: GTFS loader — {stats['trips_loaded']:,} trips, {stats['routes_loaded']:,} routes loaded")


def test_gtfs_median_durations_in_valid_range() -> None:
    """Test that GTFS-derived medians fall within realistic bus trip range."""
    if not _DATA_DIR.exists():
        print("SKIP: test_gtfs_median_durations_in_valid_range — data dir not found")
        return

    gtfs_loader.load(_DATA_DIR)
    for direction in [0, 1]:
        median_sec = gtfs_loader.get_median_duration_sec(direction)
        assert 600 <= median_sec <= 7200, (
            f"Median duration {median_sec}s for direction={direction} "
            "is outside valid range [600, 7200]"
        )
    out_med = gtfs_loader.get_median_duration_sec(0)
    in_med = gtfs_loader.get_median_duration_sec(1)
    print(f"PASS: GTFS medians — outbound={out_med}s, inbound={in_med}s (both in 10min–2hr range)")


def test_gtfs_unknown_trip_returns_minus_one() -> None:
    """Test that unknown synthetic trip IDs fall back gracefully."""
    gtfs_loader.load(_DATA_DIR)
    dur = gtfs_loader.get_trip_duration_sec("trip_outbound_1")
    assert dur == -1, f"Expected -1 for synthetic trip_id, got {dur}"
    print("PASS: GTFS unknown trip returns -1 (fallback to median correctly triggered)")


def test_gtfs_route_info_lookup() -> None:
    """Test route info lookup returns expected structure."""
    if not _DATA_DIR.exists():
        print("SKIP: test_gtfs_route_info_lookup — data dir not found")
        return

    gtfs_loader.load(_DATA_DIR)
    stats = gtfs_loader.get_network_stats()
    # Verify network stats dict has expected keys
    for key in ["trips_loaded", "routes_loaded", "median_outbound_sec", "median_inbound_sec"]:
        assert key in stats, f"Missing key '{key}' in network stats"
    print("PASS: GTFS network stats keys validated")


def test_eta_uses_gtfs_median_when_loaded() -> None:
    """Test that state_store durations update when GTFS is loaded."""
    if not _DATA_DIR.exists():
        print("SKIP: test_eta_uses_gtfs_median_when_loaded — data dir not found")
        return

    gtfs_loader.load(_DATA_DIR)
    # Simulate what startup_event does
    state_store.outbound_duration_sec = gtfs_loader.get_median_duration_sec(0)
    state_store.inbound_duration_sec = gtfs_loader.get_median_duration_sec(1)

    assert state_store.outbound_duration_sec != 1500 or state_store.inbound_duration_sec != 1500, (
        "GTFS medians should differ from the fictional 25-min constant"
    )
    print(
        f"PASS: state_store seeded with GTFS medians — "
        f"outbound={state_store.outbound_duration_sec}s, "
        f"inbound={state_store.inbound_duration_sec}s"
    )


if __name__ == "__main__":
    # --- Core ETA unit tests ---
    test_density_mapping()
    test_rolling_mac_window()
    test_eta_formulas()
    test_event_log()
    test_snapshot_contract()

    # --- GTFS integration tests ---
    print("\n--- GTFS Loader Tests ---")
    test_gtfs_loader_parses_data()
    test_gtfs_median_durations_in_valid_range()
    test_gtfs_unknown_trip_returns_minus_one()
    test_gtfs_route_info_lookup()
    test_eta_uses_gtfs_median_when_loaded()

    print("\nALL TESTS PASSED SUCCESSFULLY!")
