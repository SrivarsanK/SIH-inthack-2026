import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = "http://localhost:8002";

export interface NeonRoute {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: number;
  agency_id: number;
  // Normalized fields from the transit data normalization pipeline
  canonical_code?: string;     // base route code with CT/service suffixes stripped
  origin?: string;             // deterministically inferred from MIN stop_sequence
  destination?: string;        // deterministically inferred from MAX stop_sequence
  is_cut_trip?: boolean;       // true if route_short_name contains CT suffix
  service_class?: string;      // Deluxe / Ordinary / Express / AC etc.
}

export interface NeonStop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  stop_sequence?: number;
  arrival_time?: string;
}

interface RouteStopsCache {
  [routeId: string]: NeonStop[];
}

export function useNeonRoutes() {
  const [routes, setRoutes] = useState<NeonRoute[]>([]);
  const [totalRoutes, setTotalRoutes] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<NeonRoute[]>([]);
  const [stopSearchResults, setStopSearchResults] = useState<NeonStop[]>([]);
  const stopsCache = useRef<RouteStopsCache>({});

  // Fetch paginated routes
  const fetchRoutes = useCallback(async (page: number = 1, limit: number = 50) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/routes?page=${page}&limit=${limit}`);
      const data = await res.json();
      if (data.routes) {
        setRoutes(data.routes);
        setTotalRoutes(data.total || 0);
        setCurrentPage(data.page || 1);
        setTotalPages(data.pages || 1);
      }
    } catch (err) {
      console.error("[useNeonRoutes] Failed to fetch routes:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch stops for a specific route (with optional direction=0 or 1)
  const fetchStopsForRoute = useCallback(async (routeId: string, direction?: number): Promise<NeonStop[]> => {
    const cacheKey = direction !== undefined ? `${routeId}-d${direction}` : routeId;
    if (stopsCache.current[cacheKey]) {
      return stopsCache.current[cacheKey];
    }
    try {
      const url = direction !== undefined 
        ? `${API_BASE}/api/routes/${routeId}/stops?direction=${direction}`
        : `${API_BASE}/api/routes/${routeId}/stops`;
      const res = await fetch(url);
      const data = await res.json();
      const stops: NeonStop[] = data.stops || [];
      stopsCache.current[cacheKey] = stops;
      return stops;
    } catch (err) {
      console.error(`[useNeonRoutes] Failed to fetch stops for route ${routeId}:`, err);
      return [];
    }
  }, []);

  // Search routes
  const searchRoutes = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/routes/search?q=${encodeURIComponent(query)}&limit=20`);
      const data = await res.json();
      setSearchResults(data.routes || []);
    } catch (err) {
      console.error("[useNeonRoutes] Search failed:", err);
      setSearchResults([]);
    }
  }, []);

  // Search stops
  const searchStops = useCallback(async (query: string) => {
    if (!query.trim()) {
      setStopSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/stops/search?q=${encodeURIComponent(query)}&limit=20`);
      const data = await res.json();
      setStopSearchResults(data.stops || []);
    } catch (err) {
      console.error("[useNeonRoutes] Stop search failed:", err);
      setStopSearchResults([]);
    }
  }, []);

  // Load initial routes on mount
  useEffect(() => {
    fetchRoutes(1, 50);
  }, [fetchRoutes]);

  return {
    routes,
    totalRoutes,
    currentPage,
    totalPages,
    isLoading,
    searchResults,
    stopSearchResults,
    fetchRoutes,
    fetchStopsForRoute,
    searchRoutes,
    searchStops,
  };
}
