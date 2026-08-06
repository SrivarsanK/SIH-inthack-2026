import React, { useEffect, useRef } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Bus,
  ChevronRight,
  Flag,
  MapPin,
  MoreVertical,
  Zap,
} from "lucide-react";
import type { TransitSnapshot } from "../lib/useTransitStream";
import type { TransitAgency } from "../lib/agencies";

interface RouteDetailViewProps {
  data: TransitSnapshot;
  selectedAgency: TransitAgency;
  onBack: () => void;
}

function formatMin(sec: number): string {
  if (sec <= 0) return "0 min";
  return `${Math.floor(sec / 60)} min`;
}

// ─── Chalo-style detail map ───────────────────────────────────────────────────
const DetailMap: React.FC<{ data: TransitSnapshot; selectedAgency: TransitAgency }> = ({
  data,
  selectedAgency,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  const route = selectedAgency.routes[0];
  const stops = route?.coords ?? [];

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    const initMap = async () => {
      const leaflet = await import("leaflet");
      const L = (leaflet as any).default ?? leaflet;

      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

      const center: [number, number] = stops.length > 0
        ? [stops[Math.floor(stops.length / 2)].lat, stops[Math.floor(stops.length / 2)].lon]
        : [12.9716, 77.5946];

      const map = L.map(containerRef.current!, {
        center,
        zoom: 11,
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
          color: "#111827",
          weight: 3.5,
          opacity: 0.9,
          dashArray: "5 7",
          lineCap: "round",
        }).addTo(map);

        // Circle dots for each stop
        stops.forEach((s, idx) => {
          const isTerminal = idx === 0 || idx === stops.length - 1;
          const dot = L.circleMarker([s.lat, s.lon], {
            radius: isTerminal ? 7 : 5,
            fillColor: isTerminal ? "#111827" : "#e2e8f0",
            fillOpacity: 1,
            color: "#fff",
            weight: 2,
          }).addTo(map);
        });

        // Start label
        L.marker([stops[0].lat, stops[0].lon], {
          icon: L.divIcon({
            className: "",
            html: `<div style="background:#111827;color:#fff;font-size:10px;font-weight:700;padding:3px 7px;border-radius:12px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3)">Start</div>`,
            iconAnchor: [20, -4],
          }),
        }).addTo(map);

        // End label
        const endStop = stops[stops.length - 1];
        L.marker([endStop.lat, endStop.lon], {
          icon: L.divIcon({
            className: "",
            html: `<div style="background:#111827;color:#fff;font-size:10px;font-weight:700;padding:3px 7px;border-radius:12px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3)">End</div>`,
            iconAnchor: [16, -4],
          }),
        }).addTo(map);

        // Live bus
        L.marker([data.vehicle.lat, data.vehicle.lon], {
          icon: L.divIcon({
            className: "",
            html: `<div style="position:relative;width:40px;height:40px"><div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,0.2);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite"></div><div style="position:relative;width:40px;height:40px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 4px 14px rgba(37,99,235,0.4);display:flex;align-items:center;justify-content:center"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h20"/><path d="M18 18h2"/><path d="M4 18h2"/><path d="M18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10H3V6Z"/></svg></div></div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          }),
        }).addTo(map);

        // "Updated N min ago" popup
        L.marker([data.vehicle.lat, data.vehicle.lon + 0.005], {
          icon: L.divIcon({
            className: "",
            html: `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:6px 10px;font-size:11px;font-weight:600;color:#374151;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.1);display:flex;align-items:center;gap:6px"><span style="color:#f59e0b;font-size:14px">⚡</span>Updated 1 min ago</div>`,
            iconAnchor: [-10, 20],
          }),
        }).addTo(map);

        map.fitBounds(L.latLngBounds(latLons), { padding: [50, 50] });
      }

      mapRef.current = map;
    };

    initMap();
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [selectedAgency]);

  return <div ref={containerRef} className="w-full h-full" />;
};

// ─── Stop Timeline ────────────────────────────────────────────────────────────
const StopTimeline: React.FC<{
  stops: TransitAgency["routes"][0]["coords"];
  inboundSec: number;
  totalSec: number;
}> = ({ stops, inboundSec, totalSec }) => {
  // Current stop approximated by progress
  const nearestIdx = 0; // First stop is always "nearest" in our simulation

  return (
    <div className="divide-y divide-slate-50">
      {stops.map((stop, idx) => {
        const isNearest = idx === nearestIdx;
        const isLast = idx === stops.length - 1;
        const arrMin = Math.round((totalSec * (idx / Math.max(stops.length - 1, 1))) / 60);

        return (
          <div key={stop.id} className="flex items-start gap-3 px-4 py-3">
            {/* Timeline dot + line */}
            <div className="flex flex-col items-center shrink-0 pt-0.5">
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  isNearest
                    ? "border-emerald-500 bg-emerald-500"
                    : isLast
                    ? "border-slate-800 bg-slate-800"
                    : "border-slate-300 bg-white"
                }`}
              >
                {isNearest && (
                  <span className="text-[6px] font-black text-white leading-none">B</span>
                )}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 mt-1 ${isNearest ? "bg-emerald-300" : "bg-slate-200"}`}
                  style={{ minHeight: 24 }}
                />
              )}
            </div>

            {/* Stop info */}
            <div className="flex-1 min-w-0 pb-2">
              {isNearest && (
                <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[9px] font-extrabold mb-1 tracking-wide">
                  Nearest bus stop
                </span>
              )}
              <span className={`font-bold text-sm block leading-snug ${isNearest ? "text-slate-900" : "text-slate-700"}`}>
                {stop.name}
              </span>

              {isNearest && (
                <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">No live buses</span>
                    <button className="text-[#f7a501] text-xs font-bold hover:opacity-80">
                      View timetable
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Time on right */}
            {!isNearest && (
              <span className="text-xs text-slate-400 font-medium shrink-0 pt-0.5">
                {arrMin} min
              </span>
            )}

            {isNearest && (
              <button className="shrink-0 pt-0.5">
                <div className="flex items-center gap-1 text-[#f7a501] text-xs font-bold">
                  Report issue
                </div>
              </button>
            )}
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

  return (
    <div className="flex-1 flex flex-col" style={{ background: "#FAF9F6" }}>

      {/* Map — top half */}
      <div className="relative" style={{ height: 340 }}>
        <DetailMap data={data} selectedAgency={selectedAgency} />

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-800" />
        </button>
      </div>

      {/* Route info header */}
      <div className="bg-white border-b border-slate-200 px-4 pt-3 pb-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-2 py-0.5 rounded-md bg-[#f7a501] text-slate-950 text-[10px] font-extrabold">
                {selectedAgency.dataStatus === "Chalo Chained Feed" ? "Deluxe" : "LIVE"}
              </span>
              <span className="text-2xl font-black text-slate-900">{route?.code}</span>
            </div>
            <span className="text-sm text-slate-500">To {route?.destination}</span>
          </div>
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
            <MoreVertical className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Stop timeline — scrollable */}
      <div className="flex-1 overflow-y-auto bg-white">
        <StopTimeline
          stops={stops}
          inboundSec={T_inbound_sec}
          totalSec={T_total_sec}
        />
      </div>
    </div>
  );
};
