# Phase 4 Plan: CH-4 TransitSense Interactive Dashboard

> Executive phase plan for CH-4 Dashboard UI/UX enhancements, dynamic agency selection, and API architecture inspection.

## Tasks

### Task 1: Multimodal Trip Timeline & Dynamic Agency Integration
- **Objective**: Connect selected transit agency (BMTC Bengaluru, MTC Chennai, BEST Mumbai, DTC Delhi) to `TripTimeline.tsx`, `LiveMap.tsx`, `ETACountdown.tsx`, and `KioskDisplayView.tsx`.
- **Files**: `dashboard/src/components/TripTimeline.tsx`, `dashboard/src/components/DashboardApp.tsx`, `dashboard/src/lib/agencies.ts`.
- **Verification**: `npm run build` succeeds cleanly in <800ms.

### Task 2: Vector Map Tile Layer & Leaflet Fallback
- **Objective**: Ensure high-contrast Leaflet CartoDB Dark Matter tiles and MapLibre GL JS vector rendering function seamlessly with zero black screen artifacts.
- **Files**: `dashboard/src/components/LiveMap.tsx`, `dashboard/src/pages/index.astro`, `dashboard/src/styles/global.css`.
- **Verification**: Canvas renders with 100% width/height and auto-bounds fitting.

### Task 3: API Architecture & Endpoint Inspector Modal
- **Objective**: Render interactive API status modal detailing data contracts for all 5 pipeline channels.
- **Files**: `dashboard/src/components/ApiInspectorModal.tsx`, `dashboard/src/components/InjectPanel.tsx`.
- **Verification**: `🔌 View APIs` button opens modal detailing ports `:8001`, `:8002`, and `:1883`.

## Verification Criteria
- [x] All Astro pages build cleanly with 0 TypeScript/Vite errors.
- [x] Feature branch `srivarsan/ch4-dashboard-fixes` contains all Phase 4 commits.
- [x] `main` branch remains untouched until explicit user merge approval.
