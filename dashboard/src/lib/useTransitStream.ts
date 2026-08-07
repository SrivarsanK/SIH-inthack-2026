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
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        setIsConnected(true);
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
        if (esRef.current) {
          esRef.current.close();
          esRef.current = null;
        }
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(connectSSE, RECONNECT_DELAY_MS);
      };
    } catch (err) {
      setIsConnected(false);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(connectSSE, RECONNECT_DELAY_MS);
    }
  }, []);

  useEffect(() => {
    connectSSE();

    return () => {
      if (esRef.current) esRef.current.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [connectSSE]);

  return { data, isConnected };
}
