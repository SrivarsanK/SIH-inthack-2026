import React, { useEffect, useRef } from "react";
import type { TransitSnapshot } from "../lib/useTransitStream";

interface LiveMapProps {
  data: TransitSnapshot;
}

const ROUTE_STOPS = [
  { name: "Station A", lat: 12.9716, lon: 77.5946 },
  { name: "Stop 2", lat: 12.9740, lon: 77.5970 },
  { name: "Stop 3", lat: 12.9760, lon: 77.5990 },
  { name: "Stop 4", lat: 12.9780, lon: 77.6010 },
  { name: "Stop 5", lat: 12.9800, lon: 77.6030 },
  { name: "Station B", lat: 12.9820, lon: 77.6050 },
];

export const LiveMap: React.FC<LiveMapProps> = ({ data }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let L: any = null;

    const initMap = async () => {
      L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (mapInstanceRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [12.9768, 77.5998],
        zoom: 14,
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd"
      }).addTo(map);

      // Route Polyline
      const polylineCoords = ROUTE_STOPS.map(s => [s.lat, s.lon]);
      L.polyline(polylineCoords, {
        color: "#3b82f6",
        weight: 5,
        opacity: 0.8,
        dashArray: "8, 12"
      }).addTo(map);

      // Stop Markers
      ROUTE_STOPS.forEach((stop, i) => {
        const isTerminal = i === 0 || i === ROUTE_STOPS.length - 1;
        const iconHtml = `
          <div class="flex items-center justify-center w-6 h-6 rounded-full ${isTerminal ? 'bg-blue-600 text-white font-bold text-xs ring-4 ring-blue-500/20' : 'bg-slate-800 text-white font-semibold border border-slate-600 text-[10px]'} shadow-lg">
            ${i + 1}
          </div>
        `;
        const customIcon = L.divIcon({
          html: iconHtml,
          className: "custom-stop-icon",
          iconSize: [24, 24]
        });

        L.marker([stop.lat, stop.lon], { icon: customIcon })
          .addTo(map)
          .bindPopup(`<div class="text-slate-900 font-sans p-1"><strong>${stop.name}</strong></div>`);
      });

      // Vehicle Marker
      const busIconHtml = `
        <div class="relative group">
          <div class="absolute -inset-2 rounded-full bg-blue-500/30 animate-ping"></div>
          <div class="relative w-10 h-10 rounded-xl bg-blue-600 border-2 border-white text-white flex items-center justify-center shadow-2xl transform transition-transform duration-500">
            🚌
          </div>
        </div>
      `;
      const busIcon = L.divIcon({
        html: busIconHtml,
        className: "custom-bus-icon",
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const marker = L.marker([data.vehicle.lat, data.vehicle.lon], { icon: busIcon }).addTo(map);
      markerRef.current = marker;
      mapInstanceRef.current = map;
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update marker position dynamically
  useEffect(() => {
    if (markerRef.current && data.vehicle.lat && data.vehicle.lon) {
      markerRef.current.setLatLng([data.vehicle.lat, data.vehicle.lon]);
    }
  }, [data.vehicle.lat, data.vehicle.lon]);

  const legLabel = data.vehicle.leg === "outbound"
    ? "OUTBOUND — Completing Prior Route (Station A → B)"
    : data.vehicle.leg === "dwell"
    ? "TERMINAL HALT — Scheduled Driver Rest & Turnaround"
    : "INBOUND — En Route To Your Stop (Station B → A)";

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl flex flex-col">
      <div className="absolute top-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-2 shadow-xl">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
        <span>{legLabel}</span>
      </div>

      <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-lg border border-slate-800 text-xs text-slate-400 flex items-center gap-3 shadow-xl">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-blue-500 rounded" />
          <span>Route Line 101</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Source: {data.vehicle.source.toUpperCase()}</span>
        </div>
      </div>

      <div ref={mapContainerRef} className="w-full h-full min-h-[420px]" />
    </div>
  );
};
