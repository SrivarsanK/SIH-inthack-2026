# CH-4 Dashboard & UI — Agent Instructions

> Read AGENTS.md in the project root first. This file adds CH-4-specific rules.

---

## Your Role

You build and maintain the **presentation layer** for the Yara Transit Intelligence Platform. You display live vehicle movement, compound ETA countdowns, rolling occupancy density, and provide interactive simulation injection controls for judges and operators.

**Inputs**:
- SSE stream at http://localhost:8002/stream (from CH-3 ETA Engine)
- REST snapshot at http://localhost:8002/eta (optional initial load)

**Outputs / Actions**:
- POST requests to CH-1 Simulator Control API at http://localhost:8001/inject/*

---

## Folder Structure

`
dashboard/
├── astro.config.mjs         ← Astro framework configuration (React + Tailwind integration)
├── package.json             ← Frontend dependencies
├── public/                  ← Static assets (logos, icons, patterns)
└── src/
    ├── components/          ← React UI components
    │   ├── AdminPanel.tsx        ← GTFS routes, agencies & system configuration
    │   ├── AgencySelector.tsx    ← Agency switcher (MTC, CMRL, etc.)
    │   ├── ApiInspectorModal.tsx ← Live payload inspection for demo judges
    │   ├── ChaloHomeView.tsx     ← Consumer mobile transit app interface
    │   ├── DashboardApp.tsx      ← Master multi-view dashboard container
    │   ├── ETACountdown.tsx      ← High-visibility countdown timer
    │   ├── EventLog.tsx          ← Live event & injection log stream
    │   ├── InjectPanel.tsx       ← Fault injection controls (delay, dropout, crowd, reset)
    │   ├── KioskDisplayView.tsx  ← Sunlight-readable bus stop kiosk screen
    │   ├── KioskHeader.tsx       ← High-contrast kiosk header with agency branding
    │   ├── LiveMap.tsx           ← Vehicle position map
    │   ├── MapLibreMap.tsx       ← Interactive MapLibre GL transit rendering
    │   ├── OccupancyBadge.tsx    ← Color-coded bus occupancy indicator
    │   ├── RouteDetailView.tsx   ← Route timeline & scheduled stops view
    │   ├── RoutesListView.tsx    ← Searchable routes list
    │   ├── SearchAutocomplete.tsx← Rapid stop/route search
    │   ├── SearchView.tsx        ← Search results view
    │   └── TripTimeline.tsx      ← Stop-by-stop progress bar
    ├── lib/                 ← Hooks & client libraries
    │   ├── agencies.ts           ← Multi-agency profiles & sample routes
    │   ├── useNeonRoutes.ts      ← Neon DB route queries
    │   └── useTransitStream.ts   ← Native browser EventSource SSE consumer
    ├── pages/               ← Astro entry pages
    │   ├── index.astro           ← Default unified application entry
    │   ├── kiosk.astro           ← Standalone Kiosk display page
    │   └── admin.astro           ← Standalone Admin control panel
    └── styles/
        └── global.css            ← Global styles & Tailwind utilities
`

---

## Data Contracts & API Expectations

### 1. Inbound SSE Stream Contract (http://localhost:8002/stream)
The frontend receives live JSON updates containing:
`json
{
  ts: 1723123456,
  vehicle: {
    lat: 12.9718,
    lon: 77.5944,
    leg: outbound,
    progress: 0.42,
    source: gnss,
    trip_id: trip_outbound_1,
    block_id: block_001
  },
  outbound: {
    T_outbound_sec: 540
  },
  dwell: {
    T_dwell_sec: 300,
    dwell_remaining_sec: 300
  },
  inbound: {
    T_inbound_sec: 1500
  },
  eta_inbound_sec: 2340,
  occupancy: {
    mac_count: 34,
    band: SEATS_AVAILABLE
  },
  event_flags: {
    delay_min: 0.0,
    dropout: false,
    crowd_spike: false
  }
}
`

### 2. Simulator Injection Control API (http://localhost:8001)
All fault injection buttons must issue POST requests to:
- POST http://localhost:8001/inject/delay?min={minutes}
- POST http://localhost:8001/inject/dropout?sec={seconds}
- POST http://localhost:8001/inject/crowd?delta={passengers}
- POST http://localhost:8001/reset

---

## Development & Execution

`ash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build production bundle
npm run build
`
