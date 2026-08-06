# CH-3 ETA + State Engine + Density Aggregator — Agent Instructions

> Read `AGENTS.md` in the project root first. This file adds CH-3-specific rules.

---

## Your Role

You are the **brain** of the pipeline. You consume fused position from CH-2 and raw MAC counts from CH-1, compute three compounding ETA values plus occupancy band, and serve the final JSON over SSE to CH-4.

**Inputs**:
- MQTT `fleet/bus_1/fused` (position from CH-2)
- MQTT `fleet/bus_1/telemetry` (MAC count delta from CH-1)

**Output**:
- HTTP SSE stream at `http://localhost:8002/stream`
- REST snapshot at `http://localhost:8002/eta`

---

## Folder Structure (do not deviate)

```
eta_engine/
├── state_store.py  ← in-memory state (single shared object)
├── consumers.py    ← MQTT subscribers for both topics
├── eta.py          ← T_outbound, T_dwell, T_inbound calculation
├── density.py      ← rolling MAC window → occupancy band
└── api.py          ← FastAPI: /eta (GET) and /stream (SSE)
```

---

## Output JSON Contract (NEVER change field names or structure)

```json
{
  "ts": 1723123456,
  "vehicle": {
    "lat": 12.9718,
    "lon": 77.5944,
    "leg": "outbound",
    "progress": 0.42,
    "source": "gnss",
    "trip_id": "trip_outbound_1",
    "block_id": "block_001"
  },
  "outbound": {
    "T_outbound_sec": 540
  },
  "inbound": {
    "trip_id": "trip_inbound_1",
    "T_total_sec": 780,
    "T_outbound_sec": 540,
    "T_dwell_sec": 120,
    "T_inbound_sec": 120,
    "occupancy_band": "SEATS_AVAILABLE"
  },
  "event_log": [
    {
      "ts": "14:32:10",
      "event": "ETA recalculated",
      "T_total_before_sec": 600,
      "T_total_after_sec": 780,
      "delta_sec": 180
    }
  ]
}
```

---

## ETA Formula (implement exactly as specified)

```
T_total = T_outbound + T_dwell + T_inbound
```

### T_outbound
```python
# When leg == "outbound":
remaining_fraction = 1.0 - progress
T_outbound = remaining_fraction * OUTBOUND_TOTAL_SEC + delay_accumulated_sec

# When leg == "dwell" or "inbound":
T_outbound = 0
```

### T_dwell
Recovery behavior — this is the key demo proof:
```python
# Dynamic: shrinks as delay accumulates (bus tries to recover schedule)
T_dwell = max(60, DWELL_BASELINE_SEC - (delay_accumulated_sec * 0.3))
# Floor at 60s — driver always gets at least 1 min
```

### T_inbound
```python
# Static for hackathon (no live traffic)
remaining_fraction = 1.0 - progress if leg == "inbound" else 1.0
T_inbound = remaining_fraction * INBOUND_TOTAL_SEC
```

### Route durations (use these constants, do not hardcode)
```python
OUTBOUND_TOTAL_SEC = 25 * 60   # 25 minutes A→B
INBOUND_TOTAL_SEC  = 25 * 60   # 25 minutes B→A
```

---

## Density Aggregator Specification

**Rolling window**: 60 seconds. Keep only MAC deltas from the last 60s.

**Occupancy band mapping** (use `BUS_CAPACITY=40`, `BUS_MAX_CAPACITY=55`):
```
mac_count < 40               → "SEATS_AVAILABLE"
40 ≤ mac_count < 48          → "MODERATE"        (capacity × 1.2)
48 ≤ mac_count < 55          → "STANDING_ROOM"
mac_count ≥ 55               → "VERY_CROWDED"
```

**Occupancy on inbound trip**: The occupancy band MUST be stitched into the `inbound` object in the JSON, not just `vehicle`. CH-4 reads it from `inbound.occupancy_band`. This is the demo proof point: judges see the pre-published inbound trip already predicting "Standing Room."

---

## Event Log Rules

- Append an entry only when `T_total` changes by > 30 seconds
- Keep maximum 20 entries (trim oldest first)
- Include: `ts` (HH:MM:SS string), `event`, `T_total_before_sec`, `T_total_after_sec`, `delta_sec`
- CH-4 displays this log to judges as the "connected pipeline proof"

---

## SSE Endpoint Rules

```python
@app.get("/stream")
async def stream():
    async def generator():
        while True:
            yield f"data: {json.dumps(build_snapshot())}\n\n"
            await asyncio.sleep(1)
    return StreamingResponse(generator(), media_type="text/event-stream")
```

- Must include CORS header `Access-Control-Allow-Origin: *`
- Push exactly once per second
- Never close the stream — CH-4 relies on auto-reconnect of `EventSource`
- Payload always valid JSON on a single line after `data: `

---

## Delay Accumulation

Track `delay_accumulated_sec` in state. It increases whenever:
- CH-1 emits `event_flags.delay_min > 0`

```python
# In consumers.py, on fused message:
if data.get("event_flags", {}).get("delay_min", 0) > 0:
    state.delay_accumulated_sec += data["event_flags"]["delay_min"] * 60
```

---

## Phase Checklist

- [ ] Phase 1: `state_store.py` has a `TransitState` class with all required fields
- [ ] Phase 2: `consumers.py` subscribes both topics and updates state on each message
- [ ] Phase 3: `eta.py` produces correct T_total for all three leg states
- [ ] Phase 4: `density.py` maps mac_count to correct band using rolling window
- [ ] Phase 5: `http://localhost:8002/stream` serves live SSE with valid JSON every 1s

---

## Common Mistakes to Avoid

- ❌ Putting occupancy only in `vehicle` — must also appear in `inbound.occupancy_band`
- ❌ Static T_dwell — it must dynamically shrink when delay accumulates
- ❌ Resetting delay_accumulated_sec on leg change — persist across the full block journey
- ❌ Blocking the FastAPI event loop with synchronous MQTT — use `client.loop_start()` in a thread
- ❌ Closing the SSE connection after N seconds — it must stream indefinitely
- ❌ Not adding CORS middleware — CH-4 (browser) will be blocked by browser CORS policy
