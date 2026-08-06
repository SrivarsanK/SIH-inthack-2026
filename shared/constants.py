# shared/constants.py
# ============================================================
# TransitSense — Shared Constants
# ALL channels must import from here. Never hardcode these values.
# ============================================================

# MQTT
MQTT_HOST = "localhost"
MQTT_PORT = 1883
TOPIC_TELEMETRY = "fleet/bus_1/telemetry"   # CH-1 → CH-2, CH-3
TOPIC_FUSED     = "fleet/bus_1/fused"        # CH-2 → CH-3

# API Ports (locked — do not change)
ETA_API_PORT    = 8002   # CH-3: /eta and /stream
SIM_CONTROL_PORT = 8001  # CH-1: /inject/*

# Transit Block
BLOCK_ID = "block_001"

# Route Durations (seconds)
OUTBOUND_TOTAL_SEC = 25 * 60   # 25 min A→B
INBOUND_TOTAL_SEC  = 25 * 60   # 25 min B→A
DWELL_BASELINE_SEC = 300       # 5 min default terminal halt

# Bus Capacity
BUS_CAPACITY     = 40   # seated capacity
BUS_MAX_CAPACITY = 55   # absolute maximum (standing limit)

# Simulator
SIM_PUBLISH_HZ   = 1       # 1 message per second
SIM_BASE_SPEED   = 0.005   # progress units per second (0→1 per leg)
GNSS_NOISE_STD   = 0.0005  # degrees std dev during dropout

# Occupancy Bands (thresholds)
BAND_MODERATE_RATIO    = 1.2   # capacity × 1.2 → MODERATE threshold
BAND_STANDING_CAPACITY = BUS_MAX_CAPACITY

# ETA Dwell Recovery Factor
DWELL_RECOVERY_FACTOR = 0.3   # T_dwell shrinks by 30% of accumulated delay
DWELL_MINIMUM_SEC     = 60    # driver always gets at least 1 minute
