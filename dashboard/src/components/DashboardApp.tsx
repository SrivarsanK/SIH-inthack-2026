import React, { useState, useEffect, useCallback } from "react";
import { useTransitStream } from "../lib/useTransitStream";
import { useNeonRoutes } from "../lib/useNeonRoutes";
import type { NeonRoute, NeonStop } from "../lib/useNeonRoutes";
import { ChaloHomeView } from "./ChaloHomeView";
import { AGENCY_PRESETS } from "../lib/agencies";
import type { TransitAgency } from "../lib/agencies";

const ACCURATE_CHENNAI_ROUTES: Record<string, Array<{ name: string; lat: number; lon: number }>> = {
  "S26": [
    { name: "Valasaravakkam", lat: 13.0400, lon: 80.1740 },
    { name: "Alwarthirunagar", lat: 13.0420, lon: 80.1800 },
    { name: "Kesavardhini", lat: 13.0430, lon: 80.1850 },
    { name: "SRM University / Ramapuram", lat: 13.0330, lon: 80.1800 },
    { name: "KK Nagar Depot", lat: 13.0380, lon: 80.1980 },
    { name: "Ashok Pillar", lat: 13.0355, lon: 80.2110 },
  ],
  "13311": [
    { name: "Valasaravakkam", lat: 13.0400, lon: 80.1740 },
    { name: "Alwarthirunagar", lat: 13.0420, lon: 80.1800 },
    { name: "Kesavardhini", lat: 13.0430, lon: 80.1850 },
    { name: "SRM University / Ramapuram", lat: 13.0330, lon: 80.1800 },
    { name: "KK Nagar Depot", lat: 13.0380, lon: 80.1980 },
    { name: "Ashok Pillar", lat: 13.0355, lon: 80.2110 },
  ],
  "21G": [
    { name: "Tambaram Sanatorium", lat: 12.9279, lon: 80.1214 },
    { name: "Chromepet", lat: 12.9516, lon: 80.1462 },
    { name: "Guindy Kathipara", lat: 13.0067, lon: 80.2020 },
    { name: "Saidapet", lat: 13.0213, lon: 80.2231 },
    { name: "T. Nagar Bus Stand", lat: 13.0418, lon: 80.2341 },
    { name: "MGR Central", lat: 13.0827, lon: 80.2707 },
    { name: "High Court / RGGGH", lat: 13.0864, lon: 80.2870 },
    { name: "Broadway Terminus", lat: 13.0891, lon: 80.2854 },
  ],
  "16917": [
    { name: "Tambaram Sanatorium", lat: 12.9279, lon: 80.1214 },
    { name: "Chromepet", lat: 12.9516, lon: 80.1462 },
    { name: "Guindy Kathipara", lat: 13.0067, lon: 80.2020 },
    { name: "Saidapet", lat: 13.0213, lon: 80.2231 },
    { name: "T. Nagar Bus Stand", lat: 13.0418, lon: 80.2341 },
    { name: "MGR Central", lat: 13.0827, lon: 80.2707 },
    { name: "High Court / RGGGH", lat: 13.0864, lon: 80.2870 },
    { name: "Broadway Terminus", lat: 13.0891, lon: 80.2854 },
  ],
  "570": [
    { name: "CMBT Koyambedu", lat: 13.0694, lon: 80.1948 },
    { name: "Vadapalani", lat: 13.0500, lon: 80.2120 },
    { name: "Guindy Kathipara", lat: 13.0067, lon: 80.2020 },
    { name: "Velachery Railway", lat: 12.9781, lon: 80.2198 },
    { name: "Perungudi OMR", lat: 12.9650, lon: 80.2450 },
    { name: "Siruseri IT Park", lat: 12.8284, lon: 80.2185 },
  ],
  "15421": [
    { name: "CMBT Koyambedu", lat: 13.0694, lon: 80.1948 },
    { name: "Vadapalani", lat: 13.0500, lon: 80.2120 },
    { name: "Guindy Kathipara", lat: 13.0067, lon: 80.2020 },
    { name: "Velachery Railway", lat: 12.9781, lon: 80.2198 },
    { name: "Perungudi OMR", lat: 12.9650, lon: 80.2450 },
    { name: "Siruseri IT Park", lat: 12.8284, lon: 80.2185 },
  ],
  "101": [
    { name: "Thiruvottiyur B.T.", lat: 13.1610, lon: 80.3010 },
    { name: "Royapuram", lat: 13.1050, lon: 80.2910 },
    { name: "Parrys / High Court", lat: 13.0864, lon: 80.2870 },
    { name: "MGR Central", lat: 13.0827, lon: 80.2707 },
    { name: "Aminjikarai", lat: 13.0740, lon: 80.2180 },
    { name: "CMBT Koyambedu", lat: 13.0694, lon: 80.1948 },
  ],
  "26G R": [
    { name: "CMBT Koyambedu", lat: 13.0694, lon: 80.1948 },
    { name: "Vadapalani Matrix", lat: 13.0500, lon: 80.2120 },
    { name: "Ashok Pillar", lat: 13.0355, lon: 80.2110 },
    { name: "KK Nagar Depot", lat: 13.0380, lon: 80.1980 },
    { name: "SRM University / Ramapuram", lat: 13.0330, lon: 80.1800 },
    { name: "Ramapuram Ashram", lat: 13.0350, lon: 80.1820 },
  ],
  "S86": [
    { name: "Porur Junction", lat: 13.0350, lon: 80.1580 },
    { name: "DLF IT Park", lat: 13.0280, lon: 80.1690 },
    { name: "L N P Kovil Ramapuram", lat: 13.0310, lon: 80.1810 },
    { name: "SRM University", lat: 13.0330, lon: 80.1800 },
    { name: "Guindy Metro Station", lat: 13.0067, lon: 80.2020 },
  ],
  "70CCT R": [
    { name: "CMBT Koyambedu", lat: 13.0694, lon: 80.1948 },
    { name: "Vadapalani", lat: 13.0500, lon: 80.2120 },
    { name: "Ashok Pillar", lat: 13.0355, lon: 80.2110 },
    { name: "Guindy Kathipara", lat: 13.0067, lon: 80.2020 },
    { name: "Chromepet", lat: 12.9516, lon: 80.1462 },
    { name: "Tambaram Sanatorium", lat: 12.9279, lon: 80.1214 },
    { name: "Kilambakkam KCBT Terminus", lat: 12.8350, lon: 80.0510 },
  ],
};

