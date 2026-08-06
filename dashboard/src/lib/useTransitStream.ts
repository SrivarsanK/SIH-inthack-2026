import { useState, useEffect } from "react";

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

  useEffect(() => {
    let es: EventSource | null = null;

    try {
      es = new EventSource("http://localhost:8002/stream");
      
      es.onopen = () => {
        setIsConnected(true);
      };

      es.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          setData(parsed);
          setIsConnected(true);
        } catch (err) {
          console.error("Failed to parse SSE payload", err);
        }
      };

      es.onerror = () => {
        setIsConnected(false);
      };
    } catch (err) {
      setIsConnected(false);
    }

    return () => {
      if (es) es.close();
    };
  }, []);

  return { data, isConnected };
}
