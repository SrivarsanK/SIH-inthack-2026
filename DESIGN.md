---
name: TransitSense UI System
description: High-contrast, glanceable public transit intelligence visual design system for kiosks and mobile interfaces
colors:
  primary: "#0284c7"
  primary-deep: "#0369a1"
  accent-amber: "#f59e0b"
  accent-emerald: "#22c55e"
  accent-rose: "#ef4444"
  neutral-bg: "#020617"
  surface-card: "#0f172a"
  surface-border: "#1e293b"
  text-primary: "#f8fafc"
  text-muted: "#94a3b8"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 800
    lineHeight: "1.1"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5"
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.875rem"
    fontWeight: 600
rounded:
  sm: "6px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
---

# Design System: TransitSense

## Overview

**Creative North Star: "The High-Contrast Transit Beacon"**

TransitSense is an edge-first public transit intelligence identity engineered for maximum readability under intense outdoor sunlight, high-movement environments, and quick 10-foot glance scanning. It merges dark-mode slate glassmorphism with high-luminance civic color coding (Emerald, Amber, Rose) inspired by modern multimodal navigation systems (Margdarshak & Bus Navigator).

**Key Characteristics:**
- **Outdoor Sunlight Readability**: Pure high-contrast slate canvas (`#020617`) with crisp white typography (`#f8fafc`).
- **Glanceable Color Coding**: Distinct visual bands for crowd density (🟢 Seats Available, 🟡 Moderate, 🟠 Standing Room, 🔴 Very Crowded).
- **Tactile Route Pill Badges**: Bold high-visibility route numbers (`101`, `16C`, `24E`) inspired by Indian civic transit displays.
- **Glassmorphism Depth**: Subtle semi-transparent panel surfaces (`rgba(15, 23, 42, 0.8)`) with `backdrop-blur-md` and 1px precision borders.

## Colors

The TransitSense palette pairs a deep Slate 950 obsidian background with electric sky blue accents and high-visibility status signals.

### Primary
- **Sky Signal Blue** (`#0284c7`): Primary brand accent, active bus markers, and focused action controls.

### Secondary
- **Amber Halt** (`#f59e0b`): Terminal dwell time indicator, delay warnings, and moderate occupancy warnings.

### Tertiary
- **Emerald Flow** (`#22c55e`): Live connection status, on-time arrivals, and seats available indicator.
- **Rose Dropout** (`#ef4444`): Severe delay alerts and very crowded capacity warnings.

### Neutral
- **Slate Canvas** (`#020617`): Deep dark background canvas for maximum visual contrast.
- **Slate Surface** (`#0f172a`): Glassmorphism card container background.
- **Slate Border** (`#1e293b`): Subtle 1px structural container border.
- **Pure Crisp White** (`#f8fafc`): Primary high-legibility heading and countdown text.

### Named Rules
**The One Flash Rule.** Color flashes (red for delay, green for schedule recovery) are transient and fire only on state changes, returning to clean slate within 2 seconds.

## Typography

**Display Font:** Inter / System UI Sans
**Body Font:** Inter
**Label/Mono Font:** JetBrains Mono / Fira Code

### Hierarchy
- **Display** (800, `clamp(2rem, 5vw, 3.5rem)`, 1.1): Hero countdown timer (`MM:SS`) and kiosk headers.
- **Headline** (700, `1.5rem`, 1.25): Panel headers and route titles.
- **Title** (600, `1.125rem`, 1.3): Component section headers.
- **Body** (400, `1rem`, 1.5): Descriptive copy, stop names, and event logs.
- **Label / Mono** (600, `0.875rem`, 1.2): Timestamps, vehicle IDs, and `block_id` tags.

### Named Rules
**The Monospace Time Rule.** All timestamps, countdown numbers, and trip deltas must use monospace typography to prevent layout shifts during live updates.

## Layout

A split-screen responsive grid layout:
- **Desktop / Kiosk (12 columns)**: Left column (7 cols) dedicated to the interactive Leaflet map; right column (5 cols) stacked with ETA Countdown, Occupancy Badge, Inject Controls, and Cause-and-Effect Event Log.
- **Mobile Stack**: Vertical single-column stack with Map sticky at top and ETA panels scrolling below.

## Elevation & Depth

Flat surfaces at rest with subtle 1px border strokes (`#1e293b`). Depth is established through semi-transparent glassmorphism backdrop filters (`backdrop-blur-md`) and gentle 2xl container shadows (`shadow-2xl`).

### Named Rules
**The Glass Surface Rule.** All card containers use semi-transparent `bg-slate-900/90` with `backdrop-blur-md` and 1px `#1e293b` border stroke.

## Shapes

- **Card Radius**: `16px` (`rounded-2xl`) for main containers.
- **Button & Pill Radius**: `12px` (`rounded-xl`) for interactive buttons and badge pills.
- **Route Badge Radius**: `8px` (`rounded-lg`) for bold route number tags.

## Components

### Live Map Panel
- **Container**: `h-full min-h-[480px] rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-2xl`
- **Bus Marker**: Custom div icon with pulsing ring (`bg-blue-500/30 animate-ping`) and high-visibility bus emoji.
- **Route Line**: Dashed 5px polyline (`#3b82f6`) connecting stop sequence.

### ETA Countdown Panel
- **Countdown**: Monospace 800 weight font (`text-5xl font-mono text-white`).
- **Breakdown Grid**: 3-column sub-grid for $T_{\text{outbound}}$, $T_{\text{dwell}}$, $T_{\text{inbound}}$.

### Occupancy Pill Badge
- **Style**: Color-coded pill with pulsing status dot (`🟢 Seats Available` | `🟡 Moderate` | `🟠 Standing Room` | `🔴 Very Crowded`).

### Inject Control Panel
- **Buttons**: Grid of 4 high-affordance buttons with hover border highlights and active scale feedback (`active:scale-95`).

## Do's and Don'ts

### Do:
- **Do** maintain high contrast between text (`#f8fafc`) and dark background (`#020617`).
- **Do** use JetBrains Mono for all live numbers, timestamps, and minute deltas.
- **Do** highlight desaturated prior leg vs active inbound leg on the map.

### Don't:
- **Don't** use low-contrast grey text (`text-slate-400`) directly on bright colored backgrounds (`bg-blue-500`).
- **Don't** hardcode fake values in UI components — always connect to live SSE stream or structured fallback.
