# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Astro.js full-stack framework, Neon DB (serverless Postgres), YOLO (on-device computer vision for passenger counting)

## Users
Commuters, transit passengers (bus, local train, metro riders), transit operators, and SIH 2026 hackathon evaluators.

## Product Purpose
Provide real-time, privacy-friendly, offline-tolerant transit intelligence—delivering accurate bus ETAs, passenger occupancy density, glanceable stop kiosk displays, and multimodal train/metro guidance.

## Positioning
A low-cost, edge-first public transport intelligence platform prioritizing data freshness, privacy (zero raw video storage), and offline resilience over heavy external API dependencies.

## Operating Context
Used by passengers on smartphones and public stop kiosks under variable outdoor lighting and intermittent network coverage. Used by transit authorities to monitor fleet flow and vehicle crowding.

## Capabilities and Constraints
- Real-time Bus ETA engine (GPS snapping + segment-level historical travel times + freshness/confidence indicators).
- Passenger density estimation categorized into 4 occupancy bands (*Seats Available*, *Moderate Crowd*, *Standing Room*, *Very Crowded*) powered by YOLO on-device edge detection.
- Hybrid Glanceable Stop Kiosks displaying upcoming arrivals, ETAs, crowd levels, and staleness warnings.
- Train & Metro extension module featuring schematic route maps, interchange guidance, and coach-level crowd indicators.
- Stack constraints: Astro.js full-stack web framework, Neon DB, YOLO CV model integration.

## Brand Commitments
**Yara** — high-contrast, accessible, and glanceable public transit identity designed for immediate legibility and high user trust.

## Evidence on Hand
Complete research reviews and design specs in [`docs/`](file:///c:/Users/Srivarsan/Desktop/SIH-inthack-2026/docs):
- `Overview & Outline-2026080521181060.pdf`
- `Bus ETA Prediction – Methods, Trade-offs, and TransitSense Fit`
- `Passenger Density Estimation – Methods, Trade-offs, and TransitSense Fit`
- `Bus-Stop Kiosk Design – Methods, Trade-offs, and TransitSense Fit`
- `Train & Metro Extensions – Methods, Trade-offs, and TransitSense Fit`

## Product Principles
1. **Certainty Over Complexity**: Clear ETAs paired with freshness timestamps build trust better than opaque complex models.
2. **Privacy by Design**: Edge inference only; no raw video or personal passenger data stored or transmitted.
3. **Glanceable Accessibility**: High-contrast typography and clear visual cues visible at a distance in outdoor conditions.
4. **Offline Resilience**: Local caching and graceful fallback states when network drops, avoiding blank or broken displays.

## Accessibility & Inclusion
High-contrast outdoor readability, large legible typography for quick scanning, color-coded route/line indicators, intuitive iconography for crowd levels.
