import json
import os
import sys
import paho.mqtt.client as mqtt

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from shared.constants import MQTT_HOST, MQTT_PORT, TOPIC_FUSED, TOPIC_TELEMETRY
from kalman import KalmanTracker

tracker = KalmanTracker()


def on_connect(client: mqtt.Client, userdata: any, flags: dict, rc: int) -> None:
    if rc == 0:
        print(f"[CH-2 Kalman] Connected to MQTT broker at {MQTT_HOST}:{MQTT_PORT}")
        client.subscribe(TOPIC_TELEMETRY)
        print(f"[CH-2 Kalman] Subscribed to topic: {TOPIC_TELEMETRY}")
    else:
        print(f"[CH-2 Kalman] Connection failed with code {rc}")


def on_message(client: mqtt.Client, userdata: any, msg: mqtt.MQTTMessage) -> None:
    try:
        payload = json.loads(msg.payload.decode("utf-8"))

        raw_lat = float(payload.get("lat", 0.0))
        raw_lon = float(payload.get("lon", 0.0))
        gnss_valid = bool(payload.get("gnss_valid", True))
        ts = payload.get("ts")
        speed_kmh = payload.get("speed_kmh", 0.0)
        block_id = payload.get("block_id", "block_001")
        leg = payload.get("leg", "outbound")
        progress = payload.get("progress", 0.0)

        # Execute Kalman filtering
        fused_lat, fused_lon = tracker.update(
            lat=raw_lat,
            lon=raw_lon,
            gnss_valid=gnss_valid,
            ts=ts
        )

        source_str = "gnss" if gnss_valid else "kalman_estimated"

        fused_payload = {
            "ts": ts,
            "lat": round(fused_lat, 6),
            "lon": round(fused_lon, 6),
            "speed_kmh": speed_kmh,
            "source": source_str,
            "block_id": block_id,
            "leg": leg,
            "progress": progress
        }

        client.publish(TOPIC_FUSED, json.dumps(fused_payload))
        print(f"[CH-2 Kalman] Published fused position -> lat={fused_lat:.6f}, lon={fused_lon:.6f}, source={source_str}")

    except Exception as e:
        print(f"[CH-2 Kalman] Error processing message: {e}")


def main() -> None:
    client = mqtt.Client(client_id="kalman_fusion_service")
    client.on_connect = on_connect
    client.on_message = on_message

    print(f"[CH-2 Kalman] Starting Kalman Fusion Service...")
    client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
    client.loop_forever()


if __name__ == "__main__":
    main()
