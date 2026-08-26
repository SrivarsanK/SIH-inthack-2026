import json
import logging
import paho.mqtt.client as mqtt

from shared.constants import MQTT_BROKER_HOST, MQTT_BROKER_PORT, TELEMETRY_TOPIC
from simulator.route_geometry import ROUTE_COORDINATES

from signal_processing.debounce import ActivityDebouncer
from signal_processing.route_match import RoutePlausibilityChecker
from signal_processing.confidence import compute_composite_confidence

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SignalProcessingService")

RAW_TELEMETRY_TOPIC = "fleet/raw/telemetry"
TARGET_TELEMETRY_TOPIC = TELEMETRY_TOPIC

class SignalProcessingPipeline:
    def __init__(self):
        self.debouncer = ActivityDebouncer()
        self.route_checker = RoutePlausibilityChecker(route_coords=ROUTE_COORDINATES)

    def process_ping(self, payload: dict) -> dict:
        device_id = payload.get("device_id", "unknown")
        activity_state = payload.get("activity_state", "UNKNOWN")
        lat = payload.get("latitude", 0.0)
        lon = payload.get("longitude", 0.0)
        gps_accuracy = payload.get("accuracy_m", 50.0)

        debounce_trust = self.debouncer.update(device_id, activity_state)
        route_plausible = self.route_checker.is_plausible(device_id, lon, lat)

        confidence_score = compute_composite_confidence(
            gps_accuracy_m=gps_accuracy,
            debounce_trust=debounce_trust,
            route_plausible=route_plausible
        )

        enriched_payload = payload.copy()
        enriched_payload["confidence_score"] = confidence_score
        return enriched_payload

def start_service():
    pipeline = SignalProcessingPipeline()
    client = mqtt.Client(client_id="signal_processing_service")

    def on_connect(client, userdata, flags, rc):
        logger.info(f"Connected to MQTT broker with result code {rc}")
        client.subscribe(RAW_TELEMETRY_TOPIC)

    def on_message(client, userdata, msg):
        try:
            raw_payload = json.loads(msg.payload.decode("utf-8"))
            enriched_payload = pipeline.process_ping(raw_payload)
            client.publish(TARGET_TELEMETRY_TOPIC, json.dumps(enriched_payload))
        except Exception as e:
            logger.error(f"Error processing payload: {e}")

    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, keepalive=60)
    logger.info("Signal processing service starting consumer loop...")
    client.loop_forever()

if __name__ == "__main__":
    start_service()