# TransitSense — Smart India Hackathon 2026 Project

> Real-time Public Transit Intelligence Platform delivering continuous bus ETAs, occupancy density, and sensor fusion.

## Core Architecture

```mermaid
flowchart LR
    SIM["🟠 CH-1 Simulator (:8001)"]
    KAL["🟡 CH-2 Kalman Fusion"]
    ETA["🔵 CH-3 ETA & Density Engine (:8002)"]
    DASH["🟢 CH-4 Interactive Dashboard"]

    SIM -- "MQTT fleet/bus_1/telemetry" --> KAL
    SIM -- "MQTT mac_count" --> ETA
    KAL -- "MQTT fleet/bus_1/fused" --> ETA
    ETA -- "SSE JSON stream" --> DASH
    DASH -. "POST /inject/*" .-> SIM
```

## Data Contracts & Port Allocations
- MQTT Broker: `localhost:1883`
- Telemetry Topic: `fleet/bus_1/telemetry`
- Fused Position Topic: `fleet/bus_1/fused`
- ETA SSE Stream: `http://localhost:8002/stream`
- ETA REST API: `http://localhost:8002/eta`
- Simulator REST API: `http://localhost:8001/inject/*`
