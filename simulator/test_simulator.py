import pytest
from simulator import (
    SimulatorEngine, OccupancyBand, VehicleNotFoundError, 
    haversine_m, bearing_deg, _densify, TripLeg, ShapePoint
)
import math

def test_engine_initialization():
    engine = SimulatorEngine(num_vehicles=2, gtfs_dir=None)
    assert len(engine.blocks) == 2, "Should create 2 synthetic blocks"
    assert len(engine.vehicles) == 2, "Should spawn 2 vehicles"
    for v in engine.vehicles.values():
        assert v.gnss_fix is True
        assert v.hold_remaining_s == 0.0

def test_inject_delay():
    engine = SimulatorEngine(num_vehicles=1, gtfs_dir=None)
    vehicle_id = list(engine.vehicles.keys())[0]
    
    res = engine.inject_delay(vehicle_id, 120.0)
    v = engine.vehicles[vehicle_id]
    assert v.hold_remaining_s == 120.0
    assert v.schedule_deviation_s == 120
    assert res["hold_remaining_s"] == 120.0
    
    # Edge case: Negative delay should be clamped to 0
    engine.inject_delay(vehicle_id, -50.0)
    assert v.hold_remaining_s == 120.0  # it adds up max(0, -50.0) -> +0

def test_inject_gnss_dropout():
    engine = SimulatorEngine(num_vehicles=1, gtfs_dir=None)
    vehicle_id = list(engine.vehicles.keys())[0]
    
    res = engine.inject_gnss_dropout(vehicle_id, 60.0)
    v = engine.vehicles[vehicle_id]
    assert v.gnss_dropout_remaining_s == 60.0
    assert v.gnss_fix is False
    assert res["gnss_fix"] is False
    
    # Edge case: Negative dropout should immediately clear
    engine.inject_gnss_dropout(vehicle_id, -10.0)
    assert v.gnss_dropout_remaining_s == 0.0

def test_inject_crowd_spike():
    engine = SimulatorEngine(num_vehicles=1, gtfs_dir=None)
    vehicle_id = list(engine.vehicles.keys())[0]
    
    res = engine.inject_crowd_spike(vehicle_id, OccupancyBand.CRUSHED_STANDING_ROOM_ONLY, 300.0)
    v = engine.vehicles[vehicle_id]
    assert v.crowd_spike_band == OccupancyBand.CRUSHED_STANDING_ROOM_ONLY
    assert v.crowd_spike_remaining_s == 300.0
    assert res["crowd_spike_active"] is True
    
    # Edge case: Negative duration
    engine.inject_crowd_spike(vehicle_id, OccupancyBand.EMPTY, -10.0)
    assert v.crowd_spike_remaining_s == 0.0

def test_tick_vehicle_progress():
    engine = SimulatorEngine(num_vehicles=1, gtfs_dir=None)
    vehicle_id = list(engine.vehicles.keys())[0]
    v = engine.vehicles[vehicle_id]
    
    initial_dist = v.distance_covered_m
    
    # Run a few ticks
    for _ in range(5):
        engine._tick_vehicle(v, dt=1.0)
        
    assert v.distance_covered_m > initial_dist, "Vehicle should have moved"

def test_haversine_m():
    assert haversine_m(0, 0, 0, 0) == 0.0
    # Equator 1 degree lon is ~111km
    assert math.isclose(haversine_m(0, 0, 0, 1), 111195.0, rel_tol=0.01)

def test_bearing_deg():
    assert math.isclose(bearing_deg(0, 0, 1, 0), 0.0, rel_tol=0.01) # North
    assert math.isclose(bearing_deg(0, 0, 0, 1), 90.0, rel_tol=0.01) # East

def test_densify():
    coords = [(0.0, 0.0), (1.0, 1.0)]
    dense = _densify(coords, points_per_segment=2)
    assert len(dense) == 3
    assert dense[0] == (0.0, 0.0)
    assert dense[1] == (0.5, 0.5)
    assert dense[2] == (1.0, 1.0)
    
    assert _densify([]) == []
    assert _densify([(0.0, 0.0)]) == [(0.0, 0.0)]

def test_interpolate_position_edge_cases():
    engine = SimulatorEngine(num_vehicles=1, gtfs_dir=None)
    block_id = list(engine.blocks.keys())[0]
    leg = engine.blocks[block_id].legs[0]
    
    # Distance <= 0
    lat, lon, brg = engine._interpolate_position(leg, -10.0)
    assert lat == leg.shape[0].lat and lon == leg.shape[0].lon
    
    # Distance >= total
    lat, lon, brg = engine._interpolate_position(leg, leg.total_distance_m + 10.0)
    assert lat == leg.shape[-1].lat and lon == leg.shape[-1].lon

def test_tick_vehicle_state_transitions():
    engine = SimulatorEngine(num_vehicles=1, gtfs_dir=None)
    vehicle_id = list(engine.vehicles.keys())[0]
    v = engine.vehicles[vehicle_id]
    block = engine.blocks[v.block_id]
    
    # Force vehicle to the end of leg 0
    v.leg_index = 0
    leg0 = block.legs[0]
    v.distance_covered_m = leg0.total_distance_m - 0.1 # Very close to end
    v.in_dwell = False
    
    # Tick to cross the threshold
    engine._tick_vehicle(v, dt=1.0)
    assert v.in_dwell is True
    assert v.distance_covered_m == leg0.total_distance_m
    assert v.dwell_remaining_s == leg0.dwell_s
    
    # Tick to end dwell
    v.dwell_remaining_s = 0.5
    engine._tick_vehicle(v, dt=1.0)
    assert v.in_dwell is False
    assert v.leg_index == 1
    assert v.distance_covered_m == 0.0

def test_gnss_dropout_drift():
    engine = SimulatorEngine(num_vehicles=1, gtfs_dir=None)
    vehicle_id = list(engine.vehicles.keys())[0]
    v = engine.vehicles[vehicle_id]
    
    # Establish fix
    engine._tick_vehicle(v, dt=1.0)
    lat_before = v.lat
    lon_before = v.lon
    
    # Drop GNSS
    engine.inject_gnss_dropout(vehicle_id, 10.0)
    engine._tick_vehicle(v, dt=1.0)
    
    assert not v.gnss_fix
    # Position should drift from last known slightly, not follow the route accurately
    assert v.lat != lat_before or v.lon != lon_before
    
    # Ensure it recovers when remaining <= 0
    v.gnss_dropout_remaining_s = 0.5
    engine._tick_vehicle(v, dt=1.0)
    assert v.gnss_fix is True

def test_vehicle_not_found():
    engine = SimulatorEngine(num_vehicles=1, gtfs_dir=None)
    with pytest.raises(VehicleNotFoundError):
        engine.get_vehicle_state("NON_EXISTENT")
