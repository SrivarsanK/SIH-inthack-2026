import React, { useEffect, useRef, useState } from "react";
import type { TransitSnapshot } from "../lib/useTransitStream";
import type { TransitAgency } from "../lib/agencies";
import { Gauge, ShieldCheck, Plus, Minus, RefreshCw } from "lucide-react";

interface LiveMapProps {
  data: TransitSnapshot;
  selectedAgency?: TransitAgency;
  searchedLocation?: { name: string; lat: number; lon: number } | null;
}

const DEFAULT_STOPS = [
  { id: "S1", name: "Majestic Kempegowda BS", lat: 12.9716, lon: 77.5946 },
  { id: "S2", name: "Corporation Circle", lat: 12.9740, lon: 77.5970 },
  { id: "S3", name: "Residency Road", lat: 12.9760, lon: 77.5990 },
  { id: "S4", name: "MG Road Metro", lat: 12.9780, lon: 77.6010 },
  { id: "S5", name: "Halasuru", lat: 12.9800, lon: 77.6030 },
  { id: "S6", name: "Indiranagar Depot", lat: 12.9820, lon: 77.6050 },
];

export const LiveMap: React.FC<LiveMapProps> = ({ data, selectedAgency, searchedLocation }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polylineGlowRef = useRef<any>(null);
  const polylineMainRef = useRef<any>(null);
  const stopMarkersRef = useRef<any[]>([]);
  const [activeStopIndex, setActiveStopIndex] = useState<number>(0);

  const activeRoute = selectedAgency?.routes[0];
  const stops = activeRoute?.coords || DEFAULT_STOPS;
  const initialCenter: [number, number] = [stops[0].lat, stops[0].lon];

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let L: any = null;

    const initMap = async () => {
      const leafletMod = await import("leaflet");
      L = leafletMod.default || leafletMod;
      await import("leaflet/dist/leaflet.css");

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Initialize Leaflet Map
      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 13,
        zoomControl: false,
        attributionControl: false
      });

      // Ultra-reliable CartoDB Dark Matter tile layer
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd"
      }).addTo(map);

      // Route Polyline Coordinates
      const polylineCoords = stops.map(s => [s.lat, s.lon]);

      // Outer Glow Polyline
      const outerGlow = L.polyline(polylineCoords, {
        color: selectedAgency?.accentColor || "#0284c7",
        weight: 10,
        opacity: 0.35,
        lineCap: "round"
      }).addTo(map);
      polylineGlowRef.current = outerGlow;

      // Main Polyline
      const mainLine = L.polyline(polylineCoords, {
        color: "#38bdf8",
        weight: 5,
        opacity: 0.95,
        lineCap: "round",
        dashArray: "8, 10"
      }).addTo(map);
      polylineMainRef.current = mainLine;

      // Render Stop Markers
      stopMarkersRef.current = stops.map((stop, i) => {
        const isTerminal = i === 0 || i === stops.length - 1;
        const iconHtml = `
          <div class="flex items-center justify-center w-7 h-7 rounded-full ${
            isTerminal
              ? 'bg-blue-600 text-white font-black text-xs ring-4 ring-blue-500/40 shadow-xl'
              : 'bg-slate-900 text-white border-2 border-blue-400 font-bold text-[11px] shadow-md'
          }">
            ${i + 1}
          </div>
        `;
        const customIcon = L.divIcon({
          html: iconHtml,
          className: "custom-stop-icon",
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        return L.marker([stop.lat, stop.lon], { icon: customIcon })
          .addTo(map)
          .bindPopup(`
            <div class="p-2 bg-slate-950 text-white rounded-lg border border-slate-800 text-xs font-sans">
              <strong class="text-blue-400 block mb-1">Stop ${i + 1}: ${stop.name}</strong>
              <span class="text-slate-400 text-[11px]">${selectedAgency?.shortName || 'Transit'} Network</span>
            </div>
          `);
      });

      // Animated Bus Marker
      const busIconHtml = `
        <div class="relative flex items-center justify-center">
          <div class="absolute -inset-3 rounded-full bg-blue-500/40 animate-ping"></div>
          <div class="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 border-2 border-white text-white flex items-center justify-center shadow-2xl">
            <span class="text-lg">🚌</span>
          </div>
        </div>
      `;
      const busIcon = L.divIcon({
        html: busIconHtml,
        className: "custom-bus-icon",
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      const vehicleLat = selectedAgency ? stops[0].lat : data.vehicle.lat;
      const vehicleLon = selectedAgency ? stops[0].lon : data.vehicle.lon;

      const marker = L.marker([vehicleLat, vehicleLon], { icon: busIcon }).addTo(map);
      markerRef.current = marker;
      mapInstanceRef.current = map;

      // Auto-fit map bounds to show full route
      map.fitBounds(L.polyline(polylineCoords).getBounds(), { padding: [40, 40] });
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [selectedAgency?.id]);

  // Sync bus position
  useEffect(() => {
    if (markerRef.current && !selectedAgency && data.vehicle.lat && data.vehicle.lon) {
      markerRef.current.setLatLng([data.vehicle.lat, data.vehicle.lon]);
    }
  }, [data.vehicle.lat, data.vehicle.lon, selectedAgency]);

  // Handle searched location pan
  useEffect(() => {
    if (searchedLocation && mapInstanceRef.current) {
      mapInstanceRef.current.panTo([searchedLocation.lat, searchedLocation.lon]);
    }
  }, [searchedLocation]);

  const handleZoom = (type: "in" | "out" | "reset") => {
    if (!mapInstanceRef.current) return;
    if (type === "in") mapInstanceRef.current.zoomIn();
    if (type === "out") mapInstanceRef.current.zoomOut();
    if (type === "reset") {
      const polylineCoords = stops.map(s => [s.lat, s.lon]);
      mapInstanceRef.current.fitBounds(polylineCoords, { padding: [40, 40] });
    }
  };

  const legLabel = data.vehicle.leg === "outbound"
    ? "OUTBOUND — Completing Prior Route"
    : data.vehicle.leg === "dwell"
    ? "TERMINAL HALT — Schedule Recovery"
    : "INBOUND — Active En Route";

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col group z-0">
      {/* Top Left Overlay: Vehicle Status */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-white flex items-center gap-2.5 shadow-2xl pointer-events-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse shadow-sm shadow-blue-400" />
          <span>{selectedAgency ? `${selectedAgency.shortName} · ${activeRoute?.code}` : legLabel}</span>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-slate-800/80 text-[11px] text-slate-300 flex items-center gap-3 shadow-lg pointer-events-auto">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono font-bold">{selectedAgency ? `${activeRoute?.origin} ➔ ${activeRoute?.destination}` : `${Math.round(data.vehicle.lat * 1000) / 1000}, ${Math.round(data.vehicle.lon * 1000) / 1000}`}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold">{selectedAgency?.providerType || data.vehicle.source.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Top Right Overlay: Map Control Buttons */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-2xl">
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

      <div ref={mapContainerRef} className="w-full h-full min-h-[480px] bg-slate-950 z-0" style={{ height: "100%", minHeight: "480px" }} />
    </div>
  );
};
