import os
import sys
import socket
import subprocess
import time
import signal

def check_dependencies():
    needed = []
    try:
        import paho.mqtt
    except ImportError:
        needed.append("paho-mqtt")
    try:
        import fastapi
    except ImportError:
        needed.append("fastapi")
    try:
        import uvicorn
    except ImportError:
        needed.append("uvicorn")
    try:
        import requests
    except ImportError:
        needed.append("requests")
    try:
        import amqtt
    except ImportError:
        needed.append("amqtt")

    if needed:
        print(f"[Setup] Installing missing Python packages: {', '.join(needed)}...")
        subprocess.run([sys.executable, "-m", "pip", "install"] + needed, check=True)

def is_port_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("localhost", port)) == 0

def main():
    print("=" * 65)
    print("Launching TransitSense Local Multi-Service Pipeline...")
    print("=" * 65)

    check_dependencies()

    root_dir = os.path.abspath(os.path.dirname(__file__))
    dashboard_dir = os.path.join(root_dir, "dashboard")

    processes = []

    try:
        # 0. Check / Start MQTT Broker on port 1883
        if not is_port_open(1883):
            print("[0/5] Starting Embedded Python MQTT Broker (:1883)...")
            p_broker = subprocess.Popen([sys.executable, "shared/mqtt_broker.py"], cwd=root_dir)
            processes.append(("MQTT Broker", p_broker))
            time.sleep(2)
        else:
            print("[0/5] External MQTT Broker detected on port 1883.")

        # 1. Start CH-1 Simulator Engine
        print("[1/5] Starting CH-1 Simulator Engine...")
        p_sim = subprocess.Popen([sys.executable, "simulator/simulator.py"], cwd=root_dir)
        processes.append(("CH-1 Simulator", p_sim))
        time.sleep(1)

        # 2. Start CH-1 Control API (:8001)
        print("[2/5] Starting CH-1 Simulator Control API (:8001)...")
        p_ctrl = subprocess.Popen([sys.executable, "simulator/control_api.py"], cwd=root_dir)
        processes.append(("CH-1 Control API", p_ctrl))
        time.sleep(1)

        # 3. Start CH-2 Kalman Fusion Service
        print("[3/5] Starting CH-2 Kalman Fusion Service...")
        p_kalman = subprocess.Popen([sys.executable, "kalman_service/subscriber.py"], cwd=root_dir)
        processes.append(("CH-2 Kalman Fusion", p_kalman))
        time.sleep(1)

        # 4. Start CH-3 ETA & Density Engine (:8002)
        print("[4/5] Starting CH-3 ETA & Density Engine (:8002)...")
        p_eta = subprocess.Popen([sys.executable, "eta_engine/api.py"], cwd=root_dir)
        processes.append(("CH-3 ETA Engine", p_eta))
        time.sleep(2)

        # 5. Start CH-4 Dashboard Frontend (:4321)
        print("[5/5] Starting CH-4 Dashboard UI (:4321)...")
        npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
        p_dash = subprocess.Popen([npm_cmd, "run", "dev"], cwd=dashboard_dir)
        processes.append(("CH-4 Dashboard", p_dash))

        print("\n" + "=" * 65)
        print("  All TransitSense Services Running Successfully!")
        print("  --> Dashboard UI:  http://localhost:4321")
        print("  --> Simulator API: http://localhost:8001")
        print("  --> ETA Stream:    http://localhost:8002/stream")
        print("  (Press Ctrl+C at any time to stop all services cleanly)")
        print("=" * 65 + "\n")

        # Keep parent script alive to monitor subprocesses
        while True:
            time.sleep(1)
            for name, proc in processes:
                if proc.poll() is not None:
                    print(f"Warning: Process '{name}' exited unexpectedly with code {proc.returncode}")

    except KeyboardInterrupt:
        print("\nStopping all TransitSense services...")
        for name, proc in processes:
            if proc.poll() is None:
                print(f"  --> Terminating {name}...")
                proc.terminate()
                try:
                    proc.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    proc.kill()
        print("All services stopped cleanly.")

if __name__ == "__main__":
    main()
