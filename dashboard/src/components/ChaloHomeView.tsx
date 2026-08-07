import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Bus,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Home,
  MapPin,
  Menu,
  Mic,
  Navigation,
  Radio,
  Search,
  Settings,
  Star,
  Tv,
  User,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import type { TransitSnapshot } from "../lib/useTransitStream";
import type { TransitAgency } from "../lib/agencies";
import { SearchView } from "./SearchView";
import { RouteDetailView } from "./RouteDetailView";
import { RoutesListView } from "./RoutesListView";
import { AgencySelector } from "./AgencySelector";
import { LiveSignalIcon } from "./LiveSignalIcon";

interface ChaloHomeViewProps {
  data: TransitSnapshot;
  isConnected: boolean;
  selectedAgency: TransitAgency;
  selectedRouteId?: string | null;
  onSelectAgency: (agency: TransitAgency) => void;
  neonRoutes?: any;
  onRouteSelect?: (routeCode: string) => void;
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
const ChaloMap: React.FC<{ data: TransitSnapshot; selectedAgency: TransitAgency; selectedRouteId?: string | null }> = ({
  data,
  selectedAgency,
  selectedRouteId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

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
  selectedRouteId,
  onSelectAgency,
  neonRoutes,
  onRouteSelect,
}) => {
  const [activeNav, setActiveNav] = useState<"home" | "track" | "routes" | "search">("home");
  const [timeStr, setTimeStr] = useState("");
  const [isAgencyDropdownOpen, setIsAgencyDropdownOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number; lon: number} | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "asking" | "granted" | "denied">("idle");

  // Request geolocation on mount and fetch nearest stops
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }
    setLocationStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserLocation(loc);
        setLocationStatus("granted");
        neonRoutes?.fetchNearbyStops?.(loc.lat, loc.lon, 5);
      },
      () => {
        setLocationStatus("denied");
        // Fallback: use Chennai center coords to still show some nearby stops
        neonRoutes?.fetchNearbyStops?.(13.0827, 80.2707, 5);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    const tick = () => setTimeStr(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const timelineRef = useRef<HTMLDivElement>(null);
  const mobileTimelineRef = useRef<HTMLDivElement>(null);

  // Convert vertical mouse wheel / trackpad scroll into horizontal scroll when hovering timeline
  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY * 1.2;
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const route = selectedAgency.routes.find((r) => r.id === selectedRouteId || r.code === selectedRouteId) ?? selectedAgency.routes[0];
  const stops = route?.coords ?? [];
  const { T_total_sec, T_outbound_sec, T_inbound_sec, occupancy_band } = data.inbound;
  const isDelayed = (data.inbound as any).is_delayed ?? false;
  const delayMin = (data.inbound as any).delay_min ?? 0;
  const stopTimes = stops.map((_, i) =>
    Math.round((T_total_sec * (i / Math.max(stops.length - 1, 1))) / 60)
  );

  const TOP_NAV_ITEMS = [
    { id: "home" as const, icon: Home, label: "Home" },
    { id: "track" as const, icon: Bus, label: "Track Bus" },
    { id: "routes" as const, icon: Star, label: "Routes" },
    { id: "search" as const, icon: Search, label: "Search" },
  ];

  const MOBILE_NAV_ITEMS = [
    { id: "home" as const, icon: Home, label: "Home" },
    { id: "track" as const, icon: Bus, label: "Track" },
    { id: "search" as const, icon: Search, label: "Search" },
    { id: "routes" as const, icon: Star, label: "Routes" },
    { id: "profile" as const, icon: User, label: "Profile" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      {/* ... header code ... */}
      {/* (rest of the component rendered below) */}

      {/* MOBILE APP HEADER (Mobile/Tablet UI for < 1024px) */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
        <div className="flex items-center gap-2 select-none">
          <div className="w-8 h-8 rounded-full bg-[#f7a501] flex items-center justify-center shadow-xs">
            <Bus className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900">TransitSense</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setIsAgencyDropdownOpen(!isAgencyDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-extrabold text-slate-900 shadow-2xs"
            >
              <MapPin className="w-3.5 h-3.5 text-slate-900" />
              <span>{selectedAgency.city}</span>
              <ChevronRight className={`w-3 h-3 text-slate-400 transition-transform ${isAgencyDropdownOpen ? "-rotate-90" : "rotate-90"}`} />
            </button>

            <AgencySelector
              selectedAgency={selectedAgency}
              onSelectAgency={onSelectAgency}
              isOpen={isAgencyDropdownOpen}
              onClose={() => setIsAgencyDropdownOpen(false)}
            />
          </div>

          <button className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-2xs relative">
            <Bell className="w-5 h-5 text-slate-800" />
            {isConnected && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#f7a501] border border-white" />}
          </button>
        </div>
      </div>

      {/* DESKTOP HEADER NAVIGATION (Unchanged Web Layout for >= 1024px) */}
      <header className="hidden lg:block bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
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

            {/* Desktop Nav Links */}
            <nav className="flex items-center gap-1">
              {TOP_NAV_ITEMS.map(({ id, icon: Icon, label }) => {
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
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <button
                onClick={() => setIsAgencyDropdownOpen(!isAgencyDropdownOpen)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors shadow-xs"
              >
                <MapPin className="w-3.5 h-3.5 text-[#f7a501]" />
                <span>{selectedAgency.city}</span>
                <ChevronRight className={`w-3 h-3 text-slate-400 transition-transform ${isAgencyDropdownOpen ? "-rotate-90" : "rotate-90"}`} />
              </button>

              <AgencySelector
                selectedAgency={selectedAgency}
                onSelectAgency={onSelectAgency}
                isOpen={isAgencyDropdownOpen}
                onClose={() => setIsAgencyDropdownOpen(false)}
              />
            </div>
          </div>
        </div>
      </header>

      {/* BODY CONTENT AREAS */}
      {activeNav === "search" && (
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
          <SearchView
            selectedAgency={selectedAgency}
            neonRoutes={neonRoutes}
            onSelectRoute={(code) => {
              onRouteSelect?.(code);
              setActiveNav("track");
            }}
          />
        </div>
      )}

      {activeNav === "track" && (
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
          <RouteDetailView
            data={data}
            selectedAgency={selectedAgency}
            selectedRouteId={selectedRouteId}
            onBack={() => setActiveNav("home")}
          />
        </div>
      )}

      {activeNav === "routes" && (
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
          <RoutesListView
            selectedAgency={selectedAgency}
            onSelectRoute={(code) => {
              onRouteSelect?.(code);
              setActiveNav("track");
            }}
            onBack={() => setActiveNav("home")}
          />
        </div>
      )}

      {/* HOME DASHBOARD VIEW */}
      {activeNav === "home" && (
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 space-y-5 sm:space-y-6">

          {/* ══════════════════════════════════════════════════════════════════
              1. MOBILE & TABLET LAYOUT (< 1024px) — Matches Chalo App 1:1
             ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:hidden space-y-5">
            {/* Mobile Search Input Bar */}
            <div
              onClick={() => setActiveNav("search")}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs cursor-pointer hover:border-[#f7a501] transition-all group"
            >
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <span className="flex-1 text-sm text-slate-400 font-medium truncate">
                Search bus number, stop or destination
              </span>
              <Mic className="w-5 h-5 text-slate-400 shrink-0" />
            </div>

            {/* Mobile Horizontal Route Chips Carousel */}
            <div className="flex items-center gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {selectedAgency.routes.map((r, idx) => (
                <div
                  key={r.id}
                  onClick={() => setActiveNav("track")}
                  className="shrink-0 flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-2xs cursor-pointer hover:border-[#f7a501] transition-all min-w-[200px]"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <Bus className="w-4 h-4 text-slate-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-slate-900 text-sm">{r.code}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 text-amber-900">
                        Deluxe
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 block truncate mt-0.5">
                      To {r.destination}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              ))}
            </div>

            {/* Mobile Nearest Bus Stop Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 text-base">Nearest bus stops</h3>
                <div className="flex items-center gap-2">
                  {locationStatus === "granted" && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold flex items-center gap-1">
                      <Navigation className="w-3 h-3" /> GPS
                    </span>
                  )}
                  {locationStatus === "denied" && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-extrabold">
                      Chennai
                    </span>
                  )}
                  <button
                    onClick={() => setActiveNav("routes")}
                    className="text-xs font-extrabold text-[#f7a501] hover:underline flex items-center gap-1 group"
                  >
                    <span>See all stops</span>
                    <span className="w-4 h-4 rounded-full bg-[#f7a501] text-white flex items-center justify-center text-[10px]">➔</span>
                  </button>
                </div>
              </div>

              {neonRoutes?.nearbyLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-6 h-6 border-2 border-[#f7a501] border-t-transparent rounded-full animate-spin" />
                  <span className="ml-2 text-sm text-slate-500 font-medium">Finding nearby stops...</span>
                </div>
              ) : (neonRoutes?.nearbyStops || []).length > 0 ? (
                <div className="space-y-2.5">
                  {(neonRoutes?.nearbyStops || []).map((ns: any, idx: number) => (
                    <div
                      key={ns.stop_id || idx}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-100 hover:bg-white transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          idx === 0 ? "bg-emerald-100 border border-emerald-200" : "bg-slate-100 border border-slate-200"
                        }`}>
                          <MapPin className={`w-4.5 h-4.5 ${idx === 0 ? "text-emerald-700" : "text-slate-600"}`} />
                        </div>
                        <div className="min-w-0">
                          <span className="font-extrabold text-slate-900 text-sm block truncate">{ns.stop_name}</span>
                          {idx === 0 && (
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-extrabold">
                              Nearest stop
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-500 shrink-0 ml-2">
                        {ns.distance_km} km
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-slate-400">
                  {locationStatus === "asking" ? "Requesting location access..." : "No nearby stops found"}
                </div>
              )}
            </div>

            {/* Mobile Track Your Bus Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-slate-900 text-base sm:text-lg">Track your bus</h2>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-700">Live tracking</span>
                </div>
              </div>

              {/* Map View */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100" style={{ height: 280 }}>
                <ChaloMap data={data} selectedAgency={selectedAgency} />

                <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-md border border-slate-200/80 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                    <Bus className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-900 text-xs sm:text-sm block">
                      {selectedAgency.busId || "K1201LF"}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {stops[0]?.name || "Vandalur Gate"}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <LiveSignalIcon className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs font-extrabold text-blue-600">
                        In {formatMin(T_inbound_sec)}
                      </span>
                    </div>
                  </div>
                </div>

                <button className="absolute bottom-3 right-3 z-10 w-9 h-9 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-800 hover:bg-slate-50">
                  <Navigation className="w-4 h-4" />
                </button>
              </div>

              {/* Under-Map Route Footer */}
              <div className="pt-2">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 inline-block mb-1">
                      Deluxe
                    </span>
                    <h4 className="font-black text-slate-900 text-xl">{route?.code ?? "70V"}</h4>
                    <p className="text-xs text-slate-500 font-medium">To {route?.destination ?? "Kilambakkam Bus Terminus"}</p>
                  </div>

                  <button
                    onClick={() => setActiveNav("track")}
                    className="px-3.5 py-1.5 rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center gap-1 shrink-0"
                  >
                    <span>View full route</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>

                {/* Stop Sequence Horizontal Timeline */}
                <div className="pt-3 border-t border-slate-100">
                  <div
                    ref={mobileTimelineRef}
                    className="flex items-start overflow-x-auto pb-3 scroll-smooth touch-pan-x"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {stops.map((stop, idx) => {
                      const isFirst = idx === 0;
                      return (
                        <div key={stop.id} className="flex flex-col items-center shrink-0 min-w-[100px] max-w-[115px] px-1">
                          <div className="flex items-center w-full relative">
                            {idx > 0 && <div className={`h-0.5 flex-1 ${idx <= 1 ? "bg-blue-600" : "bg-slate-200"}`} />}
                            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 z-10 transition-all ${
                              isFirst
                                ? "bg-blue-600 border-blue-600 shadow-md ring-4 ring-blue-100"
                                : "bg-white border-slate-300"
                            }`}>
                              <Bus className={`w-3.5 h-3.5 ${isFirst ? "text-white font-black" : "text-slate-400"}`} />
                            </div>
                            {idx < stops.length - 1 && <div className={`h-0.5 flex-1 ${isFirst ? "bg-blue-600" : "bg-slate-200"}`} />}
                          </div>
                          <span
                            title={stop.name}
                            className="text-[11px] font-bold text-slate-800 text-center mt-2 px-1 leading-snug line-clamp-2 h-7 flex items-center justify-center"
                          >
                            {stop.name}
                          </span>
                          <div className="mt-1">
                            {isFirst ? (
                              <span className="text-[11px] font-bold text-blue-600 block">
                                In {formatMin(T_inbound_sec)}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 block">
                                {stopTimes[idx]} min
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              2. DESKTOP LAYOUT (>= 1024px) — 100% UNCHANGED
             ══════════════════════════════════════════════════════════════════ */}
          <div className="hidden lg:block space-y-5 sm:space-y-6">
            
            {/* Quick Route Selector Bar */}
            <div className="flex items-center gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
                Active Routes:
              </span>
              {selectedAgency.routes.map((r, idx) => (
                <div
                  key={r.id}
                  onClick={() => setActiveNav("track")}
                  className="shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-sm cursor-pointer hover:border-[#f7a501] hover:bg-amber-50/30 transition-all group min-w-[150px]"
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
                    <span className="text-[11px] text-slate-500 block truncate max-w-[120px]">
                      To {r.destination}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Responsive Layout Grid for Desktop */}
            <div className="grid grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Live Map & Bus Details (7 cols) */}
              <div className="col-span-7 space-y-6">
                
                {/* Live Map Card */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <h2 className="font-black text-slate-900 text-lg">Track Live Bus</h2>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                        Route {route?.code}
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveNav("track")}
                      className="text-xs font-extrabold text-[#f7a501] hover:text-amber-600 transition-colors flex items-center gap-1"
                    >
                      Full Route Details <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100" style={{ height: 300 }}>
                    <ChaloMap data={data} selectedAgency={selectedAgency} />

                    <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-md border border-slate-200/80 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                        <Bus className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-900 text-xs sm:text-sm block">
                          {selectedAgency.shortName}-{route?.code}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          To {route?.destination}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <LiveSignalIcon className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-xs font-extrabold text-blue-600">
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
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Stop Sequence Timeline
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500">
                          {stops.length} stops on route
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => timelineRef.current?.scrollBy({ left: -160, behavior: "smooth" })}
                            className="w-6 h-6 rounded-full bg-slate-100 hover:bg-amber-100 hover:text-[#b17816] flex items-center justify-center text-slate-600 transition-colors shadow-2xs"
                            title="Scroll Left"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => timelineRef.current?.scrollBy({ left: 160, behavior: "smooth" })}
                            className="w-6 h-6 rounded-full bg-slate-100 hover:bg-amber-100 hover:text-[#b17816] flex items-center justify-center text-slate-600 transition-colors shadow-2xs"
                            title="Scroll Right"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div
                      ref={timelineRef}
                      className="flex items-start overflow-x-auto pb-3 scroll-smooth touch-pan-x"
                      style={{
                        scrollbarWidth: "thin",
                        scrollbarColor: "#cbd5e1 transparent",
                      }}
                    >
                      {stops.map((stop, idx) => {
                        const isFirst = idx === 0;
                        return (
                          <div key={stop.id} className="flex flex-col items-center shrink-0 min-w-[110px] max-w-[125px] px-1">
                            <div className="flex items-center w-full relative">
                              {idx > 0 && <div className={`h-0.5 flex-1 ${idx <= 1 ? "bg-[#f7a501]" : "bg-slate-200"}`} />}
                              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 z-10 transition-all ${
                                isFirst
                                  ? "bg-[#f7a501] border-[#f7a501] shadow-md ring-4 ring-amber-100"
                                  : "bg-white border-slate-300"
                              }`}>
                                <Bus className={`w-3.5 h-3.5 ${isFirst ? "text-slate-950 font-black" : "text-slate-400"}`} />
                              </div>
                              {idx < stops.length - 1 && <div className={`h-0.5 flex-1 ${isFirst ? "bg-[#f7a501]" : "bg-slate-200"}`} />}
                            </div>
                            <span
                              title={stop.name}
                              className="text-[11px] font-bold text-slate-800 text-center mt-2 px-1 leading-snug line-clamp-2 h-7 flex items-center justify-center"
                            >
                              {stop.name}
                            </span>
                            <div className="mt-1">
                              {isFirst ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-extrabold border border-blue-200">
                                  <LiveSignalIcon className="w-3 h-3 text-blue-500" />
                                  In {formatMin(T_inbound_sec)}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400">
                                  {stopTimes[idx]} min
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Search, Stops, Occupancy (5 cols) */}
              <div className="col-span-5 space-y-5">
                
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
                    <h3 className="font-black text-slate-900 text-base">Nearest bus stops</h3>
                    <div className="flex items-center gap-2">
                      {locationStatus === "granted" && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold flex items-center gap-1">
                          <Navigation className="w-3 h-3" /> GPS
                        </span>
                      )}
                      {locationStatus === "denied" && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-extrabold">
                          Chennai
                        </span>
                      )}
                      <button
                        onClick={() => setActiveNav("routes")}
                        className="text-xs font-extrabold text-[#f7a501] hover:underline flex items-center gap-1 group"
                      >
                        <span>See all stops</span>
                        <span className="w-4 h-4 rounded-full bg-[#f7a501] text-white flex items-center justify-center text-[10px]">➔</span>
                      </button>
                    </div>
                  </div>

                  {neonRoutes?.nearbyLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-6 h-6 border-2 border-[#f7a501] border-t-transparent rounded-full animate-spin" />
                      <span className="ml-2 text-sm text-slate-500 font-medium">Finding nearby stops...</span>
                    </div>
                  ) : (neonRoutes?.nearbyStops || []).length > 0 ? (
                    <div className="space-y-2">
                      {(neonRoutes?.nearbyStops || []).map((ns: any, idx: number) => (
                        <div
                          key={ns.stop_id || idx}
                          className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-100 hover:bg-white transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                              idx === 0 ? "bg-emerald-100 border border-emerald-200" : "bg-slate-100 border border-slate-200"
                            }`}>
                              <MapPin className={`w-4 h-4 ${idx === 0 ? "text-emerald-700" : "text-slate-600"}`} />
                            </div>
                            <div className="min-w-0">
                              <span className="font-extrabold text-slate-900 text-sm block truncate">{ns.stop_name}</span>
                              {idx === 0 && (
                                <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-extrabold">
                                  Nearest stop
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-slate-500 shrink-0 ml-2">
                            {ns.distance_km} km
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-slate-400">
                      {locationStatus === "asking" ? "Requesting location access..." : "No nearby stops found"}
                    </div>
                  )}
                </div>

                {/* Occupancy Card */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-slate-700" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-500 block">Current Bus Crowd</span>
                      <span className="font-black text-slate-900 text-sm block">
                        {OCCUPANCY_LABEL[occupancy_band] ?? "Seats Available"}
                      </span>
                    </div>
                  </div>
                  <span className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                    <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${OCCUPANCY_DOT[occupancy_band] ?? "bg-emerald-500"}`} />
                    <span className="text-xs font-bold text-emerald-800">40 / 55 Seats</span>
                  </span>
                </div>

              </div>
            </div>
          </div>
        </main>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR (Old Chalo UI for Mobile Viewports < 768px) */}
      <nav className="md:hidden sticky bottom-0 bg-white border-t border-slate-200 shadow-lg px-2 py-2 z-40">
        <div className="grid grid-cols-5 gap-1">
          {MOBILE_NAV_ITEMS.map(({ id, icon: Icon, label }) => {
            const active = activeNav === id;
            return (
              <button
                key={id}
                onClick={() => setActiveNav(id as any)}
                className="flex flex-col items-center gap-1 py-1.5 rounded-xl transition-colors"
              >
                <Icon className={`w-5 h-5 ${active ? "text-[#f7a501]" : "text-slate-400"}`} />
                <span className={`text-[10px] font-bold ${active ? "text-[#f7a501]" : "text-slate-400"}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

    </div>
  );
};
