import React, { useState, useEffect, useCallback } from "react";
import { useTransitStream } from "../lib/useTransitStream";
import { useNeonRoutes } from "../lib/useNeonRoutes";
import type { NeonRoute, NeonStop } from "../lib/useNeonRoutes";
import { ChaloHomeView } from "./ChaloHomeView";
import { AGENCY_PRESETS } from "../lib/agencies";
import type { TransitAgency } from "../lib/agencies";

export const DashboardApp: React.FC = () => {
  const { data, isConnected } = useTransitStream();
  const neon = useNeonRoutes();
  const [selectedAgency, setSelectedAgency] = useState<TransitAgency>(AGENCY_PRESETS[0]);

  // Load stops for a route and return formatted coords
  const loadRouteCoords = useCallback(async (routeId: string) => {
    const stops = await neon.fetchStopsForRoute(routeId);
    if (!stops || stops.length === 0) return [];

    return stops.map((s: NeonStop) => ({
      id: s.stop_id,
      name: s.stop_name,
      lat: typeof s.stop_lat === "string" ? parseFloat(s.stop_lat) : s.stop_lat,
      lon: typeof s.stop_lon === "string" ? parseFloat(s.stop_lon) : s.stop_lon,
    }));
  }, [neon.fetchStopsForRoute]);

  // When Neon routes load, enrich the MTC Chennai agency with real GTFS route & stop data
  useEffect(() => {
    if (neon.routes.length === 0) return;

    const mtcAgency = AGENCY_PRESETS.find((a) => a.id === "mtc-chennai");
    if (!mtcAgency) return;

    let isMounted = true;

    const initNeonRoutes = async () => {
      // Build basic routes from Neon DB
      const baseRoutes = neon.routes.map((r: NeonRoute) => {
        const parts = r.route_long_name.split(" TO ");
        const origin = parts[0]?.trim() || r.route_long_name;
        const destination = parts[1]?.trim() || "";

        return {
          id: r.route_id,
          code: r.route_short_name,
          name: `Route ${r.route_short_name}: ${r.route_long_name}`,
          origin,
          destination,
          fare: 25,
          totalStops: 0,
          durationMin: 30,
          coords: [] as Array<{ id: string; name: string; lat: number; lon: number }>,
        };
      });

      // Automatically load real stops for the first 2 routes so initial view is fully populated
      if (baseRoutes.length > 0) {
        const firstCoords = await loadRouteCoords(baseRoutes[0].id);
        baseRoutes[0].coords = firstCoords;
        baseRoutes[0].totalStops = firstCoords.length;
      }
      if (baseRoutes.length > 1) {
        const secondCoords = await loadRouteCoords(baseRoutes[1].id);
        baseRoutes[1].coords = secondCoords;
        baseRoutes[1].totalStops = secondCoords.length;
      }

      if (!isMounted) return;

      const enriched: TransitAgency = {
        ...mtcAgency,
        routes: baseRoutes,
      };

      setSelectedAgency(enriched);
    };

    initNeonRoutes();

    return () => {
      isMounted = false;
    };
  }, [neon.routes, loadRouteCoords]);

  // When user selects a route, lazy-load its stops from Neon DB
  const handleRouteSelect = useCallback(async (routeCode: string) => {
    const route = selectedAgency.routes.find((r) => r.code === routeCode);
    if (!route) return;

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
  }, [selectedAgency, loadRouteCoords]);

  const handleSelectAgency = useCallback((agency: TransitAgency) => {
    setSelectedAgency(agency);
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
        onSelectAgency={handleSelectAgency}
        neonRoutes={neon}
        onRouteSelect={handleRouteSelect}
      />
    </div>
  );
};
