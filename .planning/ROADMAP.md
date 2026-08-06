# TransitSense Roadmap

## Milestone 1: Hackathon Simulated Real Pipeline

### Phase 1: CH-1 Telemetry Simulator Engine (`simulator/`)
- **Status**: Complete
- **Description**: Python FastAPI REST control API (:8001) + MQTT telemetry publisher (1Hz GNSS + mac_count).
- **Inject Controls**: `/inject/delay`, `/inject/dropout`, `/inject/crowd`, `/reset`.

### Phase 2: CH-2 Kalman Filter Fusion Service (`kalman_service/`)
- **Status**: Complete
- **Description**: 1D Kalman state estimator smoothing raw GNSS and cell triangulation fallback.
- **Topic**: Consumes `fleet/bus_1/telemetry`, publishes `fleet/bus_1/fused`.

### Phase 3: CH-3 Compound ETA Engine & Occupancy Aggregator (`eta_engine/`)
- **Status**: Complete
- **Description**: FastAPI SSE stream (:8002) computing GTFS-RT compounding ETAs:
  $$ETA_{total} = T_{outbound} + T_{dwell} + T_{inbound}$$

### Phase 4: CH-4 TransitSense Interactive Dashboard (`dashboard/`)
- **Status**: Active Fixes
- **Description**: Astro 7 + React Islands + MapLibre GL / Leaflet CartoDB tiles + Photon search-as-you-type autocomplete + Indian transit agency network.