function generateFallbackChennaiCoords(routeCode: string) {
  const cleanCode = formatBusShortName(routeCode);
  const accurateStops = ACCURATE_CHENNAI_ROUTES[cleanCode] || ACCURATE_CHENNAI_ROUTES[routeCode];

  if (accurateStops) {
    return accurateStops.map((stop, idx) => ({
      id: `fb-${cleanCode}-${idx}`,
      name: stop.name,
      lat: stop.lat,
      lon: stop.lon,
    }));
  }

  return CHENNAI_HUBS.map((hub, idx) => ({
    id: `fb-${routeCode}-${idx}`,
    name: hub.name,
    lat: hub.lat + (idx % 2 === 0 ? 0.002 : -0.002),
    lon: hub.lon + (idx % 2 === 0 ? -0.002 : 0.002),
  }));
}

export function formatBusShortName(codeOrId?: string): string {
  if (!codeOrId) return "S26";
  const clean = codeOrId.replace(/-dir[01]$/, "").trim();
  if (clean === "13311") return "S26";
  if (clean === "16917") return "21G";
  if (clean === "15421") return "570";
  return clean;
}

export const DashboardApp: React.FC = () => {
  const { data, isConnected } = useTransitStream();
  const neon = useNeonRoutes();
  const [selectedAgency, setSelectedAgency] = useState<TransitAgency>(AGENCY_PRESETS[0]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>("mtc-21g");

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
        const displayCode = formatBusShortName(r.canonical_code || r.route_short_name || r.route_id);

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

      // Automatically load real stops for all routes from Neon DB
      await Promise.all(
        enrichedRoutes.slice(0, 10).map(async (r) => {
          const coords = await loadRouteCoords(r.id);
          if (coords.length > 0) {
            r.coords = coords;
            r.totalStops = coords.length;
          }
        })
      );

      if (!isMounted) return;

      const enriched: TransitAgency = {
        ...mtcAgency,
        routes: enrichedRoutes,
      };

      setSelectedAgency(enriched);
      if (enrichedRoutes.length > 0) {
        const defaultRoute = enrichedRoutes.find((r) => r.code === "S26" || r.id === "S26") || enrichedRoutes[0];
        setSelectedRouteId((prev) => (prev && prev !== "mtc-21g" ? prev : defaultRoute.id));
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
        const cleanCode = formatBusShortName(routeIdOrCode);

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
