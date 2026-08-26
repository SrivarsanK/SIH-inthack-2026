/**
 * useDelhiLive — Real-time Delhi OTD GTFS-Realtime bus positions hook.
 *
 * Polls GET /api/live/delhi?limit=100 every 5s (OTD refreshes ~15s).
 * Returns real vehicle positions from 4800+ DTC/Cluster buses.
 * No mock data — if backend is down, returns empty array.
 */
import { useState, useEffect, useCallback, useRef } from "react";

export interface DelhiLiveBus {
  bus_id: string;
  vehicle_label: string;
  city: string;
  agency: string;
  provider: string;
  route_id: string;
  trip_id: string;
  direction_id: number;
  direction_label: string;
  lat: number;
  lon: number;
  bearing: number;
  speed_kmh: number;
  nearest_stop_id: string;
  nearest_stop_name: string;
  nearest_stop_dist_km: number;
  eta_nearest_stop_sec: number;
  eta_nearest_stop_min: number;
  gps_fix: boolean;
  gps_timestamp: number;
  current_status: number;
  schedule_relationship: number;
  updated_at: string;
  // Added by nearby endpoint
  distance_km?: number;
}

export interface DelhiLiveStats {
  total_vehicles: number;
  total_routes: number;
  feed_timestamp: number;
  last_fetch_ts: number;
  poll_interval_sec: number;
  fetch_error: string | null;
  api_source: string;
  provider: string;
}

const API_BASE = "http://localhost:8002";
const POLL_INTERVAL_MS = 5000; // 5s poll (OTD feed refreshes every ~15s)
const DEFAULT_LIMIT = 100; // Cap for map rendering performance

export function useDelhiLive(enabled: boolean = true, limit: number = DEFAULT_LIMIT) {
  const [delhiBuses, setDelhiBuses] = useState<DelhiLiveBus[]>([]);
  const [stats, setStats] = useState<DelhiLiveStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchLive = useCallback(async () => {
    // Abort previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const url = `${API_BASE}/api/live/delhi${limit > 0 ? `?limit=${limit}` : ""}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.buses && Array.isArray(json.buses)) {
        setDelhiBuses(json.buses);
        setLastUpdated(new Date());
        setError(null);
        setStats({
          total_vehicles: json.total_active_buses || json.buses.length,
          total_routes: json.total_routes || 0,
          feed_timestamp: json.feed_timestamp || 0,
          last_fetch_ts: Date.now() / 1000,
          poll_interval_sec: POLL_INTERVAL_MS / 1000,
          fetch_error: null,
          api_source: json.source || "https://otd.delhi.gov.in",
          provider: json.provider || "Delhi Open Transit Data (OTD)",
        });
      }
    } catch (err: any) {
      if (err.name === "AbortError") return; // Intentional abort
      console.warn("[useDelhiLive] fetch failed:", err.message);
      setError(err.message);
      // Don't clear existing buses on transient error — stale data > no data
    }
  }, [limit]);

  useEffect(() => {
    if (!enabled) {
      setDelhiBuses([]);
      setStats(null);
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
    delhiBuses,
    stats,
    isLoading,
    lastUpdated,
    error,
    refetch: fetchLive,
  };
}


/**
 * Fetch buses near a specific GPS coordinate (for stop-centric view).
 */
export async function fetchDelhiNearby(
  lat: number,
  lon: number,
  radiusKm: number = 2.0
): Promise<DelhiLiveBus[]> {
  try {
    const res = await fetch(
      `${API_BASE}/api/live/delhi/nearby?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json.buses || [];
  } catch {
    return [];
  }
}


/**
 * Fetch all vehicles on a specific OTD route.
 */
export async function fetchDelhiRouteVehicles(
  routeId: string
): Promise<DelhiLiveBus[]> {
  try {
    const res = await fetch(`${API_BASE}/api/live/delhi/route/${routeId}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.buses || [];
  } catch {
    return [];
  }
}
