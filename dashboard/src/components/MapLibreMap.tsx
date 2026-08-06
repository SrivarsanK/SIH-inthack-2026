import React, { useEffect, useRef, useState } from "react";
import type { TransitSnapshot } from "../lib/useTransitStream";
import type { TransitAgency } from "../lib/agencies";
import { Gauge, ShieldCheck, Plus, Minus, RefreshCw, Compass, Layers } from "lucide-react";
import * as turf from "@turf/turf";

interface MapLibreMapProps {
  data: TransitSnapshot;
  selectedAgency?: TransitAgency;
  searchedLocation?: { name: string; lat: number; lon: number } | null;
}

const DEFAULT_STOPS = [
  { id: "S1", name: "Station A (Origin)", lat: 12.9716, lon: 77.5946 },
  { id: "S2", name: "Stop 2", lat: 12.9740, lon: 77.5970 },
  { id: "S3", name: "Stop 3", lat: 12.9760, lon: 77.5990 },
  { id: "S4", name: "Stop 4", lat: 12.9780, lon: 77.6010 },
  { id: "S5", name: "Stop 5", lat: 12.9800, lon: 77.6030 },
  { id: "S6", name: "Station B (Terminal)", lat: 12.9820, lon: 77.6050 },
];

export const MapLibreMap: React.FC<MapLibreMapProps> = ({ data, selectedAgency, searchedLocation }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const [activeStopIndex, setActiveStopIndex] = useState<number>(0);
  const [is3DMode, setIs3DMode] = useState<boolean>(false);

  const activeRoute = selectedAgency?.routes[0];
  const stops = activeRoute?.coords || DEFAULT_STOPS;
  const initialCenter: [number, number] = [stops[0].lon, stops[0].lat];

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let maplibregl: any = null;

    const initMap = async () => {
      const mod = await import("maplibre-gl");
      maplibregl = mod.default || mod;
      await import("maplibre-gl/dist/maplibre-gl.css");

      if (mapRef.current) return;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: "https://tiles.openfreemap.org/styles/dark", // OpenFreeMap commercial-free tile server
        center: initialCenter,
        zoom: 13.5,
        pitch: is3DMode ? 45 : 0,
        bearing: 0,
        attributionControl: false
      });

      map.on("load", () => {
        // Add Route Line GeoJSON Source
        const coordinates = stops.map(s => [s.lon, s.lat]);
        map.addSource("route-source", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates
            },
            properties: {}
          }
        });

        // Add Outer Glow Polyline Layer
        map.addLayer({
          id: "route-glow",
          type: "line",
          source: "route-source",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": selectedAgency?.accentColor || "#3b82f6",
            "line-width": 8,
            "line-opacity": 0.35
          }
        });

        // Add Main Active Polyline Layer
        map.addLayer({
          id: "route-main",
          type: "line",
          source: "route-source",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#60a5fa",
            "line-width": 4,
            "line-opacity": 0.95
          }
        });

        // Add Stop Points Source & Layer
        const stopFeatures = stops.map((stop, i) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [stop.lon, stop.lat] },
          properties: { name: stop.name, index: i + 1 }
        }));

        map.addSource("stops-source", {
          type: "geojson",
          data: { type: "FeatureCollection", features: stopFeatures }
        });

        map.addLayer({
          id: "stops-layer",
          type: "circle",
          source: "stops-source",
          paint: {
            "circle-radius": 8,
            "circle-color": "#0284c7",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff"
          }
        });

        // Create Animated Vehicle Marker
        const el = document.createElement("div");
        el.className = "custom-vehicle-marker";
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div class="absolute -inset-3 rounded-full bg-blue-500/30 animate-ping"></div>
            <div class="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 border-2 border-white text-white flex items-center justify-center shadow-2xl">
              <span class="text-base">🚌</span>
            </div>
          </div>
        `;

        const vehicleMarker = new maplibregl.Marker({ element: el })
          .setLngLat(initialCenter)
          .addTo(map);

        markerRef.current = vehicleMarker;
      });

      mapRef.current = map;
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [selectedAgency?.id]);

  // Turf.js Turf-Interpolated Animation Loop (60 FPS)
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;

    const coordinates = stops.map(s => [s.lon, s.lat]);
    if (coordinates.length < 2) return;

    const line = turf.lineString(coordinates);
    const lineDistance = turf.length(line, { units: "kilometers" });

    // Turf progress calculation based on telemetry progress
    const targetDistance = lineDistance * Math.min(1, Math.max(0, data.vehicle.progress));
    const sliced = turf.along(line, targetDistance, { units: "kilometers" });
    const targetCoords = sliced.geometry.coordinates;

    markerRef.current.setLngLat(targetCoords as [number, number]);
  }, [data.vehicle.progress, stops]);

  // Handle searched location pan
  useEffect(() => {
    if (searchedLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [searchedLocation.lon, searchedLocation.lat],
        zoom: 15,
        speed: 1.2
      });
    }
  }, [searchedLocation]);

  const toggle3D = () => {
    if (!mapRef.current) return;
    const next3D = !is3DMode;
    setIs3DMode(next3D);
    mapRef.current.easeTo({
      pitch: next3D ? 50 : 0,
      duration: 1000
    });
  };

  const handleZoom = (type: "in" | "out" | "reset") => {
    if (!mapRef.current) return;
    if (type === "in") mapRef.current.zoomIn();
    if (type === "out") mapRef.current.zoomOut();
    if (type === "reset") mapRef.current.flyTo({ center: initialCenter, zoom: 13.5, pitch: 0 });
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col group z-0">
      {/* Top Left Overlay: Vector Engine Info */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-white flex items-center gap-2.5 shadow-2xl">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse shadow-sm shadow-blue-400" />
          <span>{selectedAgency ? `${selectedAgency.shortName} · ${activeRoute?.code}` : "MapLibre Vector Engine"}</span>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-slate-800/80 text-[11px] text-slate-300 flex items-center gap-3 shadow-lg">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono font-bold">OpenFreeMap · Turf.js Interpolated</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold">WebGL 60FPS</span>
          </div>
        </div>
      </div>

      {/* Top Right Overlay: Map Control Buttons */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-2xl">
        <button
          onClick={toggle3D}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-md active:scale-95 ${
            is3DMode ? "bg-blue-600 text-white" : "bg-slate-800 hover:bg-blue-600 text-slate-200"
          }`}
          title="Toggle 3D View"
        >
          <Compass className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom("in")}
          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white flex items-center justify-center transition-all shadow-md active:scale-95"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom("out")}
          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white flex items-center justify-center transition-all shadow-md active:scale-95"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom("reset")}
          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white flex items-center justify-center transition-all shadow-md active:scale-95"
          title="Reset Map View"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Overlay: Stop Selector Ribbon */}
      <div className="absolute bottom-4 left-4 right-4 z-10 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 shadow-2xl flex items-center justify-between overflow-x-auto gap-2 custom-scrollbar">
        {stops.map((stop, i) => (
          <button
            key={stop.id}
            onClick={() => {
              setActiveStopIndex(i);
              if (mapRef.current) {
                mapRef.current.flyTo({ center: [stop.lon, stop.lat], zoom: 15 });
              }
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap transition-all ${
              activeStopIndex === i
                ? "bg-blue-600 text-white border-blue-400 shadow-md"
                : "bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-800"
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] flex items-center justify-center">
              {i + 1}
            </span>
            <span>{stop.name}</span>
          </button>
        ))}
      </div>

      <div ref={mapContainerRef} className="w-full h-full min-h-[440px] z-0" />
    </div>
  );
};
