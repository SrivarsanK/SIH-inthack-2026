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
  Tv,
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
  onSwitchToKiosk?: () => void;
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
          const isEnd = idx === 0 || idx === stops.length - 1;
          L.circleMarker([s.lat, s.lon], {
            radius: isEnd ? 6 : 4,
            fillColor: isEnd ? "#1e293b" : "#fff",
            fillOpacity: 1,
            color: "#1e293b",
            weight: 2,
          }).addTo(map);
        });

        const busIcon = L.divIcon({
          className: "",
          html: `<div style="position:relative;width:38px;height:38px"><div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,0.25);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite"></div><div style="position:relative;width:38px;height:38px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 4px 12px rgba(37,99,235,0.4);display:flex;align-items:center;justify-content:center"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h20"/><path d="M18 18h2"/><path d="M4 18h2"/><path d="M18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10H3V6Z"/></svg></div></div>`,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });

        markerRef.current = L.marker([data.vehicle.lat, data.vehicle.lon], { icon: busIcon }).addTo(map);
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
  onSwitchToKiosk,
}) => {
  const [activeNav, setActiveNav] = useState<"home" | "track" | "routes" | "search">("home");

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
    { id: "track" as const, icon: Bus, label: "Track Bus" },
    { id: "routes" as const, icon: Star, label: "Routes" },
    { id: "search" as const, icon: Search, label: "Search" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6]">

      {/* TOP HEADER NAVIGATION ("Usual Navigation") */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          
          {/* Logo & Main Nav Links */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveNav("home")}
              className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
            >
              <div className="w-9 h-9 rounded-xl bg-[#f7a501] flex items-center justify-center shadow-sm">
                <Bus className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-xl font-black tracking-tight text-slate-900">TransitSense</span>
            </button>

            {/* Usual Top Navigation Bar for Web */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
                const active = activeNav === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveNav(id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? "bg-amber-50 text-[#b17816] border border-amber-200 shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? "text-[#f7a501]" : "text-slate-400"}`} />
                    <span>{label}</span>
                  </button>
                );
              })}
              <a
                href="/admin"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-slate-900 text-white hover:bg-slate-800 transition-all ml-2 shadow-sm"
              >
                <Settings className="w-3.5 h-3.5 text-[#f7a501]" />
                Judge Admin Panel ↗
              </a>
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenAgencySelector}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors shadow-xs"
            >
              <MapPin className="w-3.5 h-3.5 text-[#f7a501]" />
              <span>{selectedAgency.city}</span>
              <ChevronRight className="w-3 h-3 text-slate-400 rotate-90" />
            </button>

            {onSwitchToKiosk && (
              <button
                onClick={onSwitchToKiosk}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Tv className="w-3.5 h-3.5 text-slate-500" />
                Kiosk
              </button>
            )}

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Live Stream</span>
            </div>
          </div>
        </div>

        {/* Mobile Header Nav Strip */}
        <div className="md:hidden flex items-center gap-1.5 px-4 py-2 bg-slate-50 border-t border-slate-100 overflow-x-auto">
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
            const active = activeNav === id;
            return (
              <button
                key={id}
                onClick={() => setActiveNav(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${
                  active ? "bg-[#f7a501] text-slate-950 shadow-xs" : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
          <a
            href="/admin"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-extrabold bg-slate-900 text-white shrink-0"
          >
            Admin ↗
          </a>
        </div>
      </header>

      {/* BODY CONTENT AREAS */}
      {activeNav === "search" && (
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
          <SearchView selectedAgency={selectedAgency} />
        </div>
      )}

      {activeNav === "track" && (
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
          <RouteDetailView
            data={data}
            selectedAgency={selectedAgency}
            onBack={() => setActiveNav("home")}
          />
        </div>
      )}

      {activeNav === "routes" && (
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
          <RoutesListView
            selectedAgency={selectedAgency}
            onSelectRoute={() => setActiveNav("track")}
            onBack={() => setActiveNav("home")}
          />
        </div>
      )}

      {/* HOME DASHBOARD VIEW */}
      {activeNav === "home" && (
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-6">
          
          {/* Quick Route Selector Bar */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Active Routes:
            </span>
            {selectedAgency.routes.map((r, idx) => (
              <div
                key={r.id}
                onClick={() => setActiveNav("track")}
                className="shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-sm cursor-pointer hover:border-[#f7a501] hover:bg-amber-50/30 transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-[#f7a501]/10">
                  <Bus className="w-4 h-4 text-slate-600 group-hover:text-[#b17816]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-slate-900 text-sm">{r.code}</span>
                    {idx === 0 && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-[#f7a501] text-slate-950">
                        LIVE
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 block truncate max-w-[140px]">
                    To {r.destination}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Responsive Desktop Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Live Map & Bus Details (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Live Map Card */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h2 className="font-black text-slate-900 text-lg">Track Live Bus</h2>
                  </div>
                  <button
                    onClick={() => setActiveNav("track")}
                    className="text-xs font-extrabold text-[#f7a501] hover:underline flex items-center gap-1"
                  >
                    Full Route Details <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-200" style={{ height: 320 }}>
                  <ChaloMap data={data} selectedAgency={selectedAgency} />

                  <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-slate-200 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                      <Bus className="w-5 h-5 text-blue-700" />
                    </div>
                    <div>
                      <span className="font-black text-slate-900 text-sm block">
                        {selectedAgency.shortName}-{route?.code}
                      </span>
                      <span className="text-xs text-slate-600 block">
                        {stops[0]?.name?.split(" ").slice(0, 2).join(" ") ?? "Terminal"}
                      </span>
                      <div className="flex items-center gap-1 mt-1">
                        <Zap className="w-3.5 h-3.5 text-[#f7a501]" />
                        <span className="text-xs font-bold text-[#f7a501]">
                          In {formatMin(T_inbound_sec)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isDelayed && (
                    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 shadow-sm">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span className="text-xs font-bold text-rose-700">Delayed +{delayMin}m</span>
                    </div>
                  )}
                </div>

                {/* Horizontal Timeline Strip */}
                <div className="pt-2">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                    Stop Sequence Timeline
                  </span>
                  <div className="flex items-start overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    {stops.map((stop, idx) => {
                      const isFirst = idx === 0;
                      return (
                        <div key={stop.id} className="flex flex-col items-center shrink-0 min-w-[90px]">
                          <div className="flex items-center w-full">
                            {idx > 0 && <div className="h-0.5 flex-1 bg-slate-200" />}
                            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${isFirst ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300"}`}>
                              <Bus className={`w-3.5 h-3.5 ${isFirst ? "text-white" : "text-slate-400"}`} />
                            </div>
                            {idx < stops.length - 1 && <div className="h-0.5 flex-1 bg-slate-200" />}
                          </div>
                          <span className="text-[10px] font-bold text-slate-800 text-center mt-1.5 px-1 truncate max-w-[85px]">
                            {stop.name}
                          </span>
                          <span className={`text-[10px] font-bold mt-0.5 ${isFirst ? "text-[#f7a501]" : "text-slate-400"}`}>
                            {isFirst ? `In ${formatMin(T_inbound_sec)}` : `${stopTimes[idx]}m`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Search, Stops, Occupancy, Actions (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              
              {/* Search Bar Input */}
              <div
                onClick={() => setActiveNav("search")}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm cursor-pointer hover:border-[#f7a501] transition-all group"
              >
                <Search className="w-5 h-5 text-slate-400 group-hover:text-[#f7a501] shrink-0" />
                <span className="flex-1 text-sm text-slate-400 font-medium">
                  Search bus number, stop or destination...
                </span>
                <Mic className="w-4 h-4 text-slate-400 shrink-0" />
              </div>

              {/* Nearest Bus Stop Card */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-900 text-base">Nearest Bus Stop</h3>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                    Nearest stop
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    <Bus className="w-5 h-5 text-slate-800" />
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-900 text-base block leading-snug">
                      {stops[0]?.name ?? "Majestic Kempegowda BS"}
                    </span>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      {selectedAgency.city} · Live ETAs updated
                    </span>
                  </div>
                </div>

                {/* Upcoming Bus ETA rows */}
                <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
                  {selectedAgency.routes.slice(0, 2).map((r, idx) => {
                    const etaMin = idx === 0
                      ? Math.floor(T_inbound_sec / 60)
                      : Math.floor((T_inbound_sec + T_outbound_sec) / 60);
                    return (
                      <div
                        key={r.id}
                        onClick={() => setActiveNav("track")}
                        className="flex items-center justify-between py-3 cursor-pointer hover:bg-slate-50 transition-colors rounded-xl px-2 -mx-2"
                      >
                        <div className="flex items-center gap-3">
                          <Bus className="w-4 h-4 text-slate-400" />
                          <div>
                            <span className="font-extrabold text-slate-900 text-sm">{r.code}</span>
                            <span className="text-xs text-slate-500 block">To {r.destination}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 font-bold text-sm text-[#f7a501]">
                          <Zap className="w-4 h-4" />
                          <span>{etaMin} min away</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Occupancy Card */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-slate-700" />
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Live Occupancy
                    </span>
                    <span className="text-base font-black text-slate-900">
                      {OCCUPANCY_LABEL[occupancy_band]}
                    </span>
                  </div>
                </div>
                <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
                  <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${OCCUPANCY_DOT[occupancy_band] ?? "bg-emerald-500"}`} />
                  <span className="text-xs font-bold text-slate-700">{OCCUPANCY_LABEL[occupancy_band]}</span>
                </span>
              </div>

              {/* Quick Actions Bar */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { Icon: Bus, label: "Routes", nav: "routes" as const },
                  { Icon: Clock, label: "Timetable", nav: "track" as const },
                  { Icon: Search, label: "Search", nav: "search" as const },
                  { Icon: Settings, label: "Admin", nav: null, isLink: true },
                ].map(({ Icon, label, nav, isLink }) => (
                  isLink ? (
                    <a
                      key={label}
                      href="/admin"
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-slate-900 text-white shadow-sm hover:bg-slate-800 transition-all text-center"
                    >
                      <Icon className="w-5 h-5 text-[#f7a501]" />
                      <span className="text-xs font-extrabold block">{label}</span>
                    </a>
                  ) : (
                    <button
                      key={label}
                      onClick={() => nav && setActiveNav(nav)}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-[#f7a501] hover:bg-amber-50/40 transition-all text-center active:scale-95"
                    >
                      <Icon className="w-5 h-5 text-slate-700" />
                      <span className="text-xs font-bold text-slate-900 block">{label}</span>
                    </button>
                  )
                ))}
              </div>

              {/* Judge Admin Panel Banner Card */}
              <a
                href="/admin"
                className="flex items-center justify-between p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm hover:bg-slate-800 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#f7a501] flex items-center justify-center shrink-0 shadow-sm">
                    <Settings className="w-5 h-5 text-slate-950" />
                  </div>
                  <div>
                    <span className="font-black text-white block text-sm">Judge Injection & Admin Panel</span>
                    <span className="text-xs text-slate-400">
                      Inject delay, dropout & crowd events
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors shrink-0" />
              </a>

            </div>
          </div>
        </main>
      )}

    </div>
  );
};
