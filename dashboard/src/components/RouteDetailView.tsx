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
import { AGENCY_PRESETS } from "../lib/agencies";
import type { TransitAgency } from "../lib/agencies";
import { LiveSignalIcon } from "./LiveSignalIcon";


// Local helper — avoids circular import with DashboardApp
function formatBusShortName(codeOrId?: string): string {
  if (!codeOrId) return "S26";
  const clean = codeOrId.replace(/-dir[01]$/, "").trim();
  if (clean === "13311") return "S26";
  if (clean === "16917") return "21G";
  if (clean === "15421") return "570";
  return clean;
}


interface RouteDetailViewProps {
  data: TransitSnapshot;
  selectedAgency: TransitAgency;
  selectedRouteId?: string | null;
  userLocation?: { lat: number; lon: number } | null;
  onBack: () => void;
}

function deduplicateStops<T extends { name: string; id?: string }>(stops: T[]): T[] {
  return stops.reduce((acc: T[], curr) => {
    const prev = acc[acc.length - 1];
    const currName = (curr.name || "").trim().toLowerCase();
    const prevName = (prev?.name || "").trim().toLowerCase();
    if (!prev || (currName !== prevName && curr.id !== prev.id)) {
      acc.push(curr);
    }
    return acc;
  }, []);
}

function findRoute(selectedAgency: TransitAgency, selectedRouteId?: string | null) {
  const code = selectedRouteId || "S26";

  const enrichedMatch = selectedAgency.routes.find((r) => r.id === code || r.code === code);
  const resolvedCode = enrichedMatch?.code || code;

  // 1. Check AGENCY_PRESETS ground truth first
  for (const agency of AGENCY_PRESETS) {
    const r =
      agency.routes.find((r) => r.code === code || r.id === code) ||
      (resolvedCode !== code
        ? agency.routes.find((r) => r.code === resolvedCode || r.id === resolvedCode)
        : undefined);
    if (r && r.coords.length > 0) return r;
  }

  // 2. Check selectedAgency (Neon DB enriched routes)
  if (enrichedMatch && enrichedMatch.coords.length > 0) return enrichedMatch;

  // 3. Fallback to default preset (S26) or first route
  return AGENCY_PRESETS[0]?.routes[0] || selectedAgency.routes[0];
}

