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

  // When Neon routes load, enrich the MTC Chennai agency with real route data
  useEffect(() => {
    if (neon.routes.length === 0) return;

    // Build enriched MTC Chennai agency from Neon DB routes
    const mtcAgency = AGENCY_PRESETS.find((a) => a.id === "mtc-chennai");
    if (!mtcAgency) return;

    const enrichedRoutes = neon.routes.map((r: NeonRoute) => {
      // Parse origin/destination from route_long_name (format: "Origin TO Destination")
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

    const enriched: TransitAgency = {
      ...mtcAgency,
      routes: enrichedRoutes,
    };

    // Auto-select MTC Chennai if it's already selected or on first load
    if (selectedAgency.id === "mtc-chennai" || selectedAgency.id === AGENCY_PRESETS[0].id) {
      setSelectedAgency(enriched);
    }
  }, [neon.routes]);

  // When user selects a route, fetch its stops from Neon DB and enrich coords
  const handleRouteSelect = useCallback(async (routeCode: string) => {
    // Find the route by code in the selected agency
    const route = selectedAgency.routes.find((r) => r.code === routeCode);
    if (!route || route.coords.length > 0) return; // already has coords

    const stops = await neon.fetchStopsForRoute(route.id);
    if (stops.length === 0) return;

    const enrichedCoords = stops.map((s: NeonStop) => ({
      id: s.stop_id,
      name: s.stop_name,
      lat: typeof s.stop_lat === "string" ? parseFloat(s.stop_lat) : s.stop_lat,
      lon: typeof s.stop_lon === "string" ? parseFloat(s.stop_lon) : s.stop_lon,
    }));

    // Update the agency with enriched route coords
    setSelectedAgency((prev) => ({
      ...prev,
      routes: prev.routes.map((r) =>
        r.id === route.id
          ? { ...r, coords: enrichedCoords, totalStops: enrichedCoords.length }
          : r
      ),
    }));
  }, [selectedAgency, neon.fetchStopsForRoute]);

  const handleSelectAgency = useCallback((agency: TransitAgency) => {
    setSelectedAgency(agency);
    // If selecting MTC Chennai, refetch routes from Neon
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
