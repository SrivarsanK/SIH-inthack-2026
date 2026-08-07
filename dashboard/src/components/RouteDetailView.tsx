import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Bus,
  Calendar,
  ChevronRight,
  Clock,
  Flag,
  MapPin,
  MoreVertical,
  ShieldCheck,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import type { TransitSnapshot } from "../lib/useTransitStream";
import type { TransitAgency } from "../lib/agencies";
import { LiveSignalIcon } from "./LiveSignalIcon";

import { formatBusShortName } from "./DashboardApp";

interface RouteDetailViewProps {
  data: TransitSnapshot;
  selectedAgency: TransitAgency;
  selectedRouteId?: string | null;
  onBack: () => void;
}

// ─── Chalo-style detail map ───────────────────────────────────────────────────
const DetailMap: React.FC<{
  data: TransitSnapshot;
  selectedAgency: TransitAgency;
  selectedRouteId?: string | null;
  selectedStop?: { lat: number; lon: number; name: string } | null;
}> = ({ data, selectedAgency, selectedRouteId, selectedStop }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  const route = selectedAgency.routes.find((r) => r.id === selectedRouteId || r.code === selectedRouteId) ?? selectedAgency.routes[0];
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
        <LiveSignalIcon className="w-4 h-4 text-blue-500" />
        <span className="text-xs font-extrabold text-slate-800">Updated 1 min ago</span>
      </div>
    </div>
  );
};

