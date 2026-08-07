import React, { useState, useEffect, useCallback } from "react";
import { useTransitStream } from "../lib/useTransitStream";
import { useNeonRoutes } from "../lib/useNeonRoutes";
import type { NeonRoute, NeonStop } from "../lib/useNeonRoutes";
import { ChaloHomeView } from "./ChaloHomeView";
import { AGENCY_PRESETS } from "../lib/agencies";
import type { TransitAgency } from "../lib/agencies";

const CHENNAI_HUBS = [
  { name: "Broadway Terminus", lat: 13.0891, lon: 80.2854 },
  { name: "High Court / RGGGH", lat: 13.0864, lon: 80.2870 },
  { name: "MGR Central", lat: 13.0827, lon: 80.2707 },
  { name: "T. Nagar Bus Stand", lat: 13.0418, lon: 80.2341 },
  { name: "Saidapet", lat: 13.0213, lon: 80.2231 },
  { name: "Guindy Kathipara", lat: 13.0067, lon: 80.2020 },
  { name: "Chromepet", lat: 12.9516, lon: 80.1462 },
  { name: "Tambaram Sanatorium", lat: 12.9279, lon: 80.1214 },
];

function generateFallbackChennaiCoords(routeCode: string) {
  return CHENNAI_HUBS.map((hub, idx) => ({
    id: `fb-${routeCode}-${idx}`,
    name: hub.name,
    lat: hub.lat + (idx % 2 === 0 ? 0.002 : -0.002),
    lon: hub.lon + (idx % 2 === 0 ? -0.002 : 0.002),
  }));
}

export const DashboardApp: React.FC = () => {
  const { data, isConnected } = useTransitStream();
  const neon = useNeonRoutes();
  const [selectedAgency, setSelectedAgency] = useState<TransitAgency>(AGENCY_PRESETS[0]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // Load stops for a route and return formatted coords
  const loadRouteCoords = useCallback(async (routeId: string) => {
    const stops = await neon.fetchStopsForRoute(routeId);
    if (stops && stops.length > 0) {
      return stops.map((s: NeonStop) => ({
        id: s.stop_id,
        name: s.stop_name,
        lat: typeof s.stop_lat === "string" ? parseFloat(s.stop_lat) : s.stop_lat,
        lon: typeof s.stop_lon === "string" ? parseFloat(s.stop_lon) : s.stop_lon,
      }));
    }
    return generateFallbackChennaiCoords(routeId);
  }, [neon.fetchStopsForRoute]);

  // When Neon routes load, enrich the MTC Chennai agency with real GTFS route & stop data
  useEffect(() => {
    if (neon.routes.length === 0) return;

    const mtcAgency = AGENCY_PRESETS.find((a) => a.id === "mtc-chennai");
    if (!mtcAgency) return;

    let isMounted = true;

    const initNeonRoutes = async () => {
      // Build basic routes from Neon DB
      const enrichedRoutes = neon.routes.map((r: NeonRoute) => {
        // Use deterministically-inferred terminus from stop_times (MIN/MAX stop_sequence)
        // Falls back to parsing route_long_name if terminus data unavailable
        const origin = r.origin || r.route_long_name.split(" TO ")[0]?.trim() || r.route_long_name;
        const destination = r.destination || r.route_long_name.split(" TO ")[1]?.trim() || "";
        const displayCode = r.canonical_code || r.route_short_name;

        return {
          id: r.route_id,
          code: displayCode,
          name: `Bus ${displayCode}: ${origin} → ${destination}`,
          origin,
          destination,
          fare: 25,
          totalStops: 0,
          durationMin: 30,
          coords: [] as Array<{ id: string; name: string; lat: number; lon: number }>,
        };
      });

      // Automatically load real stops for the first 2 routes so initial view is fully populated
      if (enrichedRoutes.length > 0) {
        const firstCoords = await loadRouteCoords(enrichedRoutes[0].id);
        enrichedRoutes[0].coords = firstCoords;
        enrichedRoutes[0].totalStops = firstCoords.length;
      }
      if (enrichedRoutes.length > 1) {
        const secondCoords = await loadRouteCoords(enrichedRoutes[1].id);
        enrichedRoutes[1].coords = secondCoords;
        enrichedRoutes[1].totalStops = secondCoords.length;
      }

      if (!isMounted) return;

      const enriched: TransitAgency = {
        ...mtcAgency,
        routes: enrichedRoutes,
      };

      setSelectedAgency(enriched);
      if (enrichedRoutes.length > 0) {
        setSelectedRouteId(enrichedRoutes[0].id);
      }
    };

    initNeonRoutes();

    return () => {
      isMounted = false;
    };
  }, [neon.routes, loadRouteCoords]);

  // When user selects a route (by routeId or code), lazy-load stops from Neon DB and set selectedRouteId
  const handleRouteSelect = useCallback(async (routeIdOrCode: string) => {
    // Match by route_id first (from search results), fall back to code match
    let route = selectedAgency.routes.find(
      (r) => r.id === routeIdOrCode || r.code === routeIdOrCode
    );

    // If route is not in initial preset list (searched from Neon DB), fetch stops & dynamically construct it
    if (!route) {
      const fetchedCoords = await loadRouteCoords(routeIdOrCode);
      if (fetchedCoords.length > 0) {
        const origin = fetchedCoords[0].name;
        const destination = fetchedCoords[fetchedCoords.length - 1].name;
        const cleanCode = routeIdOrCode.replace(/-dir[01]$/, "");

        const dynamicRoute = {
          id: routeIdOrCode,
          code: cleanCode,
          name: `Bus ${cleanCode}: ${origin} → ${destination}`,
          origin,
          destination,
          fare: 25,
          totalStops: fetchedCoords.length,
          durationMin: 30,
          coords: fetchedCoords,
        };

        setSelectedAgency((prev) => ({
          ...prev,
          routes: [dynamicRoute, ...prev.routes],
        }));

        setSelectedRouteId(routeIdOrCode);
        return;
      }
    }

    if (route) {
      setSelectedRouteId(route.id);

      if (route.coords.length === 0) {
        const enrichedCoords = await loadRouteCoords(route.id);
        if (enrichedCoords.length > 0) {
          setSelectedAgency((prev) => ({
            ...prev,
            routes: prev.routes.map((r) =>
              r.id === route.id
                ? { ...r, coords: enrichedCoords, totalStops: enrichedCoords.length }
                : r
            ),
          }));
        }
      }
    }
  }, [selectedAgency, loadRouteCoords]);

  const handleSelectAgency = useCallback((agency: TransitAgency) => {
    setSelectedAgency(agency);
    if (agency.routes.length > 0) {
      setSelectedRouteId(agency.routes[0].id);
    }
    if (agency.id === "mtc-chennai") {
      neon.fetchRoutes(1, 50);
    }
  }, [neon.fetchRoutes]);

  return (
    <div className="min-h-screen bg-transparent font-sans antialiased text-slate-900">
      <ChaloHomeView
        data={data}
        isConnected={isConnected}
        selectedAgency={selectedAgency}
        selectedRouteId={selectedRouteId}
        onSelectAgency={handleSelectAgency}
        neonRoutes={neon}
        onRouteSelect={handleRouteSelect}
      />
    </div>
  );
};
