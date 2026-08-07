import { useState, useEffect, useCallback, useRef } from "react";

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
    route_duration_sec?: number;
  };
  inbound: {
    trip_id: string;
    T_total_sec: number;
    T_outbound_sec: number;
    T_dwell_sec: number;
    T_inbound_sec: number;
    occupancy_band: "SEATS_AVAILABLE" | "MODERATE" | "STANDING_ROOM" | "VERY_CROWDED";
    route_duration_sec?: number;
  };
  meta?: {
    eta_mode: "ml" | "calculative";
    hour_of_day: number;
  };
  event_log: Array<{
    ts: string;
    event: string;
    T_total_before_sec: number;
    T_total_after_sec: number;
    delta_sec: number;
  }>;
}

// SSE endpoint served by CH-3 ETA Engine
const SSE_URL = "http://localhost:8002/stream";

// Reconnect delay on SSE error (ms)
const RECONNECT_DELAY_MS = 3000;

// Max reconnect attempts before falling back to mock simulation
const MAX_RECONNECT_ATTEMPTS = 5;

const DEFAULT_MOCK: TransitSnapshot = {
  ts: Math.floor(Date.now() / 1000),
  vehicle: {
    lat: 12.9750,
    lon: 77.5980,
    leg: "outbound",
    progress: 0.45,
    source: "gnss",
    trip_id: "trip_outbound_1",
    block_id: "block_001"
  },
  outbound: {
    T_outbound_sec: 420
  },
  inbound: {
    trip_id: "trip_inbound_1",
    T_total_sec: 720,
    T_outbound_sec: 420,
    T_dwell_sec: 180,
    T_inbound_sec: 120,
    occupancy_band: "SEATS_AVAILABLE"
  },
  event_log: [
    {
      ts: new Date().toLocaleTimeString('en-US', { hour12: false }),
      event: "System initialized — block_001 active",
      T_total_before_sec: 720,
      T_total_after_sec: 720,
      delta_sec: 0
    }
  ]
};

export function useTransitStream() {
  const [data, setData] = useState<TransitSnapshot>(DEFAULT_MOCK);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const reconnectAttempts = useRef(0);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mock simulation fallback: ticks progress forward when SSE is unavailable
  const startMockSimulation = useCallback(() => {
    if (mockIntervalRef.current) return; // already running

    console.log("[useTransitStream] SSE unavailable — starting local mock simulation");

    let mockProgress = 0.0;
    let mockLeg: "outbound" | "dwell" | "inbound" = "outbound";

    mockIntervalRef.current = setInterval(() => {
      mockProgress += 0.005;

      if (mockProgress >= 1.0) {
        if (mockLeg === "outbound") {
          mockLeg = "dwell";
          mockProgress = 0.0;
        } else if (mockLeg === "dwell") {
          mockLeg = "inbound";
          mockProgress = 0.0;
        } else {
          mockLeg = "outbound";
          mockProgress = 0.0;
        }
      }

      // Interpolate lat/lon along the route
      const baseLat = 12.9716;
      const baseLon = 77.5946;
      const endLat = 12.9820;
      const endLon = 77.6050;

      const p = mockProgress;
      const lat = mockLeg === "inbound"
        ? endLat - (endLat - baseLat) * p
        : baseLat + (endLat - baseLat) * p;
      const lon = mockLeg === "inbound"
        ? endLon - (endLon - baseLon) * p
        : baseLon + (endLon - baseLon) * p;

      const T_outbound = Math.round(1500 * (1 - (mockLeg === "outbound" ? p : mockLeg === "dwell" ? 1 : 1)));
      const T_dwell = mockLeg === "dwell" ? Math.round(300 * (1 - p)) : mockLeg === "outbound" ? 300 : 0;
      const T_inbound = mockLeg === "inbound" ? Math.round(1500 * (1 - p)) : 1500;

      setData({
        ts: Math.floor(Date.now() / 1000),
        vehicle: {
          lat: Math.round(lat * 1e6) / 1e6,
          lon: Math.round(lon * 1e6) / 1e6,
          leg: mockLeg,
          progress: Math.round(p * 1000) / 1000,
          source: "gnss",
          trip_id: mockLeg === "inbound" ? "trip_inbound_1" : "trip_outbound_1",
          block_id: "block_001"
        },
        outbound: { T_outbound_sec: T_outbound },
        inbound: {
          trip_id: "trip_inbound_1",
          T_total_sec: T_outbound + T_dwell + T_inbound,
          T_outbound_sec: T_outbound,
          T_dwell_sec: T_dwell,
          T_inbound_sec: T_inbound,
          occupancy_band: "SEATS_AVAILABLE"
        },
        event_log: [{
          ts: new Date().toLocaleTimeString('en-US', { hour12: false }),
          event: "Mock simulation active (SSE unavailable)",
          T_total_before_sec: 0,
          T_total_after_sec: 0,
          delta_sec: 0
        }]
      });
    }, 1000);
  }, []);

  const stopMockSimulation = useCallback(() => {
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }
  }, []);

  const connectSSE = useCallback(() => {
    // Clean up existing connection
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    try {
      const es = new EventSource(SSE_URL);
      esRef.current = es;

      es.onopen = () => {
        console.log("[useTransitStream] SSE connected to CH-3 ETA Engine");
        setIsConnected(true);
        reconnectAttempts.current = 0;
        stopMockSimulation();
      };

      es.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          setData(parsed);
          setIsConnected(true);
        } catch (err) {
          console.error("[useTransitStream] Failed to parse SSE payload", err);
        }
      };

      es.onerror = () => {
        setIsConnected(false);
        es.close();
        esRef.current = null;

        reconnectAttempts.current += 1;
        console.log(`[useTransitStream] SSE disconnected (attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`);

        if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
          startMockSimulation();
        }

        // Always try to reconnect
        reconnectTimerRef.current = setTimeout(connectSSE, RECONNECT_DELAY_MS);
      };
    } catch (err) {
      setIsConnected(false);
      reconnectAttempts.current += 1;

      if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
        startMockSimulation();
      }

      reconnectTimerRef.current = setTimeout(connectSSE, RECONNECT_DELAY_MS);
    }
  }, [startMockSimulation, stopMockSimulation]);

  useEffect(() => {
    connectSSE();

    return () => {
      if (esRef.current) esRef.current.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      stopMockSimulation();
    };
  }, [connectSSE, stopMockSimulation]);

  return { data, isConnected };
}
