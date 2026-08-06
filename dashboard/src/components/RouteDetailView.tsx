import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Bus,
  ChevronRight,
  Clock,
  Flag,
  MapPin,
  MoreVertical,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type { TransitSnapshot } from "../lib/useTransitStream";
import type { TransitAgency } from "../lib/agencies";

interface RouteDetailViewProps {
  data: TransitSnapshot;
  selectedAgency: TransitAgency;
  onBack: () => void;
}

// ─── Chalo-style detail map ───────────────────────────────────────────────────
const DetailMap: React.FC<{
  data: TransitSnapshot;
  selectedAgency: TransitAgency;
  selectedStop?: { lat: number; lon: number; name: string } | null;
}> = ({ data, selectedAgency, selectedStop }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  const route = selectedAgency.routes[0];
  const stops = route?.coords ?? [];

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    const initMap = async () => {
      const leaflet = await import("leaflet");
      const L = (leaflet as any).default ?? leaflet;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const center: [number, number] = stops.length > 0
        ? [stops[Math.floor(stops.length / 2)].lat, stops[Math.floor(stops.length / 2)].lon]
        : [12.9716, 77.5946];

      const map = L.map(containerRef.current!, {
        center,
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      if (stops.length > 1) {
        const latLons = stops.map((s) => [s.lat, s.lon] as [number, number]);
        L.polyline(latLons, {
          color: "#1e293b",
          weight: 4,
          opacity: 0.85,
          dashArray: "6 8",
          lineCap: "round",
        }).addTo(map);

        stops.forEach((s, idx) => {
          const isTerminal = idx === 0 || idx === stops.length - 1;
          L.circleMarker([s.lat, s.lon], {
            radius: isTerminal ? 7 : 5,
            fillColor: isTerminal ? "#1e293b" : "#fff",
            fillOpacity: 1,
            color: "#1e293b",
            weight: 2,
          }).addTo(map);
        });

        // Start label
        L.marker([stops[0].lat, stops[0].lon], {
          icon: L.divIcon({
            className: "",
            html: `<div style="background:#1e293b;color:#fff;font-size:10px;font-weight:800;padding:3px 8px;border-radius:12px;white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,0.2)">Start</div>`,
            iconAnchor: [20, -6],
          }),
        }).addTo(map);

        // End label
        const endStop = stops[stops.length - 1];
        L.marker([endStop.lat, endStop.lon], {
          icon: L.divIcon({
            className: "",
            html: `<div style="background:#1e293b;color:#fff;font-size:10px;font-weight:800;padding:3px 8px;border-radius:12px;white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,0.2)">End</div>`,
            iconAnchor: [16, -6],
          }),
        }).addTo(map);

        // Live bus marker
        const busIcon = L.divIcon({
          className: "",
          html: `<div style="position:relative;width:40px;height:40px"><div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,0.25);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite"></div><div style="position:relative;width:40px;height:40px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 4px 14px rgba(37,99,235,0.4);display:flex;align-items:center;justify-content:center"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h20"/><path d="M18 18h2"/><path d="M4 18h2"/><path d="M18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10H3V6Z"/></svg></div></div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        L.marker([data.vehicle.lat, data.vehicle.lon], { icon: busIcon }).addTo(map);

        map.fitBounds(L.latLngBounds(latLons), { padding: [40, 40] });
      }

      mapRef.current = map;
    };

    initMap();
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [selectedAgency]);

  // Pan to clicked stop when selectedStop changes
  useEffect(() => {
    if (mapRef.current && selectedStop) {
      const map = mapRef.current;
      map.flyTo([selectedStop.lat, selectedStop.lon], 14, { animate: true, duration: 0.8 });
    }
  }, [selectedStop]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {/* Clean HTML overlay badge for status */}
      <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-md rounded-2xl px-3 py-1.5 shadow-md border border-slate-200/80 flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-[#f7a501]" />
        <span className="text-xs font-extrabold text-slate-800">Updated 1 min ago</span>
      </div>
    </div>
  );
};

// ─── Stop Timeline ────────────────────────────────────────────────────────────
const StopTimeline: React.FC<{
  stops: TransitAgency["routes"][0]["coords"];
  inboundSec: number;
  totalSec: number;
  selectedStopId: string | null;
  onSelectStop: (stop: TransitAgency["routes"][0]["coords"][0]) => void;
}> = ({ stops, inboundSec, totalSec, selectedStopId, onSelectStop }) => {
  const nearestIdx = 0;

  function formatMin(sec: number): string {
    if (sec <= 0) return "0 min";
    return `${Math.floor(sec / 60)} min`;
  }

  return (
    <div className="space-y-1.5">
      {stops.map((stop, idx) => {
        const isNearest = idx === nearestIdx;
        const isSelected = selectedStopId === stop.id;
        const isLast = idx === stops.length - 1;
        const arrMin = Math.round((totalSec * (idx / Math.max(stops.length - 1, 1))) / 60);

        return (
          <div
            key={stop.id}
            onClick={() => onSelectStop(stop)}
            className={`flex items-start gap-4 p-3 rounded-2xl transition-all cursor-pointer select-none ${
              isSelected
                ? "bg-amber-50/90 border-2 border-[#f7a501] shadow-xs"
                : "bg-white hover:bg-slate-50 border-2 border-transparent"
            }`}
          >
            {/* Timeline connector dot & line */}
            <div className="flex flex-col items-center shrink-0 pt-1">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  isNearest || isSelected
                    ? "bg-[#f7a501] border-[#f7a501] shadow-md ring-4 ring-amber-100"
                    : isLast
                    ? "bg-slate-900 border-slate-900"
                    : "bg-white border-slate-300"
                }`}
              >
                {isNearest ? (
                  <Bus className="w-3 h-3 text-slate-950 font-black" />
                ) : isLast ? (
                  <Flag className="w-2.5 h-2.5 text-white" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                )}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 mt-1 ${isNearest || isSelected ? "bg-[#f7a501]" : "bg-slate-200"}`}
                  style={{ minHeight: 28 }}
                />
              )}
            </div>

            {/* Stop Information (Clean Human Text) */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <div className="flex items-center gap-2">
                  <span className={`font-extrabold text-sm ${isSelected || isNearest ? "text-slate-900" : "text-slate-700"}`}>
                    {stop.name}
                  </span>
                  {isNearest && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                      Nearest bus stop
                    </span>
                  )}
                </div>

                <span className={`text-xs font-bold shrink-0 ${isNearest || isSelected ? "text-[#f7a501]" : "text-slate-400"}`}>
                  {isNearest ? `In ${formatMin(inboundSec)}` : `${arrMin} min`}
                </span>
              </div>

              {isNearest && (
                <div className="mt-2.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Zap className="w-4 h-4 text-[#f7a501]" />
                    <span>Live vehicle approaching stop</span>
                  </div>
                  <button className="text-[#b17816] text-xs font-black hover:underline shrink-0">
                    View Timetable
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Main Route Detail View ───────────────────────────────────────────────────
export const RouteDetailView: React.FC<RouteDetailViewProps> = ({
  data,
  selectedAgency,
  onBack,
}) => {
  const route = selectedAgency.routes[0];
  const stops = route?.coords ?? [];
  const { T_total_sec, T_inbound_sec } = data.inbound;

  const [selectedStop, setSelectedStop] = useState<typeof stops[0] | null>(stops[0] ?? null);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6">

      {/* Navigation Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
            Back to Dashboard
          </button>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-[#f7a501] text-slate-950 text-[10px] font-extrabold">
              {selectedAgency.dataStatus === "Chalo Chained Feed" ? "Deluxe" : "LIVE"}
            </span>
            <h1 className="text-xl font-black text-slate-900">Route {route?.code}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline">
            Report issue
          </button>
        </div>
      </div>

      {/* Responsive 2-Column Desktop Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Leaflet Map & Route Overview Card (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100" style={{ height: 380 }}>
            <DetailMap data={data} selectedAgency={selectedAgency} selectedStop={selectedStop} />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                Route Overview
              </span>
              <span className="text-xs font-mono font-bold text-slate-700">
                GTFS Block: {data.vehicle.block_id}
              </span>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                <Bus className="w-5 h-5 text-[#f7a501]" />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 text-base block">
                  {route?.origin} → {route?.destination}
                </span>
                <span className="text-xs text-slate-500 block mt-0.5">
                  {stops.length} stops · Estimated leg time: {Math.round(T_total_sec / 60)} mins
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Vertical Stop Timeline (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              <h2 className="font-black text-slate-900 text-base">Click Stop to Center Map</h2>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {stops.length} Stops Total
            </span>
          </div>

          <div
            className="max-h-[500px] overflow-y-auto pr-2 space-y-1"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#cbd5e1 transparent",
            }}
          >
            <StopTimeline
              stops={stops}
              inboundSec={T_inbound_sec}
              totalSec={T_total_sec}
              selectedStopId={selectedStop?.id ?? null}
              onSelectStop={(stop) => setSelectedStop(stop)}
            />
          </div>
        </div>

      </div>

    </div>
  );
};
