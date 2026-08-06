# CH-4 Dashboard — Agent Instructions

> Read `AGENTS.md` in the project root first. This file adds CH-4-specific rules.

---

## Your Role

You build the **entire judge-facing interface**. Every impressive moment judges experience goes through this channel. The inject buttons you build are what makes the demo interactive. The map, countdown, and event log are what judges remember.

**Input**: SSE stream from `http://localhost:8002/stream` (CH-3)
**Output controls**: REST calls to `http://localhost:8001/inject/*` (CH-1)

This is a **read-only consumer + control panel**. You do NOT process transit data — CH-3 does that. You only display what CH-3 sends and forward inject commands to CH-1.

---

## Folder Structure (do not deviate)

```
dashboard/
├── src/
│   ├── pages/
│   │   └── index.astro              ← main page shell (SSR)
│   ├── components/
│   │   ├── LiveMap.tsx              ← Leaflet map island
│   │   ├── ETACountdown.tsx         ← countdown + T breakdown
│   │   ├── OccupancyBadge.tsx       ← color-coded occupancy pill
│   │   ├── InjectPanel.tsx          ← judge control buttons
│   │   └── EventLog.tsx             ← scrolling cause→effect log
│   └── lib/
│       └── useTransitStream.ts      ← SSE client hook
└── public/
    ├── bus-active.svg               ← highlighted bus icon (inbound)
    └── bus-grey.svg                 ← desaturated bus icon (outbound)
```

---

## TypeScript Interface (use exactly as defined — matches CH-3 output)

```typescript
// lib/useTransitStream.ts
export interface TransitSnapshot {
  ts: number;
  vehicle: {
    lat: number;
    lon: number;
    leg: "outbound" | "dwell" | "inbound";
    progress: number;
    source: "gnss" | "kalman_estimated";
    trip_id: string;
    block_id: string;
  };
  outbound: {
    T_outbound_sec: number;
  };
  inbound: {
    trip_id: string;
    T_total_sec: number;
    T_outbound_sec: number;
    T_dwell_sec: number;
    T_inbound_sec: number;
    occupancy_band: "SEATS_AVAILABLE" | "MODERATE" | "STANDING_ROOM" | "VERY_CROWDED";
  };
  event_log: Array<{
    ts: string;
    event: string;
    T_total_before_sec: number;
    T_total_after_sec: number;
    delta_sec: number;
  }>;
}
```

**Never access fields not in this interface.** If you need a field that's missing, request it from CH-3 teammate — do not invent your own data.

---

## SSE Client Rules

```typescript
// useTransitStream.ts — use exactly this pattern
useEffect(() => {
  const es = new EventSource("http://localhost:8002/stream");
  es.onmessage = (e) => setData(JSON.parse(e.data));
  es.onerror = () => console.warn("SSE disconnected — auto-retrying");
  return () => es.close();  // cleanup on unmount
}, []);
```

- Use native browser `EventSource` only — no `eventsource` npm package
- `EventSource` auto-reconnects on disconnect — do not add manual retry logic
- Parse with `JSON.parse(e.data)` — CH-3 sends JSON strings

---

## Map Rules (LiveMap.tsx)

- Use `react-leaflet` with OpenStreetMap tiles
- Route polyline: hard-code the 6 stop coordinates matching CH-1's `gtfs_static/stops.txt`
- **Outbound bus** (when `vehicle.leg === "outbound"` or `"dwell"`):
  - Use desaturated/grey bus icon (`/bus-grey.svg`)
  - Show popup: `"🚌 Completing prior route — arriving as your bus in ~Xm"`
- **Inbound bus** (when `vehicle.leg === "inbound"`):
  - Use highlighted/colored bus icon (`/bus-active.svg`)
  - Show popup: `"🚌 YOUR BUS — en route to you"`
- **Both legs must be visible simultaneously during outbound leg** — show the projected inbound path as a lighter dashed line
- Animate marker with smooth CSS transition (do not snap to new position)

---

## ETA Countdown Rules (ETACountdown.tsx)

- Show total: `"Your bus arrives in MM:SS"`
- Show breakdown of all three components:
  ```
  🚌 Completing route:  09:00
  ⏸ Terminal halt:      02:00
  📍 To your stop:      02:00
  ```
