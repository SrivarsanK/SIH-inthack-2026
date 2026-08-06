# CH-2 Kalman Fusion Service — Agent Instructions

> Read `AGENTS.md` in the project root first. This file adds CH-2-specific rules.

---

## Your Role

You consume raw, noisy telemetry from CH-1 and output **clean, smoothed position** that never teleports — even during GNSS dropout. This is the visual proof of real sensor fusion. If the bus icon jumps on the map, your Kalman filter has failed.

**Input**: MQTT `fleet/bus_1/telemetry`
**Output**: MQTT `fleet/bus_1/fused`

---

## Folder Structure (do not deviate)

```
kalman_service/
├── kalman.py       ← KalmanTracker class (prediction + update)
├── subscriber.py   ← MQTT consumer + publisher
└── verify.py       ← debug script to compare raw vs fused
```

---

## Output Payload Contract (NEVER change field names)

```json
{
  "ts": 1723123456,
  "lat": 12.9718,
  "lon": 77.5944,
  "speed_kmh": 21.8,
  "source": "gnss",
  "block_id": "block_001",
  "leg": "outbound",
  "progress": 0.42
}
```

**Field rules:**
- `lat`, `lon` — Kalman-smoothed coordinates (not raw from CH-1)
- `source` — `"gnss"` when `gnss_valid=true`, `"kalman_estimated"` when `gnss_valid=false`
- `block_id`, `leg`, `progress` — **pass through unchanged** from CH-1 payload
- `ts` — pass through unchanged from CH-1 payload
- `speed_kmh` — pass through unchanged from CH-1 payload

---

## Kalman Filter Specification

**State vector**: `x = [lat, lon, v_lat, v_lon]` (position + velocity)

**Noise matrices** (critical — do not change these ratios):
```python
R_gnss = np.eye(2) * 0.00001   # GNSS: trusted data source
R_cell = np.eye(2) * 0.01      # Cellular fallback: noisy, low trust
```

`R_cell` must be **1000× larger** than `R_gnss`. This ratio determines how much the filter resists the noisy dropout coordinates. If ratio is wrong, bus will either teleport (ratio too low) or stop moving during dropout (ratio too high).

**Kalman Gain behavior:**
- High GNSS quality → high gain → position closely tracks measurement
- Low GNSS quality (dropout) → low gain → position continues on predicted trajectory (last known velocity)

---

## The One Visual Test That Matters

During GNSS dropout injection (from CH-1 control API):
- Raw `lat` from CH-1 jumps by ~0.0005 degrees randomly each tick
- Your fused `lat` must change by **less than 0.0001 degrees per tick**
- On CH-4 map: the icon must glide smoothly — zero visible teleport

Run `verify.py` to check this automatically.

---

## Critical Rules

### Do NOT pass raw coordinates through during dropout
```python
# ❌ WRONG — causes teleport
if not gnss_valid:
    output_lat = raw_lat  # passes noisy value directly

# ✅ CORRECT — let Kalman filter resist the noise
fused = tracker.update(lat=raw_lat, lon=raw_lon, gnss_valid=False)
# Kalman suppresses noisy input via low gain
```

### Do NOT reset the filter on dropout
The filter must maintain continuity across dropout periods. If you reset `self.x` when dropout starts, you lose velocity history and the smoothing fails.

### Do NOT add artificial smoothing (moving average etc.)
Only the Kalman filter. No rolling averages, no median filters, no lerp. Judges may ask about the algorithm; answer must be "Kalman filter with adaptive gain."

---

## Phase Checklist

- [ ] Phase 1: `subscriber.py` receives messages from `fleet/bus_1/telemetry`
- [ ] Phase 2: `KalmanTracker.update()` returns smoothed lat/lon for both valid and invalid GNSS
- [ ] Phase 3: `verify.py` shows Δlat < 0.0001 during dropout injection

---

## Common Mistakes to Avoid

- ❌ Setting `R_gnss == R_cell` — filter treats both sources equally, no smoothing benefit
- ❌ Skipping the prediction step — must predict every tick even with no new measurement
- ❌ Using 2D state (lat, lon only) — velocity state is essential for dropout interpolation
- ❌ Publishing on `fleet/bus_1/telemetry` instead of `fleet/bus_1/fused`
- ❌ Not passing through `leg`, `progress`, `block_id` — CH-3 will break without them
