import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  Bus,
  ChevronRight,
  Clock,
  ExternalLink,
  Home,
  MapPin,
  Menu,
  Mic,
  Radio,
  Search,
  Settings,
  Star,
  User,
  Users,
  Zap,
} from "lucide-react";
import type { TransitSnapshot } from "../lib/useTransitStream";
import type { TransitAgency } from "../lib/agencies";
import { SearchView } from "./SearchView";
import { RouteDetailView } from "./RouteDetailView";
import { RoutesListView } from "./RoutesListView";

interface ChaloHomeViewProps {
  data: TransitSnapshot;
  isConnected: boolean;
  selectedAgency: TransitAgency;
  onOpenAgencySelector: () => void;
}

function formatMin(sec: number): string {
  if (sec <= 0) return "0 min";
  return `${Math.floor(sec / 60)} min`;
}

const OCCUPANCY_LABEL: Record<string, string> = {
  SEATS_AVAILABLE: "Seats Available",
  MODERATE: "Moderate",
  STANDING_ROOM: "Standing Room",
  VERY_CROWDED: "Very Crowded",
};

const OCCUPANCY_DOT: Record<string, string> = {
  SEATS_AVAILABLE: "bg-emerald-500",
  MODERATE: "bg-amber-500",
  STANDING_ROOM: "bg-orange-500",
  VERY_CROWDED: "bg-rose-500",
};

const SIM_API = "http://localhost:8001";

// --- Chalo-style Leaflet Map --------------------------------------------------
const ChaloMap: React.FC<{ data: TransitSnapshot; selectedAgency: TransitAgency }> = ({
  data,
  selectedAgency,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const route = selectedAgency.routes[0];
  const stops = route?.coords ?? [];

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    const initMap = async () => {
      const leaflet = await import("leaflet");
      const L = (leaflet as any).default ?? leaflet;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      const center: [number, number] = stops.length > 0
        ? [stops[0].lat, stops[0].lon] : [12.9716, 77.5946];
      const map = L.map(containerRef.current!, { center, zoom: 12, zoomControl: false, attributionControl: false });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19, subdomains: "abcd",
      }).addTo(map);
      const latLons = stops.map((s) => [s.lat, s.lon] as [number, number]);
      L.polyline(latLons, { color: "#111827", weight: 3, opacity: 0.8, dashArray: "4 6", lineCap: "round" }).addTo(map);
      if (stops.length > 0) {
        const mkLabel = (text: string, anchor: [number, number]) => L.divIcon({
          className: "",
          html: `<div style="background:#111827;color:#fff;font-size:10px;font-weight:700;padding:3px 7px;border-radius:12px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${text}</div>`,
          iconAnchor: anchor,
        });
        L.marker([stops[0].lat, stops[0].lon], { icon: mkLabel("Start", [20, 8]) }).addTo(map);
        L.marker([stops[stops.length-1].lat, stops[stops.length-1].lon], { icon: mkLabel("End", [16, 8]) }).addTo(map);
      }
      stops.forEach((s, idx) => {
        const t = idx === 0 || idx === stops.length - 1;
        const dotIcon = L.divIcon({
          className: "",
          html: `<div style="width:${t?14:10}px;height:${t?14:10}px;background:${t?"#111827":"#6b7280"};border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.2)"></div>`,
          iconSize: [t?14:10, t?14:10],
          iconAnchor: [t?7:5, t?7:5],
        });
        L.marker([s.lat, s.lon], { icon: dotIcon }).addTo(map);
      });
      const busIcon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:40px;height:40px"><div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,0.2);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite"></div><div style="position:relative;width:40px;height:40px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 6px 16px rgba(37,99,235,0.4);display:flex;align-items:center;justify-content:center"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h20"/><path d="M18 18h2"/><path d="M4 18h2"/><path d="M18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10H3V6Z"/></svg></div></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      markerRef.current = L.marker([data.vehicle.lat, data.vehicle.lon], { icon: busIcon }).addTo(map);
      if (latLons.length > 1) map.fitBounds(L.latLngBounds(latLons), { padding: [40, 40] });
      mapRef.current = map;
    };
    initMap();
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [selectedAgency]);

  useEffect(() => {
    if (markerRef.current) markerRef.current.setLatLng([data.vehicle.lat, data.vehicle.lon]);
  }, [data.vehicle.lat, data.vehicle.lon]);

  return <div ref={containerRef} className="w-full h-full" />;
};

