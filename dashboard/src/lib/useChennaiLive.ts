/**
 * useChennaiLive — Real-time Google Transit GTFS-Realtime hook for Chennai.
 *
 * Consumes /api/live/chennai (derived from GTFS-RT VehiclePositions & TripUpdates).
 * Provides live telemetry, speeds, bearings, stop ETAs, and passenger density.
 */
import { useState, useEffect, useCallback, useRef } from "react";

export interface ChennaiLiveVehicle {
  vehicle_id: string;
  vehicle_label: string;
  license_plate: string;
  city: string;
  agency: string;
  provider: string;
  route_id: string;
  route_code: string;
  route_name: string;
  origin: string;
  destination: string;
  direction_id: number;
  direction_label: string;
  lat: number;
  lon: number;
  bearing: number;
  speed_kmh: number;
  progress_percent: number;
  current_stop_sequence: number;
  next_stop_id: string;
  next_stop_name: string;
  eta_next_stop_sec: number;
  eta_next_stop_min: number;
  occupancy_band: "SEATS_AVAILABLE" | "MODERATE" | "STANDING_ROOM" | "VERY_CROWDED";
  delay_sec: number;
  gps_fix: boolean;
  updated_at: string;
}

const API_BASE = "http://localhost:8002";
const POLL_INTERVAL_MS = 2000;

export function useChennaiLive(enabled: boolean = true) {
  const [chennaiBuses, setChennaiBuses] = useState<ChennaiLiveVehicle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchLive = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${API_BASE}/api/live/chennai`, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.buses && Array.isArray(json.buses)) {
        setChennaiBuses(json.buses);
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    setIsLoading(true);
    fetchLive().finally(() => setIsLoading(false));

    const timer = setInterval(fetchLive, POLL_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [enabled, fetchLive]);

  return {
    chennaiBuses,
    isLoading,
    lastUpdated,
    error,
    refetch: fetchLive,
  };
}
