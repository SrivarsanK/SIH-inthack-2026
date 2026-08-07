#!/bin/sh
set -e

echo "============================================================"
echo " Starting TransitSense All-In-One Container Services..."
echo "============================================================"

# 1. Start Mosquitto MQTT Broker
echo "[1/5] Starting Mosquitto MQTT Broker (:1883)..."
mosquitto -d || mosquitto &
sleep 2

# 2. Start CH-1 Simulator Engine & Control API
echo "[2/5] Starting CH-1 Simulator Engine & Control API (:8001)..."
python3 simulator/simulator.py > /tmp/simulator.log 2>&1 &
python3 simulator/control_api.py > /tmp/control_api.log 2>&1 &
sleep 1

# 3. Start CH-2 Kalman Fusion Service
echo "[3/5] Starting CH-2 Kalman Fusion Service..."
python3 kalman_service/subscriber.py > /tmp/kalman.log 2>&1 &
sleep 1

# 4. Start CH-3 ETA & Density Engine (:8002)
echo "[4/5] Starting CH-3 ETA & Density Engine (:8002)..."
python3 eta_engine/api.py > /tmp/eta_api.log 2>&1 &
sleep 2

# 5. Start CH-4 Dashboard Frontend (:4321)
echo "[5/5] Starting CH-4 Dashboard UI (:4321)..."
echo "============================================================"
echo "  TransitSense is Live! Access Dashboard at: http://localhost:4321"
echo "============================================================"

cd dashboard
exec npm run preview -- --host 0.0.0.0 --port 4321