// ─── Stop Timetable Modal Component ──────────────────────────────────────────
const StopTimetableModal: React.FC<{
  stop: { id: string; name: string; lat: number; lon: number } | null;
  routeCode: string;
  inboundSec: number;
  onClose: () => void;
}> = ({ stop, routeCode, inboundSec, onClose }) => {
  if (!stop) return null;

  const SCHEDULE_TIMES = [
    { time: "06:30 AM", status: "completed" },
    { time: "07:15 AM", status: "completed" },
    { time: "08:00 AM", status: "live", liveEta: Math.max(1, Math.round(inboundSec / 60)) },
    { time: "08:15 AM", status: "scheduled" },
    { time: "08:30 AM", status: "scheduled" },
    { time: "08:45 AM", status: "scheduled" },
    { time: "09:00 AM", status: "scheduled" },
    { time: "09:30 AM", status: "scheduled" },
    { time: "10:00 AM", status: "scheduled" },
    { time: "10:30 AM", status: "scheduled" },
    { time: "11:00 AM", status: "scheduled" },
    { time: "11:30 AM", status: "scheduled" },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-[#f7a501]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-extrabold">
                  Route {routeCode}
                </span>
                <span className="text-xs text-slate-500 font-bold">Daily Schedule</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 leading-snug mt-0.5">
                {stop.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Schedule Frequency Badge */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-700">Frequency Info:</span>
          <span className="font-bold text-[#b17816]">Peak: 15 mins · Off-Peak: 30 mins</span>
        </div>

        {/* Departure Timetable Grid */}
        <div className="space-y-2">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Scheduled Bus Departures
          </span>

          <div className="max-h-60 overflow-y-auto pr-1 grid grid-cols-2 gap-2" style={{ scrollbarWidth: "thin" }}>
            {SCHEDULE_TIMES.map((item, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                  item.status === "live"
                    ? "bg-amber-50 border-[#f7a501] ring-2 ring-amber-100 font-extrabold"
                    : item.status === "completed"
                    ? "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                    : "bg-white border-slate-200 font-bold text-slate-800"
                }`}
              >
                <span>{item.time}</span>
                {item.status === "live" ? (
                  <span className="px-2 py-0.5 rounded-full bg-[#f7a501] text-slate-950 text-[10px] font-black animate-pulse">
                    ETA {item.liveEta} min
                  </span>
                ) : item.status === "completed" ? (
                  <span className="text-[10px] text-slate-400">Passed</span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-normal">Scheduled</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-slate-900 text-white font-extrabold text-xs hover:bg-slate-800 transition-colors text-center"
          >
            Close Timetable
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Chalo App Style Stop Timeline ───────────────────────────────────────────
const StopTimeline: React.FC<{
  stops: TransitAgency["routes"][0]["coords"];
  vehiclePos: { lat: number; lon: number };
  inboundSec: number;
  totalSec: number;
  selectedStopId: string | null;
  onSelectStop: (stop: TransitAgency["routes"][0]["coords"][0]) => void;
  onOpenTimetable: (stop: TransitAgency["routes"][0]["coords"][0]) => void;
}> = ({ stops, vehiclePos, inboundSec, totalSec, selectedStopId, onSelectStop, onOpenTimetable }) => {
  // Dynamically calculate which stop is closest to current vehicle position on map
  const activeBusIdx = stops.reduce((closestIdx, currStop, i) => {
    const closestStop = stops[closestIdx];
    const distCurr = Math.hypot(currStop.lat - vehiclePos.lat, currStop.lon - vehiclePos.lon);
    const distClosest = Math.hypot(closestStop.lat - vehiclePos.lat, closestStop.lon - vehiclePos.lon);
    return distCurr < distClosest ? i : closestIdx;
  }, 0);

  function formatMin(sec: number): string {
    if (sec <= 0) return "0 min";
    return `${Math.floor(sec / 60)} min`;
  }

  return (
    <div className="relative py-2">
      {/* Chalo App Continuous Solid Left Axis Line */}
      <div className="absolute left-[13px] top-4 bottom-6 w-[2px] bg-slate-800 z-0 pointer-events-none" />

      <div className="space-y-4">
        {stops.map((stop, idx) => {
          const isNearestBus = idx === activeBusIdx;
          const isUserNearestStop = idx === 0;
          const isSelected = selectedStopId === stop.id;
          const isLast = idx === stops.length - 1;
          const isFirst = idx === 0;
          const arrMin = Math.round((totalSec * (idx / Math.max(stops.length - 1, 1))) / 60);

          return (
            <div
              key={stop.id}
              onClick={() => onSelectStop(stop)}
              className="relative z-10 flex items-start gap-3 cursor-pointer select-none group"
            >
              {/* Chalo App Timeline Circle Nodes with Live Bus Position Badge */}
              <div className="w-[28px] shrink-0 flex items-center justify-center pt-1">
                {isNearestBus ? (
                  /* Live Bus Status Icon: Blue circular bus badge sitting directly on the line (Chalo Style) */
                  <div className="relative z-20 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-blue-600 border-2 border-white shadow-md ring-4 ring-blue-100 flex items-center justify-center text-white shrink-0">
                      <Bus className="w-3.5 h-3.5 text-white font-black" />
                    </div>
                  </div>
                ) : isFirst ? (
                  /* First Stop: Solid black filled circle */
                  <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-slate-900 z-10" />
                ) : isLast ? (
                  /* Terminus Stop: Black flag circle node */
                  <div className="w-4 h-4 rounded-full bg-slate-900 border-2 border-slate-900 z-10 flex items-center justify-center">
                    <Flag className="w-2 h-2 text-white" />
                  </div>
                ) : (
                  /* Intermediate Stop: Hollow Ring Circle sitting directly on the line */
                  <div className={`w-3.5 h-3.5 rounded-full border-2 bg-white transition-colors z-10 ${
                    isSelected ? "border-[#f7a501] ring-2 ring-amber-100" : "border-slate-800 group-hover:border-slate-900"
                  }`} />
                )}
              </div>

              {/* Stop Content & Selected Action Card */}
              <div className="flex-1 min-w-0 pr-1">
                
                {/* Green Nearest Bus Stop Pill (Chalo Style) — Shown for User's Nearest Stop */}
                {isUserNearestStop && (
                  <div className="mb-1">
                    <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                      Nearest bus stop
                    </span>
                  </div>
                )}

                {/* Stop Name & Report Issue Row */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-slate-800 transition-colors ${
                    isSelected ? "font-black text-base text-slate-900" : "font-semibold text-sm hover:text-slate-900"
                  }`}>
                    {stop.name}
                  </span>

                  {isSelected && (
                    <button className="text-[#f7a501] text-xs font-bold hover:underline shrink-0">
                      Report issue
                    </button>
                  )}
                </div>

                {/* Chalo Style Action Box ONLY when Selected */}
                {isSelected && (
                  <div className="mt-2.5 p-3 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-slate-500">
                      {isNearestBus
                        ? `Live vehicle approaching (${formatMin(inboundSec)})`
                        : `Next arrival in ${arrMin} min`}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTimetable(stop);
                      }}
                      className="text-[#f7a501] text-xs font-bold hover:underline shrink-0"
                    >
                      View timetable
                    </button>
                  </div>
                )}

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Route Detail View ───────────────────────────────────────────────────
export const RouteDetailView: React.FC<RouteDetailViewProps> = ({
  data,
  selectedAgency,
  selectedRouteId,
  onBack,
}) => {
  const route = selectedAgency.routes.find((r) => r.id === selectedRouteId || r.code === selectedRouteId) ?? selectedAgency.routes[0];
  const stops = route?.coords ?? [];
  const { T_total_sec, T_inbound_sec } = data.inbound;

  const [selectedStop, setSelectedStop] = useState<typeof stops[0] | null>(stops[0] ?? null);
  const [timetableStop, setTimetableStop] = useState<typeof stops[0] | null>(null);

  useEffect(() => {
    if (stops.length > 0) {
      setSelectedStop(stops[0]);
    }
  }, [selectedRouteId, stops]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6">

      {/* Navigation Header Bar (Chalo Style Top Header) */}
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
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-tight">Bus {formatBusShortName(route?.code)}</h1>
              <span className="text-xs text-slate-500 font-bold block">To {route?.destination}</span>
            </div>
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
          <div className="relative z-0 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100" style={{ height: 380 }}>
            <DetailMap data={data} selectedAgency={selectedAgency} selectedRouteId={selectedRouteId} selectedStop={selectedStop} />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                Bus Overview
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

        {/* Right Column: Chalo App Vertical Stop Timeline (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              <h2 className="font-black text-slate-900 text-base">Full Bus Stop Timeline</h2>
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
              vehiclePos={{ lat: data.vehicle.lat, lon: data.vehicle.lon }}
              inboundSec={T_inbound_sec}
              totalSec={T_total_sec}
              selectedStopId={selectedStop?.id ?? null}
              onSelectStop={(stop) => setSelectedStop(stop)}
              onOpenTimetable={(stop) => setTimetableStop(stop)}
            />
          </div>
        </div>

      </div>

      {/* Stop Timetable Modal */}
      {timetableStop && (
        <StopTimetableModal
          stop={timetableStop}
          routeCode={route?.code ?? "101"}
          inboundSec={T_inbound_sec}
          onClose={() => setTimetableStop(null)}
        />
      )}

    </div>
  );
};
