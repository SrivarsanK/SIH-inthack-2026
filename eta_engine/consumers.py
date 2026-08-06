import json
import sys
from pathlib import Path
from typing import Any

import paho.mqtt.client as mqtt

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from eta_engine.state_store import state_store
from shared.constants import MQTT_HOST, MQTT_PORT, TOPIC_FUSED, TOPIC_TELEMETRY


def on_connect(client: mqtt.Client, userdata: Any, flags: Any, rc: int) -> None:
    """Callback when connected to MQTT broker."""
    if rc == 0:
        client.subscribe([(TOPIC_FUSED, 0), (TOPIC_TELEMETRY, 0)])
        print(f"Subscribed to MQTT topics: {TOPIC_FUSED}, {TOPIC_TELEMETRY}")
    else:
        print(f"Failed to connect to MQTT broker, return code: {rc}")


def on_message(client: mqtt.Client, userdata: Any, msg: mqtt.MQTTMessage) -> None:
    """Callback when a message is received on any subscribed topic."""
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
        if msg.topic == TOPIC_FUSED:
            state_store.update_fused_telemetry(payload)
        elif msg.topic == TOPIC_TELEMETRY:
            delta = payload.get("mac_count_delta", 0)
            if delta != 0:
                state_store.add_mac_delta(int(delta))
    except Exception as err:
        print(f"Error parsing MQTT message on {msg.topic}: {err}")


def start_mqtt_consumer() -> mqtt.Client:
    """Initialize and start the background MQTT consumer loop."""
    if hasattr(mqtt, "CallbackAPIVersion"):
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
    else:
        client = mqtt.Client()

    client.on_connect = on_connect
    client.on_message = on_message
    try:
        client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
        client.loop_start()
    except Exception as err:
        print(f"MQTT connection warning: {err}. Engine will retry.")
    return client