// ─── Chalo-style detail map ───────────────────────────────────────────────────
const DetailMap: React.FC<{
  data: TransitSnapshot;
  selectedAgency: TransitAgency;
  selectedRouteId?: string | null;
  selectedStop?: { lat: number; lon: number; name: string; idx?: number } | null;
  inboundSec?: number;
  totalSec?: number;
}> = ({ data, selectedAgency, selectedRouteId, selectedStop, inboundSec = 0, totalSec = 3300 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const stopMarkerRef = useRef<any>(null); // highlighted stop marker

  const route = findRoute(selectedAgency, selectedRouteId);
  const stops = deduplicateStops(route?.coords ?? []);

  // ── Init / re-init when route changes ──────────────────────────────────────
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
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      if (stops.length > 1) {
        const latLons = stops.map((s) => [s.lat, s.lon] as [number, number]);

        // Route polyline
        L.polyline(latLons, {
          color: "#1e40af",
          weight: 5,
          opacity: 0.9,
          dashArray: "8 10",
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);

        // Intermediate stop circles
        stops.forEach((s, idx) => {
          if (idx === 0 || idx === stops.length - 1) return;
          L.circleMarker([s.lat, s.lon], {
            radius: 5,
            fillColor: "#fff",
            fillOpacity: 1,
            color: "#1e40af",
            weight: 2.5,
          }).addTo(map);
        });

        // ── START marker ─────────────────────────────────────────────────────
        L.marker([stops[0].lat, stops[0].lon], {
          icon: L.divIcon({
            className: "",
            html: `
              <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
                <div style="background:#16a34a;color:#fff;font-size:10px;font-weight:900;padding:3px 10px;border-radius:20px;white-space:nowrap;box-shadow:0 3px 10px rgba(22,163,74,0.45);letter-spacing:0.5px">
                  START
                </div>
                <div style="width:2px;height:6px;background:#16a34a;border-radius:2px"></div>
                <div style="width:14px;height:14px;border-radius:50%;background:#16a34a;border:3px solid #fff;box-shadow:0 2px 8px rgba(22,163,74,0.5)"></div>
              </div>`,
            iconSize: [70, 38],
            iconAnchor: [35, 38],
          }),
        }).addTo(map);

        // ── END marker ───────────────────────────────────────────────────────
        const endStop = stops[stops.length - 1];
        L.marker([endStop.lat, endStop.lon], {
          icon: L.divIcon({
            className: "",
            html: `
              <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
                <div style="background:#dc2626;color:#fff;font-size:10px;font-weight:900;padding:3px 10px;border-radius:20px;white-space:nowrap;box-shadow:0 3px 10px rgba(220,38,38,0.45);letter-spacing:0.5px">
                  END
                </div>
                <div style="width:2px;height:6px;background:#dc2626;border-radius:2px"></div>
                <div style="width:14px;height:14px;border-radius:50%;background:#dc2626;border:3px solid #fff;box-shadow:0 2px 8px rgba(220,38,38,0.5)"></div>
              </div>`,
            iconSize: [60, 38],
            iconAnchor: [30, 38],
          }),
        }).addTo(map);

        // ── Live bus marker ──────────────────────────────────────────────────
        const busLat = data?.vehicle?.lat;
        const busLon = data?.vehicle?.lon;
        if (busLat && busLon) {
          const busIcon = L.divIcon({
            className: "",
            html: `
              <div style="position:relative;width:44px;height:44px">
                <div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,0.22);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite"></div>
                <div style="position:relative;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#2563eb,#1d4ed8);border:3px solid #fff;box-shadow:0 4px 16px rgba(37,99,235,0.55);display:flex;align-items:center;justify-content:center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h20"/>
                    <path d="M18 18h2"/><path d="M4 18h2"/>
                    <path d="M18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>
                    <path d="M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>
                    <path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10H3V6Z"/>
                  </svg>
                </div>
              </div>`,
            iconSize: [44, 44],
            iconAnchor: [22, 22],
          });
          L.marker([busLat, busLon], { icon: busIcon, zIndexOffset: 1000 }).addTo(map);
        }

        // ── Fit to full route after layout is stable ──────────────────────────────
        setTimeout(() => {
          try {
            map.invalidateSize();
            map.fitBounds(L.latLngBounds(latLons), { padding: [60, 60], maxZoom: 14 });
          } catch {}
        }, 120);
      }

      mapRef.current = map;
    };

    initMap();
    return () => {
      if (stopMarkerRef.current) {
        try { stopMarkerRef.current.remove(); } catch {}
        stopMarkerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // ⚠️ Use stable string IDs — NOT the full agency object (changes every SSE tick)
  }, [selectedAgency.name, selectedAgency.city, selectedRouteId]);

  // ── Highlight selected stop with ETA popup ────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !selectedStop) return;
    const map = mapRef.current;

    // Remove previous highlight marker
    if (stopMarkerRef.current) {
      stopMarkerRef.current.remove();
      stopMarkerRef.current = null;
    }

    // Calculate ETA for this stop
    const stopIdx = selectedStop.idx ?? 0;
    const route   = selectedAgency.routes.find((r) => r.id === selectedRouteId || r.code === selectedRouteId) ?? selectedAgency.routes[0];
    const nStops  = (route?.coords?.length ?? 1) - 1;
    const fraction = nStops > 0 ? stopIdx / nStops : 0;
    const arrSec  = Math.round(totalSec * fraction);
    const etaMin  = stopIdx === 0
      ? Math.max(1, Math.round(inboundSec / 60))
      : Math.round(arrSec / 60);
    const etaLabel = stopIdx === 0
      ? `${etaMin} min away (approaching)`
      : `~${etaMin} min from start`;

    // Import Leaflet async
    import("leaflet").then((leaflet) => {
      const L = (leaflet as any).default ?? leaflet;

      const icon = L.divIcon({
        className: "",
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;gap:0">
            <!-- ETA Bubble -->
            <div style="
              background:#f7a501;color:#1c1400;
              font-size:11px;font-weight:900;
              padding:5px 12px;border-radius:16px;
              white-space:nowrap;
              box-shadow:0 4px 14px rgba(247,165,1,0.5);
              letter-spacing:0.3px;
              display:flex;align-items:center;gap:6px;
            ">
              <svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/></svg>
              ${etaLabel}
            </div>
            <!-- Stem -->
            <div style="width:2px;height:8px;background:#f7a501"></div>
            <!-- Pulsing pin circle -->
            <div style="position:relative;width:20px;height:20px">
              <div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(247,165,1,0.25);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite"></div>
              <div style="width:20px;height:20px;border-radius:50%;background:#f7a501;border:3px solid #fff;box-shadow:0 2px 10px rgba(247,165,1,0.6)"></div>
            </div>
          </div>`,
        iconSize: [160, 52],
        iconAnchor: [80, 52],
      });

      const marker = L.marker([selectedStop.lat, selectedStop.lon], {
        icon,
        zIndexOffset: 2000,
      }).addTo(map);

      stopMarkerRef.current = marker;

      // Pan & zoom map to selected station whenever user clicks it
      if (selectedStop && selectedStop.lat && selectedStop.lon) {
        try {
          map.flyTo([selectedStop.lat, selectedStop.lon], 15, { animate: true, duration: 0.85 });
        } catch {}
      }
    });
  }, [selectedStop?.lat, selectedStop?.lon, selectedStop?.name, inboundSec, totalSec]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {/* Status badge */}
      <div className="absolute top-3 right-3 z-[500] bg-white/95 backdrop-blur-md rounded-2xl px-3 py-1.5 shadow-md border border-slate-200/80 flex items-center gap-2">
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
  selectedStop: { id?: string; name: string; lat: number; lon: number } | null;
  onSelectStop: (stop: TransitAgency["routes"][0]["coords"][0]) => void;
  onOpenTimetable: (stop: TransitAgency["routes"][0]["coords"][0]) => void;
  userPos?: { lat: number; lon: number };
}> = ({ stops, vehiclePos, inboundSec, totalSec, selectedStop, onSelectStop, onOpenTimetable, userPos = { lat: 13.0302, lon: 80.1806 } }) => {
  const activeBusIdx = stops.reduce((closestIdx, currStop, i) => {
    const closestStop = stops[closestIdx];
    const distCurr = Math.hypot(currStop.lat - vehiclePos.lat, currStop.lon - vehiclePos.lon);
    const distClosest = Math.hypot(closestStop.lat - vehiclePos.lat, closestStop.lon - vehiclePos.lon);
    return distCurr < distClosest ? i : closestIdx;
  }, 0);

  const nearestUserStopIdx = stops.reduce((closestIdx, currStop, i) => {
    const closestStop = stops[closestIdx];
    const distCurr = Math.hypot(currStop.lat - userPos.lat, currStop.lon - userPos.lon);
    const distClosest = Math.hypot(closestStop.lat - userPos.lat, closestStop.lon - userPos.lon);
    return distCurr < distClosest ? i : closestIdx;
  }, 0);

  function formatMin(sec: number): string {
    if (sec <= 0) return "0 min";
    return `${Math.floor(sec / 60)} min`;
  }

  return (
    <div className="relative py-1">
      <div className="flex flex-col">
        {stops.map((stop, idx) => {
          const isNearestBus = idx === activeBusIdx;
          const isUserNearestStop = idx === nearestUserStopIdx;
          const isSelected = selectedStop != null && (
            (selectedStop.id && stop.id && selectedStop.id === stop.id) ||
            (selectedStop.name && stop.name && selectedStop.name.trim().toLowerCase() === stop.name.trim().toLowerCase())
          );
          const isLast = idx === stops.length - 1;
          const isFirst = idx === 0;
          const arrMin = Math.round((totalSec * (idx / Math.max(stops.length - 1, 1))) / 60);

          return (
            <div
              key={stop.id || idx}
              onClick={() => onSelectStop(stop)}
              className={`relative flex gap-0 cursor-pointer select-none group transition-colors duration-150 ${
                isSelected ? "bg-amber-50/50" : "hover:bg-slate-50/70"
              } rounded-xl`}
            >
              {/* ── Left column: connector line + node dot ── */}
              <div className="relative w-7 shrink-0 flex flex-col items-center">
                {/* Top connector segment (above dot) */}
                <div
                  className={`w-[2px] bg-slate-300 shrink-0 ${isFirst ? "opacity-0" : ""}`}
                  style={{ height: 12 }}
                />

                {/* Node dot */}
                <div className="relative z-10 shrink-0 flex items-center justify-center" style={{ width: 14, height: 14 }}>
                  {isNearestBus ? (
                    <div className="w-5 h-5 rounded-full bg-blue-600 border-[3px] border-white shadow-md ring-[3px] ring-blue-200 flex items-center justify-center shrink-0">
                      <Bus className="w-2.5 h-2.5 text-white" />
                    </div>
                  ) : isFirst ? (
                    <div className="w-3 h-3 rounded-full bg-slate-900 border-2 border-slate-900" />
                  ) : isLast ? (
                    <div className="w-3 h-3 rounded-full bg-slate-900 border-2 border-slate-900 flex items-center justify-center">
                      <Flag className="w-1.5 h-1.5 text-white" />
                    </div>
                  ) : (
                    <div className={`w-3 h-3 rounded-full border-2 bg-white transition-all duration-200 ${
                      isSelected
                        ? "border-amber-400 ring-[3px] ring-amber-200 scale-125"
                        : "border-slate-500 group-hover:border-slate-700"
                    }`} />
                  )}
                </div>

                {/* Bottom connector segment (below dot, grows to fill remaining space) */}
                {!isLast && (
                  <div className="w-[2px] bg-slate-300 flex-1 min-h-[8px]" />
                )}
              </div>

              {/* ── Right column: stop content ── */}
              <div className="flex-1 min-w-0 pl-2 pr-2 pt-[10px] pb-3">

                {/* Nearest stop badge */}
                {isUserNearestStop && (
                  <div className="mb-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold tracking-wide uppercase">
                      <MapPin className="w-2.5 h-2.5" />
                      Nearest bus stop
                    </span>
                  </div>
                )}

                {/* Stop name row */}
                <div className="flex items-center justify-between gap-2 min-h-[20px]">
                  <span className={`transition-all duration-150 leading-snug ${
                    isSelected
                      ? "font-bold text-[15px] text-slate-900"
                      : "font-medium text-sm text-slate-700 group-hover:text-slate-900"
                  }`}>
                    {stop.name}
                  </span>

                  {isSelected && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenTimetable(stop); }}
                      className="text-amber-500 hover:text-amber-600 text-[11px] font-semibold shrink-0 transition-colors"
                    >
                      Report issue
                    </button>
                  )}
                </div>

                {/* Expanded action card */}
                {isSelected && (
                  <div className="mt-2 p-3 rounded-xl bg-white border border-amber-200/80 shadow-sm flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800 leading-snug">
                        {isNearestBus
                          ? `Vehicle approaching · ${formatMin(inboundSec)} away`
                          : `Next arrival in ${arrMin} min`}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        Stop {idx + 1} of {stops.length}
                      </p>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenTimetable(stop); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-[12px] font-semibold transition-colors shrink-0 border border-amber-200/60"
                    >
                      <Calendar className="w-3.5 h-3.5" />
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
  userLocation,
  onBack,
}) => {
  const route = findRoute(selectedAgency, selectedRouteId);
  // Memoized so SSE updates don’t create a new array ref every tick
  const stops = React.useMemo(
    () => deduplicateStops(route?.coords ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedRouteId, selectedAgency.name, selectedAgency.city]
  );
  const { T_total_sec, T_inbound_sec } = data.inbound;

  const [userPos, setUserPos] = useState<{ lat: number; lon: number }>(
    userLocation || { lat: 13.0302, lon: 80.1806 }
  );

  useEffect(() => {
    if (userLocation) {
      setUserPos(userLocation);
      return;
    }
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {},
        { timeout: 5000 }
      );
    }
  }, [userLocation]);

  const nearestStopIdx = stops.reduce((closestIdx, currStop, i) => {
    const closestStop = stops[closestIdx];
    const distCurr = Math.hypot(currStop.lat - userPos.lat, currStop.lon - userPos.lon);
    const distClosest = Math.hypot(closestStop.lat - userPos.lat, closestStop.lon - userPos.lon);
    return distCurr < distClosest ? i : closestIdx;
  }, 0);

  const [selectedStop, setSelectedStop] = useState<typeof stops[0] | null>(stops[nearestStopIdx] ?? stops[0] ?? null);
  const [timetableStop, setTimetableStop] = useState<typeof stops[0] | null>(null);

  // Auto-select nearest stop ONLY when route changes or user location changes
  // NOT on every SSE tick (stops ref is now stable via useMemo)
  useEffect(() => {
    if (stops.length > 0) {
      const idx = stops.reduce((closestIdx, currStop, i) => {
        const closestStop = stops[closestIdx];
        const distCurr = Math.hypot(currStop.lat - userPos.lat, currStop.lon - userPos.lon);
        const distClosest = Math.hypot(closestStop.lat - userPos.lat, closestStop.lon - userPos.lon);
        return distCurr < distClosest ? i : closestIdx;
      }, 0);
      setSelectedStop(stops[idx] ?? stops[0]);
    }
  // Only re-run when route id or userPos actually changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRouteId, userPos.lat, userPos.lon]);

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
            <DetailMap
              data={data}
              selectedAgency={selectedAgency}
              selectedRouteId={selectedRouteId}
              selectedStop={selectedStop ? {
                ...selectedStop,
                idx: stops.findIndex((s) => s.id === selectedStop.id),
              } : null}
              inboundSec={T_inbound_sec}
              totalSec={T_total_sec}
            />
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

            {/* Passenger Density Bar */}
            {(() => {
              const band = data.inbound.occupancy_band;
              const DCFG: Record<string, { label: string; sublabel: string; dot: string; bg: string; text: string; border: string; bar: string; barPct: number }> = {
                SEATS_AVAILABLE: { label: "Seats Available", sublabel: "Low · Comfortable",      dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", bar: "bg-emerald-500", barPct: 25 },
                MODERATE:        { label: "Standing Room",   sublabel: "Medium · Standing space", dot: "bg-amber-400",   bg: "bg-amber-50",   text: "text-amber-800",   border: "border-amber-200",   bar: "bg-amber-400",   barPct: 50 },
                STANDING_ROOM:   { label: "Almost Full",     sublabel: "High · Limited standing", dot: "bg-orange-500", bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200", bar: "bg-orange-500", barPct: 75 },
                VERY_CROWDED:    { label: "Overcrowded",     sublabel: "No standing space",       dot: "bg-rose-500",   bg: "bg-rose-50",   text: "text-rose-800",   border: "border-rose-200",   bar: "bg-rose-500",   barPct: 100 },
              };
              const cfg = DCFG[band] ?? DCFG.SEATS_AVAILABLE;
              return (
                <div className={`mt-3 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[12px] font-bold ${cfg.text} flex items-center gap-1.5`}>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                        Passenger Density · {cfg.label}
                      </span>
                      <span className={`text-[10px] font-semibold ${cfg.text} opacity-70`}>{cfg.sublabel}</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
                        style={{ width: `${cfg.barPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] font-bold text-slate-400">Empty</span>
                      <span className="text-[9px] font-bold text-slate-400">Seated (40)</span>
                      <span className="text-[9px] font-bold text-slate-400">Full (55)</span>
                    </div>
                  </div>
                </div>
              );
            })()}
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
              selectedStop={selectedStop}
              onSelectStop={(stop) => setSelectedStop(stop)}
              onOpenTimetable={(stop) => setTimetableStop(stop)}
              userPos={userPos}
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
