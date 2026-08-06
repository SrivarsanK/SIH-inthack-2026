import React, { useEffect, useRef, useState } from "react";
import type { TransitSnapshot } from "../lib/useTransitStream";
import { Navigation, Gauge, ShieldCheck, Layers, Plus, Minus, Maximize2, RefreshCw } from "lucide-react";

interface LiveMapProps {
  data: TransitSnapshot;
}

const ROUTE_STOPS = [
  { id: "S1", name: "Station A (Origin)", lat: 12.9716, lon: 77.5946 },
  { id: "S2", name: "Stop 2", lat: 12.9740, lon: 77.5970 },
  { id: "S3", name: "Stop 3", lat: 12.9760, lon: 77.5990 },
  { id: "S4", name: "Stop 4", lat: 12.9780, lon: 77.6010 },
  { id: "S5", name: "Stop 5", lat: 12.9800, lon: 77.6030 },
  { id: "S6", name: "Station B (Terminal)", lat: 12.9820, lon: 77.6050 },
];

export const LiveMap: React.FC<LiveMapProps> = ({ data }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [activeStopIndex, setActiveStopIndex] = useState<number>(0);

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

      // CartoDB Dark Matter tiles
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd"
      }).addTo(map);

      // Glowing Polyline
      const polylineCoords = ROUTE_STOPS.map(s => [s.lat, s.lon]);
      
      // Outer glow line
      L.polyline(polylineCoords, {
        color: "#3b82f6",
        weight: 8,
        opacity: 0.3,
        lineCap: "round"
      }).addTo(map);

      // Main active line
      L.polyline(polylineCoords, {
        color: "#60a5fa",
        weight: 4,
        opacity: 0.9,
        lineCap: "round",
        dashArray: "10, 8"
      }).addTo(map);

      // Stop Markers
      ROUTE_STOPS.forEach((stop, i) => {
        const isTerminal = i === 0 || i === ROUTE_STOPS.length - 1;
        const iconHtml = `
          <div class="group relative flex items-center justify-center">
            <div class="absolute -inset-1 rounded-full ${isTerminal ? 'bg-blue-500/40 blur-sm' : 'bg-slate-700/30'}"></div>
            <div class="relative flex items-center justify-center w-7 h-7 rounded-full ${
              isTerminal 
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-extrabold text-xs shadow-lg ring-2 ring-blue-400/50' 
                : 'bg-slate-900 text-slate-200 border border-slate-700 text-[11px] font-bold shadow-md'
            }">
              ${i + 1}
            </div>
          </div>
        `;
        const customIcon = L.divIcon({
          html: iconHtml,
          className: "custom-stop-marker",
          iconSize: [28, 28]
        });

        L.marker([stop.lat, stop.lon], { icon: customIcon })
          .addTo(map)
          .bindPopup(`
            <div class="p-2 bg-slate-950 text-white rounded-lg border border-slate-800 text-xs font-sans">
              <strong class="text-blue-400 block mb-1">Stop ${i + 1}: ${stop.name}</strong>
              <span class="text-slate-400 text-[11px]">Route 101 Transit Station</span>
            </div>
          `);
      });

      // Live Bus Vehicle Marker
      const busIconHtml = `
        <div class="relative flex items-center justify-center">
          <div class="absolute -inset-3 rounded-full bg-blue-500/30 animate-ping"></div>
          <div class="absolute -inset-1.5 rounded-full bg-blue-500/20 blur-md"></div>
          <div class="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 border-2 border-white text-white flex items-center justify-center shadow-2xl transform transition-transform hover:scale-110">
            <span class="text-lg">🚌</span>
          </div>
        </div>
      `;
      const busIcon = L.divIcon({
        html: busIconHtml,
        className: "custom-bus-marker",
        iconSize: [44, 44],
        iconAnchor: [22, 22]
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

  // Sync position
  useEffect(() => {
    if (markerRef.current && data.vehicle.lat && data.vehicle.lon) {
      markerRef.current.setLatLng([data.vehicle.lat, data.vehicle.lon]);
    }
  }, [data.vehicle.lat, data.vehicle.lon]);

  const handleZoom = (type: "in" | "out" | "reset") => {
    if (!mapInstanceRef.current) return;
    if (type === "in") mapInstanceRef.current.zoomIn();
    if (type === "out") mapInstanceRef.current.zoomOut();
    if (type === "reset") mapInstanceRef.current.setView([12.9768, 77.5998], 14);
  };

  const legLabel = data.vehicle.leg === "outbound"
    ? "OUTBOUND — Completing Prior Route"
    : data.vehicle.leg === "dwell"
    ? "TERMINAL HALT — Schedule Recovery"
    : "INBOUND — Active En Route";

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col group">
      {/* Top Left Overlay: Vehicle Status */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-white flex items-center gap-2.5 shadow-2xl">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse shadow-sm shadow-blue-400" />
          <span>{legLabel}</span>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-slate-800/80 text-[11px] text-slate-300 flex items-center gap-3 shadow-lg">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono font-bold">{Math.round(data.vehicle.lat * 1000) / 1000}, {Math.round(data.vehicle.lon * 1000) / 1000}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold">{data.vehicle.source.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Top Right Overlay: Map Control Buttons */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-2xl">
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
      <div className="absolute bottom-4 left-4 right-4 z-20 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 shadow-2xl flex items-center justify-between overflow-x-auto gap-2 custom-scrollbar">
        {ROUTE_STOPS.map((stop, i) => (
          <button
            key={stop.id}
            onClick={() => {
              setActiveStopIndex(i);
              if (mapInstanceRef.current) {
                mapInstanceRef.current.panTo([stop.lat, stop.lon]);
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

      <div ref={mapContainerRef} className="w-full h-full min-h-[440px]" />
    </div>
  );
};
