# CH-1 Simulator Engine — Agent Instructions

> Read `AGENTS.md` in the project root first. This file adds CH-1-specific rules.

---

## Your Role

You are building the **single source of truth** for all simulated transit data in this pipeline. Every other channel depends on what you emit. If your payload shape is wrong or your timing is off, all four channels break simultaneously.

Your output is: **MQTT messages at 1Hz on topic `fleet/bus_1/telemetry`**

---

## Folder Structure (do not deviate)

```
simulator/
├── gtfs_static/
│   ├── agency.txt
│   ├── routes.txt
│   ├── trips.txt
│   ├── stops.txt
│   └── stop_times.txt
├── simulator.py        ← main loop + MQTT publisher
├── control_api.py      ← FastAPI REST control endpoints
└── route_geometry.py   ← lat/lon interpolation along shape
```

---

## Payload Contract (NEVER change field names or types)

```json
{
  "ts": 1723123456,
  "lat": 12.9716,
  "lon": 77.5946,
  "speed_kmh": 22.5,
  "gnss_valid": true,
  "mac_count_delta": 0,
  "event_flags": {
    "delay_min": 0.0,
    "dropout": false,
    "crowd_spike": false
  },
  "trip_id": "trip_outbound_1",
  "block_id": "block_001",
  "leg": "outbound",
  "progress": 0.42
}
```

**Field rules:**
- `ts` — Unix timestamp (integer), always current
- `lat`, `lon` — floats, interpolated along route shape
- `gnss_valid` — `false` only during dropout injection
- `mac_count_delta` — normally 0; non-zero only on crowd spike
- `leg` — exactly one of: `"outbound"`, `"dwell"`, `"inbound"`
- `progress` — float 0.0–1.0 within current leg
- `block_id` — always `"block_001"`
- `trip_id` — `"trip_outbound_1"` when outbound, `"trip_inbound_1"` when inbound

---

## Control API Contract (NEVER change endpoint paths)

| Endpoint | Method | Effect |
|---|---|---|
| `/inject/delay?min=N` | POST | Add N minutes to remaining leg time |
| `/inject/dropout?sec=N` | POST | Emit noisy coordinates for N seconds |
| `/inject/crowd?delta=N` | POST | Emit one message with `mac_count_delta=N` |
| `/reset` | POST | Return to initial state |

Port: **8001** (locked, do not change)

---

## State Machine Rules

The bus must cycle through exactly these states in order:
```
outbound (progress 0→1) → dwell (countdown) → inbound (progress 0→1) → [repeat]
```

- During `dwell`, publish messages with `leg: "dwell"` and `progress: 0`
- During dwell, `DWELL_BASELINE_SEC` counts down; when complete, switch to inbound
- During dropout, `gnss_valid` = `false`, add random noise (std=0.0005 degrees) to lat/lon
- Delay injection: reduce speed multiplier AND add `delay_min` to `event_flags`

---

## GNSS Noise During Dropout

```python
import numpy as np
# Dropout noise — significant enough to show visual difference
lat_noisy = lat + np.random.normal(0, 0.0005)
lon_noisy = lon + np.random.normal(0, 0.0005)
```

Do NOT use a fixed offset — randomness is required so CH-2's Kalman smoothing is visually meaningful.

---

## Phase Checklist

- [ ] Phase 1: All 5 GTFS static CSVs created and valid
- [ ] Phase 2: `interpolate_position()` returns correct lat/lon at 0.0, 0.5, 1.0
- [ ] Phase 3: MQTT messages visible at 1Hz via `mosquitto_sub -t "fleet/bus_1/telemetry"`
- [ ] Phase 4: All 4 control endpoints return `{"status": "ok"}` and change behavior within 1s

---

## Common Mistakes to Avoid

- ❌ Publishing at 10Hz — use exactly 1Hz (`time.sleep(1)`)
- ❌ Setting `gnss_valid: false` permanently — only during dropout window
- ❌ Omitting `progress` field — CH-3 needs it for ETA calculation
- ❌ Using random lat/lon instead of interpolating along the route shape
- ❌ Publishing on a different MQTT topic name (even with different capitalization)
