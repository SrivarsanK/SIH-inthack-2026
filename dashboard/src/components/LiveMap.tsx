import React, { useEffect, useRef, useState } from "react";
import type { TransitSnapshot } from "../lib/useTransitStream";
import type { TransitAgency } from "../lib/agencies";
import { ShieldCheck, Plus, Minus, RefreshCw } from "lucide-react";

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

      // CartoDB Voyager Light tile layer
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd"
      }).addTo(map);

      // Route Path Polylines (High-contrast blue/gold glow for light mode)
      const latLons = stops.map(s => [s.lat, s.lon]);
      
      polylineGlowRef.current = L.polyline(latLons, {
        color: "#f7a501",
        weight: 10,
        opacity: 0.4,
        lineCap: "round"
      }).addTo(map);

      polylineMainRef.current = L.polyline(latLons, {
        color: "#0284c7",
        weight: 5,
        opacity: 0.95,
        dashArray: "1, 0",
        lineCap: "round"
      }).addTo(map);

      // Stop Markers
      stopMarkersRef.current = stops.map((s, idx) => {
        const stopIcon = L.divIcon({
          className: "custom-stop-icon",
          html: `
            <div style="
              width: 26px;
              height: 26px;
              background: ${idx === 0 || idx === stops.length - 1 ? '#0284c7' : '#ffffff'};
              border: 2px solid #0284c7;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: ${idx === 0 || idx === stops.length - 1 ? '#ffffff' : '#0284c7'};
              font-weight: 800;
              font-size: 11px;
              box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            ">
              ${idx + 1}
            </div>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        return L.marker([s.lat, s.lon], { icon: stopIcon }).addTo(map);
      });

      // Live Bus Vehicle Marker with Pulsing Halo
      const busIcon = L.divIcon({
        className: "custom-bus-icon",
        html: `
          <div style="position: relative; width: 44px; height: 44px;">
            <div style="
              position: absolute;
              inset: 0;
              border-radius: 50%;
              background: rgba(247, 165, 1, 0.3);
              animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              position: relative;
              width: 44px;
              height: 44px;
              border-radius: 50%;
              background: linear-gradient(135deg, #f7a501 0%, #ea580c 100%);
              border: 3px solid #ffffff;
              box-shadow: 0 10px 20px rgba(247,165,1,0.4);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #0f172a;
              font-size: 20px;
            ">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h20"/><path d="M18 18h2"/><path d="M4 18h2"/><path d="M18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10H3V6Z"/></svg>
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      markerRef.current = L.marker([data.vehicle.lat, data.vehicle.lon], { icon: busIcon }).addTo(map);

      // Fit bounds to route
      if (latLons.length > 0) {
        map.fitBounds(L.latLngBounds(latLons), { padding: [50, 50] });
      }

      mapInstanceRef.current = map;
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [selectedAgency]);

  // Update Live Bus Marker Position
  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      const newPos: [number, number] = [data.vehicle.lat, data.vehicle.lon];
      markerRef.current.setLatLng(newPos);
    }
  }, [data.vehicle.lat, data.vehicle.lon]);

  // Handle Searched Location Camera Pan
  useEffect(() => {
    if (searchedLocation && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([searchedLocation.lat, searchedLocation.lon], 15, {
        duration: 1.5
      });
    }
  }, [searchedLocation]);

  const handleZoom = (type: "in" | "out" | "reset") => {
    if (!mapInstanceRef.current) return;
    if (type === "in") mapInstanceRef.current.zoomIn();
    if (type === "out") mapInstanceRef.current.zoomOut();
    if (type === "reset") {
      const latLons = stops.map(s => [s.lat, s.lon]);
      mapInstanceRef.current.flyToBounds(latLons, { padding: [50, 50] });
    }
  };

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-2xl overflow-hidden border border-slate-300 shadow-md">
      {/* Top Left Overlay: Route Pill */}
      <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-300 shadow-md space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f7a501] animate-ping" />
          <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
            {selectedAgency?.shortName || "BMTC"} - {activeRoute?.code || "101"}
          </span>
        </div>
        <div className="text-[11px] text-slate-600 font-bold flex items-center gap-2">
          <span>{activeRoute?.origin || "Majestic BS"} → {activeRoute?.destination || "Indiranagar Depot"}</span>
          <span className="text-slate-400">|</span>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-bold text-slate-800">{selectedAgency?.providerType || data.vehicle.source.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Top Right Overlay: Map Control Buttons */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-300 shadow-md">
        <button
          onClick={() => handleZoom("in")}
          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-[#f7a501] text-slate-700 hover:text-slate-950 flex items-center justify-center transition-all shadow-sm active:scale-95"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom("out")}
          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-[#f7a501] text-slate-700 hover:text-slate-950 flex items-center justify-center transition-all shadow-sm active:scale-95"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom("reset")}
          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-[#f7a501] text-slate-700 hover:text-slate-950 flex items-center justify-center transition-all shadow-sm active:scale-95"
          title="Reset Map View"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Overlay: Stop Selector Ribbon */}
      <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-300 shadow-md flex items-center justify-between overflow-x-auto gap-2 custom-scrollbar">
        {stops.map((stop, i) => (
          <button
            key={stop.id}
            onClick={() => {
              setActiveStopIndex(i);
              if (mapInstanceRef.current) {
                mapInstanceRef.current.panTo([stop.lat, stop.lon]);
              }
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold whitespace-nowrap transition-all ${
              activeStopIndex === i
                ? "bg-[#f7a501] text-slate-950 border-[#b17816] shadow-sm"
                : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-800 font-mono text-[10px] flex items-center justify-center">
              {i + 1}
            </span>
            <span>{stop.name}</span>
          </button>
        ))}
      </div>

      <div ref={mapContainerRef} className="w-full h-full min-h-[480px] bg-slate-200 z-0" style={{ height: "100%", minHeight: "480px" }} />
    </div>
  );
};