// --- Main View ----------------------------------------------------------------
export const ChaloHomeView: React.FC<ChaloHomeViewProps> = ({
  data,
  isConnected,
  selectedAgency,
  onOpenAgencySelector,
}) => {
  const [activeNav, setActiveNav] = useState<"home"|"track"|"search"|"routes"|"fav"|"profile">("home");
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const tick = () => setTimeStr(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const route = selectedAgency.routes[0];
  const stops = route?.coords ?? [];
  const { T_total_sec, T_outbound_sec, T_inbound_sec, occupancy_band } = data.inbound;
  const isDelayed = (data.inbound as any).is_delayed ?? false;
  const delayMin = (data.inbound as any).delay_min ?? 0;
  const stopTimes = stops.map((_, i) =>
    Math.round((T_total_sec * (i / Math.max(stops.length - 1, 1))) / 60)
  );

  const NAV_ITEMS = [
    { id: "home" as const, icon: Home, label: "Home" },
    { id: "track" as const, icon: Bus, label: "Track" },
    { id: "search" as const, icon: Search, label: "Search" },
    { id: "routes" as const, icon: Star, label: "Routes" },
    { id: "profile" as const, icon: User, label: "Profile" },
  ];

  // ── Non-home views ─────────────────────────────────────────────────────────
  if (activeNav === "search") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#FAF9F6" }}>
        <SearchView selectedAgency={selectedAgency} />
        <BottomNav items={NAV_ITEMS} active={activeNav} onSelect={setActiveNav} />
      </div>
    );
  }

  if (activeNav === "track") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#FAF9F6" }}>
        <RouteDetailView
          data={data}
          selectedAgency={selectedAgency}
          onBack={() => setActiveNav("home")}
        />
        <BottomNav items={NAV_ITEMS} active={activeNav} onSelect={setActiveNav} />
      </div>
    );
  }

  if (activeNav === "routes") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#FAF9F6" }}>
        <RoutesListView
          selectedAgency={selectedAgency}
          onSelectRoute={() => setActiveNav("track")}
          onBack={() => setActiveNav("home")}
        />
        <BottomNav items={NAV_ITEMS} active={activeNav} onSelect={setActiveNav} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FAF9F6" }}>

      {/* STATUS BAR */}
      <div className="flex items-center justify-between px-5 pt-3 pb-1">
        <span className="text-[13px] font-bold text-slate-800">{timeStr || "10:27"}</span>
        <div className="flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-slate-600" />
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-amber-400"}`} />
        </div>
      </div>

      {/* HEADER */}
      <header className="flex items-center justify-between px-4 py-2">
        <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
          <Menu className="w-5 h-5 text-slate-700" />
        </button>

        <div className="flex items-center gap-2 select-none">
          <div className="w-8 h-8 rounded-full bg-[#f7a501] flex items-center justify-center shadow-sm">
            <Bus className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-black tracking-tight text-slate-900">TransitSense</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAgencySelector}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <MapPin className="w-3 h-3 text-[#f7a501]" />
            <span>{selectedAgency.city}</span>
            <ChevronRight className="w-3 h-3 text-slate-400 rotate-90" />
          </button>
          <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
            <Bell className="w-[18px] h-[18px] text-slate-600" />
            {isConnected && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#f7a501] border border-white" />}
          </button>
        </div>
      </header>

      {/* SEARCH BAR */}
      <div className="px-4 py-2">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="flex-1 text-sm text-slate-400">Search bus number, stop or destination</span>
          <Mic className="w-4 h-4 text-slate-400 shrink-0" />
        </div>
      </div>

      {/* QUICK ROUTE PILLS */}
      <div className="px-4 py-2 flex gap-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {selectedAgency.routes.map((r, idx) => (
          <div
            key={r.id}
            className="shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-sm min-w-[160px] cursor-pointer hover:border-[#f7a501] transition-colors group"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-[#f7a501]/10">
              <Bus className="w-4 h-4 text-slate-600 group-hover:text-[#b17816]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-black text-slate-900 text-sm">{r.code}</span>
                {idx === 0 && (
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-[#f7a501] text-slate-950">LIVE</span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 truncate block">To {r.destination}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          </div>
        ))}
      </div>

      {/* NEAREST BUS STOP */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="font-black text-slate-900 text-base">Nearest bus stop</h2>
          <button className="flex items-center gap-1 text-[#f7a501] text-xs font-bold hover:opacity-80">
            See all stops <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Stop header */}
          <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full border-2 border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                <Bus className="w-4 h-4 text-slate-800" />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-sm block leading-snug">
                  {stops[0]?.name ?? "Nearest Bus Stop"}
                </span>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                  Nearest stop
                </span>
              </div>
            </div>
            <div className="text-right">
              {isConnected ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              ) : (
                <>
                  <span className="text-xs text-slate-500 block">No live buses</span>
                  <button className="text-[#f7a501] text-xs font-bold mt-0.5">View timetable</button>
                </>
              )}
            </div>
          </div>

          {/* ETA rows */}
          {selectedAgency.routes.slice(0, 2).map((r, idx) => {
            const etaMin = idx === 0
              ? Math.floor(T_inbound_sec / 60)
              : Math.floor((T_inbound_sec + T_outbound_sec) / 60);
            return (
              <div key={r.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Bus className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="font-bold text-slate-900 text-sm">{r.code}</span>
                    <span className="text-xs text-slate-500 block">To {r.destination}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-sm text-[#f7a501]">
                  <Zap className="w-3.5 h-3.5" />
                  <span>{etaMin} min away</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TRACK YOUR BUS */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="font-black text-slate-900 text-base">Track your bus</h2>
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-600">Live tracking</span>
          </div>
        </div>

        {/* Map */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-200" style={{ height: 240 }}>
          <ChaloMap data={data} selectedAgency={selectedAgency} />

          {/* Bus info popup */}
          <div className="absolute top-3 right-3 z-10 bg-white rounded-xl p-2.5 shadow-lg border border-slate-100 flex items-start gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Bus className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <span className="font-black text-slate-900 text-sm block">{selectedAgency.shortName}-{route?.code}</span>
              <span className="text-[11px] text-slate-600 block">{stops[0]?.name?.split(" ").slice(0,2).join(" ") ?? "Terminal"}</span>
              <div className="flex items-center gap-1 mt-0.5">
                <Zap className="w-3 h-3 text-[#f7a501]" />
                <span className="text-[11px] font-bold text-[#f7a501]">In {formatMin(T_inbound_sec)}</span>
              </div>
            </div>
          </div>

          {isDelayed && (
            <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 shadow-sm">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span className="text-xs font-bold text-rose-700">Delayed +{delayMin}m</span>
            </div>
          )}
        </div>

        {/* Route card below map */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mt-2 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 rounded-md bg-[#f7a501] text-slate-950 text-[10px] font-extrabold">
                  {selectedAgency.dataStatus === "Chalo Chained Feed" ? "Deluxe" : "LIVE"}
                </span>
                <span className="text-xl font-black text-slate-900">{route?.code}</span>
              </div>
              <span className="text-xs text-slate-500">To {route?.destination}</span>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors">
              View full route <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stop timeline */}
          <div className="flex items-start overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {stops.map((stop, idx) => {
              const isFirst = idx === 0;
              return (
                <div key={stop.id} className="flex flex-col items-center" style={{ minWidth: 80 }}>
                  <div className="flex items-center w-full">
                    {!isFirst && <div className="h-0.5 flex-1 bg-slate-200" />}
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${isFirst ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300"}`}>
                      <Bus className={`w-4 h-4 ${isFirst ? "text-white" : "text-slate-400"}`} />
                    </div>
                    {idx < stops.length - 1 && <div className="h-0.5 flex-1 bg-slate-200" />}
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 text-center mt-1.5 px-1 leading-tight" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {stop.name}
                  </span>
                  <span className={`text-[10px] font-bold mt-0.5 ${isFirst ? "text-[#f7a501]" : "text-slate-500"}`}>
                    {isFirst ? `In ${formatMin(T_inbound_sec)}` : `${stopTimes[idx]} min`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* OCCUPANCY */}
      <div className="px-4 py-2">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
              <Users className="w-[18px] h-[18px] text-slate-600" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Occupancy</span>
              <span className="text-sm font-bold text-slate-900">{OCCUPANCY_LABEL[occupancy_band]}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
            <span className={`w-2 h-2 rounded-full animate-pulse ${OCCUPANCY_DOT[occupancy_band] ?? "bg-emerald-500"}`} />
            <span className="text-xs font-bold text-slate-700">{OCCUPANCY_LABEL[occupancy_band]}</span>
          </div>
        </div>
      </div>

      {/* ADMIN PANEL LINK */}
      <div className="px-4 py-2">
        <a
          href="/admin"
          className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-700 shadow-sm hover:bg-slate-800 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f7a501] flex items-center justify-center shrink-0 shadow-sm">
              <Settings className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="font-black text-white block">Judge Admin Panel</span>
              <span className="text-xs text-slate-400 font-medium">
                Inject controls · API architecture · Event log
              </span>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors shrink-0" />
        </a>
      </div>

      {/* QUICK ACTIONS */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-4 gap-3">
          {[
            { Icon: Bus, label: "Routes", sub: "Browse all routes", dot: false, nav: "routes" as const },
            { Icon: Clock, label: "Timetable", sub: "View bus timings", dot: false, nav: "track" as const },
            { Icon: Search, label: "Search", sub: "Find stops & places", dot: false, nav: "search" as const },
            { Icon: Bell, label: "Alerts", sub: "Service updates", dot: true, nav: null },
          ].map(({ Icon, label, sub, dot, nav }) => (
            <button
              key={label}
              onClick={() => nav && setActiveNav(nav)}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-[#f7a501] hover:bg-amber-50/40 transition-all active:scale-95"
            >
              <div className="relative">
                <Icon className="w-5 h-5 text-slate-600" />
                {dot && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#f7a501] border border-white" />}
              </div>
              <div className="text-center">
                <span className="text-xs font-bold text-slate-900 block">{label}</span>
                <span className="text-[9px] text-slate-500 hidden sm:block">{sub}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* BOTTOM NAV */}
      <BottomNav items={NAV_ITEMS} active={activeNav} onSelect={setActiveNav} />
    </div>
  );
};

// ─── Shared Bottom Nav ────────────────────────────────────────────────────────
type NavId = "home" | "track" | "search" | "routes" | "fav" | "profile";

const BottomNav: React.FC<{
  items: { id: NavId; icon: React.FC<{ className?: string }>; label: string }[];
  active: NavId;
  onSelect: (id: NavId) => void;
}> = ({ items, active, onSelect }) => (
  <nav className="sticky bottom-0 bg-white border-t border-slate-200 shadow-lg px-2 py-2 z-20">
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className="flex flex-col items-center gap-1 py-2 rounded-xl transition-colors"
        >
          <Icon className={`w-5 h-5 ${active === id ? "text-[#f7a501]" : "text-slate-400"}`} />
          <span className={`text-[10px] font-bold ${active === id ? "text-[#f7a501]" : "text-slate-400"}`}>
            {label}
          </span>
        </button>
      ))}
    </div>
  </nav>
);
