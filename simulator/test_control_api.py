import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from control_api import app
from simulator import get_engine, OccupancyBand

@pytest.fixture(autouse=True)
def mock_mqtt_and_background():
    # Patch connect_mqtt and start_background so tests don't try to use real MQTT/async loops
    with patch("simulator.SimulatorEngine.connect_mqtt"), patch("simulator.SimulatorEngine.start_background"):
        yield

@pytest.fixture
def client():
    # TestClient triggers the lifespan event which connects MQTT
    with TestClient(app) as c:
        yield c

def test_read_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["vehicle_count"] > 0
    assert data["block_count"] > 0

def test_read_vehicles(client):
    response = client.get("/vehicles")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "vehicle_id" in data[0]

def test_read_blocks(client):
    response = client.get("/blocks")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

def test_inject_delay(client):
    engine = get_engine()
    vid = list(engine.vehicles.keys())[0]
    
    response = client.post(f"/vehicles/{vid}/delay", json={"seconds": 60})
    assert response.status_code == 200
    data = response.json()
    assert data["hold_remaining_s"] == 60.0

def test_inject_gnss_dropout(client):
    engine = get_engine()
    vid = list(engine.vehicles.keys())[0]
    
    response = client.post(f"/vehicles/{vid}/gnss-dropout", json={"duration_s": 120})
    assert response.status_code == 200
    data = response.json()
    assert data["gnss_fix"] is False

def test_inject_crowd_spike(client):
    engine = get_engine()
    vid = list(engine.vehicles.keys())[0]
    
    response = client.post(f"/vehicles/{vid}/crowd-spike", json={"band": OccupancyBand.FULL.value, "duration_s": 300})
    assert response.status_code == 200
    data = response.json()
    assert data["crowd_spike_active"] is True
    assert data["occupancy_band"] == OccupancyBand.FULL.value

def test_vehicle_not_found(client):
    response = client.get("/vehicles/NONEXISTENT_BUS")
    assert response.status_code == 404

def test_inject_delay_negative(client):
    engine = get_engine()
    vid = list(engine.vehicles.keys())[0]
    
    response = client.post(f"/vehicles/{vid}/delay", json={"seconds": -10})
    assert response.status_code == 422 # Unprocessable Entity

def test_inject_gnss_dropout_negative(client):
    engine = get_engine()
    vid = list(engine.vehicles.keys())[0]
    
    response = client.post(f"/vehicles/{vid}/gnss-dropout", json={"duration_s": -120})
    assert response.status_code == 422

def test_inject_crowd_spike_invalid_band(client):
    engine = get_engine()
    vid = list(engine.vehicles.keys())[0]
    
    response = client.post(f"/vehicles/{vid}/crowd-spike", json={"band": "OVERFLOWING", "duration_s": 300})
    assert response.status_code == 422