- On delay injection: countdown value increases → briefly flash red (#ef4444) for 2s then return to normal color
- On recovery: countdown decreases → briefly flash green (#22c55e) for 2s
- Use `MM:SS` format for all times

---

## Occupancy Badge Rules (OccupancyBadge.tsx)

| Band | Label | Background Color | Emoji |
|---|---|---|---|
| `SEATS_AVAILABLE` | Seats Available | `#22c55e` (green) | 🟢 |
| `MODERATE` | Moderate Crowd | `#eab308` (yellow) | 🟡 |
| `STANDING_ROOM` | Standing Room | `#f97316` (orange) | 🟠 |
| `VERY_CROWDED` | Very Crowded | `#ef4444` (red) | 🔴 |

- Badge must read from `data.inbound.occupancy_band` — **not** vehicle occupancy
- This proves to judges that the pre-published inbound trip has occupancy — the key demo proof

---

## Inject Panel Rules (InjectPanel.tsx)

```typescript
const SIM = "http://localhost:8001";

// Post with no body, params in URL
await fetch(`${SIM}/inject/delay?min=5`, { method: "POST" });
await fetch(`${SIM}/inject/dropout?sec=10`, { method: "POST" });
await fetch(`${SIM}/inject/crowd?delta=20`, { method: "POST" });
await fetch(`${SIM}/reset`, { method: "POST" });
```

- Buttons must be large and clearly labeled — judges click these on camera
- After each inject, add a brief loading state (disable button for 1s)
- Do NOT add a confirm dialog — speed matters in a live demo
- Reset button should have distinct styling (e.g., outlined/border, not filled)
- Button order on screen: Inject Delay → GNSS Dropout → Crowd Spike → Reset

---

## Event Log Rules (EventLog.tsx)

- Read from `data.event_log` array (last 10 entries from CH-3)
- Display newest at top
- Each row: `[timestamp] [event description] [±Xm]`
- Delta color: positive (delay added) = red, negative (recovered) = green
- Font: monospace for timestamps
- Max height: scrollable, show last 5 entries visible without scrolling

---

## Layout Specification

```
┌─────────────────────────────────┬──────────────────┐
│                                 │  ETA Countdown   │
│           Live Map              ├──────────────────┤
│       (60% of width)            │ Occupancy Badge  │
│                                 ├──────────────────┤
│                                 │  Inject Panel    │
│                                 ├──────────────────┤
│                                 │  Event Log       │
└─────────────────────────────────┴──────────────────┘
```

- Map: left 60%, full height
- Sidebar: right 40%, stacked components
- Responsive: stack vertically on mobile (map top, panels below)
- Dark mode: dark background (#0f172a), light text (#f1f5f9)

---

## Visual Design Rules

This is a **hackathon demo** viewed under conference lighting. Design for clarity at a glance:

- Font size minimum: 14px body, 24px for countdown, 18px for labels
- High contrast — use white text on colored backgrounds
- No subtle animations — transitions must be obvious (0.3s max)
- No small icons without text labels — judges may be far from screen
- Header must show "TransitSense" and "SIH 2026" prominently
- Real-time indicator (pulsing green dot) showing "Live" connection status

---

## Phase Checklist

- [ ] Phase 0: Astro + React installed, dev server starts
- [ ] Phase 1: `useTransitStream` hook prints live data to console
- [ ] Phase 2: Bus icon visible on map at correct position, updates each second
- [ ] Phase 3: ETA countdown displays all three time components
- [ ] Phase 4: Occupancy badge shows correct color and label
- [ ] Phase 5: Inject buttons call correct endpoints, change visible in < 2s
- [ ] Phase 6: Event log shows entries with correct before/after values
- [ ] Phase 7: Full layout assembled, dark mode, responsive

---

## Common Mistakes to Avoid

- ❌ Reading occupancy from `vehicle` instead of `inbound.occupancy_band`
- ❌ Using WebSocket instead of EventSource — SSE only
- ❌ Calling inject endpoints without `method: "POST"` — GET is ignored by CH-1
- ❌ Hardcoding ETA values — always read from `data.inbound.T_total_sec`
- ❌ Map not showing desaturated bus during outbound — this is the key visual the judges need to see
- ❌ Small inject buttons — judges must be able to click confidently in front of an audience
- ❌ Closing/reconnecting SSE manually — `EventSource` handles reconnection automatically
