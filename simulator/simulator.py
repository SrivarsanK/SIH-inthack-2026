import json
import os
import sys
import threading
import time

import numpy as np
import paho.mqtt.client as mqtt

# Add parent dir to path to import shared constants
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from route_geometry import get_position
from shared.constants import (
    BLOCK_ID, DWELL_BASELINE_SEC, GNSS_NOISE_STD, MQTT_HOST, MQTT_PORT,
    SIM_BASE_SPEED, SIM_PUBLISH_HZ, TOPIC_TELEMETRY
)

STATE_FILE = os.path.join(os.path.dirname(__file__), 'shared_state.json')

class Simulator:
    def __init__(self):
        self.client = mqtt.Client()
        self.client.connect(MQTT_HOST, MQTT_PORT, 60)
        self.client.loop_start()

        # State machine
        self.leg = 'outbound' # outbound, dwell, inbound
        self.progress = 0.0
        self.dwell_time_remaining = 0
        
        # Track which trip we are on
        self.is_outbound = True 

        # Injection state
        self.delay_min = 0.0
        self.dropout_sec_remaining = 0
        self.crowd_delta_pending = 0

    def read_injections(self):
        """Read injections from shared state and clear the file"""
        if not os.path.exists(STATE_FILE):
            return

        try:
            with open(STATE_FILE, 'r+') as f:
                content = f.read()
                if content:
                    commands = json.loads(content)
                    # Process commands
                    for cmd in commands:
                        if cmd['type'] == 'delay':
                            self.delay_min += cmd['value']
                        elif cmd['type'] == 'dropout':
                            self.dropout_sec_remaining = max(self.dropout_sec_remaining, cmd['value'])
                        elif cmd['type'] == 'crowd':
                            self.crowd_delta_pending += cmd['value']
                        elif cmd['type'] == 'reset':
                            self.reset_state()
                    
                    # Clear the file
                    f.seek(0)
                    f.truncate()
        except Exception as e:
            print(f"Error reading injections: {e}")

    def reset_state(self):
        self.leg = 'outbound'
        self.progress = 0.0
        self.dwell_time_remaining = 0
        self.is_outbound = True
        self.delay_min = 0.0
        self.dropout_sec_remaining = 0
        self.crowd_delta_pending = 0

    def step(self):
        self.read_injections()
        
        # Determine actual speed based on delay
        # If there's a delay, we might slow down or pause. 
        # A simple way: reduce progress increment temporarily or just hold if there's delay.
        # But instructions say: "Delay injection: reduce speed multiplier AND add delay_min to event_flags"
        # We'll just pass delay_min in event_flags. The ETA engine will see the delay_min.
        # Wait, if we just pass delay_min in event_flags, we also need to actually delay the bus?
        # Let's say speed is reduced by half if delay_min > 0, just to simulate it visibly.
        actual_speed = SIM_BASE_SPEED
        if self.delay_min > 0:
            actual_speed = SIM_BASE_SPEED * 0.5

        # Process dropout timer
        gnss_valid = True
        if self.dropout_sec_remaining > 0:
            gnss_valid = False
            self.dropout_sec_remaining -= 1

        # Process crowd spike
        mac_count_delta = self.crowd_delta_pending
        self.crowd_delta_pending = 0  # Only emit once

        # State machine logic
        if self.leg == 'outbound':
            self.progress += actual_speed
            if self.progress >= 1.0:
                self.progress = 1.0
                self.leg = 'dwell'
                self.dwell_time_remaining = DWELL_BASELINE_SEC
        elif self.leg == 'inbound':
            self.progress += actual_speed
            if self.progress >= 1.0:
                self.progress = 1.0
                self.leg = 'dwell'
                self.dwell_time_remaining = DWELL_BASELINE_SEC
        elif self.leg == 'dwell':
            self.progress = 0.0
            self.dwell_time_remaining -= 1
            if self.dwell_time_remaining <= 0:
                # Switch leg
                self.is_outbound = not self.is_outbound
                self.leg = 'outbound' if self.is_outbound else 'inbound'
                self.progress = 0.0
                self.delay_min = 0.0 # reset delay on new leg?

        # Get coordinates
        # If dwelling, we are at the destination of the previous leg, or start of the next leg.
        geo_leg = 'outbound' if self.is_outbound else 'inbound'
        geo_progress = self.progress
        if self.leg == 'dwell':
            geo_progress = 0.0 # By contract, progress is 0 during dwell. This means we are at the start of the current leg.

        lat, lon = get_position(geo_leg, geo_progress)

        if not gnss_valid:
            lat += np.random.normal(0, GNSS_NOISE_STD)
            lon += np.random.normal(0, GNSS_NOISE_STD)

        # Build payload
        trip_id = "trip_outbound_1" if self.is_outbound else "trip_inbound_1"
        
        payload = {
            "ts": int(time.time()),
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "speed_kmh": round(actual_speed * 1000 * 3.6, 1), # just a rough synthetic speed
            "gnss_valid": gnss_valid,
            "mac_count_delta": mac_count_delta,
            "event_flags": {
                "delay_min": float(self.delay_min),
                "dropout": not gnss_valid,
                "crowd_spike": (mac_count_delta > 0)
            },
            "trip_id": trip_id,
            "block_id": BLOCK_ID,
            "leg": self.leg,
            "progress": round(self.progress, 4)
        }

        self.client.publish(TOPIC_TELEMETRY, json.dumps(payload))
        print(f"Published: {payload['leg']} progress={payload['progress']} valid={gnss_valid}")

    def run(self):
        print("Starting Simulator...")
        # Initialize state file
        with open(STATE_FILE, 'w') as f:
            f.write("[]")
            
        while True:
            self.step()
            time.sleep(1.0 / SIM_PUBLISH_HZ)

if __name__ == '__main__':
    sim = Simulator()
    sim.run()
