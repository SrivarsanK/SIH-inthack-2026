# TransitSense — UI Design Brief (Impeccable Shape)

## 1. Job & Audience
- **Primary Audience**: SIH 2026 hackathon evaluators, transit commuters, and bus stop kiosk viewers.
- **Operating Context**: Dual-environment — outdoor stop displays (high sunlight readability) and interactive judge laptops/monitors.
- **Visitor Mode**: **Operate** (task execution, glanceable ETA scanning, live pipeline verification).

## 2. Outcome & Key Proof
- **Primary Task**: Commuters scan live bus arrival times ($T_{\text{total}} = T_{\text{outbound}} + T_{\text{dwell}} + T_{\text{inbound}}$) and crowd density at a glance.
- **Key Demo Proof**: One click on an inject button (Delay / Dropout / Crowd) causes instantaneous (< 2s) visible updates across map, countdown, badge, and event log simultaneously.
- **Product Truth**: Zero fake data — real-time continuous tracking across `block_id` routes.

## 3. Selected Direction & Visual Identity
- **Theme**: Clean Minimal Slate & Glassmorphism (`bg-slate-950`, `backdrop-blur-md`, high-contrast text, subtle glowing border accents).
- **Dual Display Modes**:
  - 🖥️ **Command Center View**: Full split-screen grid with live map, ETAs, crowd badge, judge inject buttons, and scrolling event log.
  - 📺 **Kiosk Display View**: Fullscreen ultra-glanceable mode optimized for 10-foot outdoor viewing with giant numbers, high contrast, and simplified route map.

## 4. Scope & Functional Boundaries
- **Fidelity**: Production-grade Astro + React + Leaflet + Tailwind v4 interactive UI.
- **Focal Moments**:
  1. Live countdown color flash (red on delay, green on recovery).
  2. Map vehicle marker gliding smoothly (Kalman filter proof).
  3. Pre-published inbound trip displaying predicted occupancy band (*Seats Available* vs *Standing Room*).
- **Anti-goals**: No cluttering forms, no complex authentication screens, no static non-functional mockups.

## 5. States & Data Ranges
- **Vehicle Legs**: `outbound` (grey desaturated icon), `dwell` (amber halt badge), `inbound` (highlighted active bus icon).
- **Occupancy Bands**: 🟢 *Seats Available* (<40 pax) | 🟡 *Moderate* (40–48 pax) | 🟠 *Standing Room* (48–55 pax) | 🔴 *Very Crowded* (>55 pax).
- **Network States**: Connected (live SSE stream) vs Reconnecting (amber warning badge).
