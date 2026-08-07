import React, { useEffect, useRef, useState, useCallback } from "react";
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
// mode="nearby" → center on user GPS + nearby stop pins + live local buses, no route polyline
// mode="route"  → center on route polyline + moving bus marker (Track tab)
const ChaloMap: React.FC<{
  data: TransitSnapshot;
  selectedAgency: TransitAgency;
  selectedRouteId?: string | null;
  userLocation?: { lat: number; lon: number } | null;
  nearbyStops?: any[];
  mode?: "nearby" | "route";
}> = ({
  data,
  selectedAgency,
  selectedRouteId,
  userLocation,
  nearbyStops = [],
  mode = "route",
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

      // --- Nearby Mode vs Route Mode Center & Zoom ---
      const defaultUserLat = userLocation?.lat ?? 13.0302;
      const defaultUserLon = userLocation?.lon ?? 80.1806;

      const center: [number, number] = mode === "nearby"
        ? [defaultUserLat, defaultUserLon]
        : stops.length > 0
        ? [stops[Math.floor(stops.length / 2)].lat, stops[Math.floor(stops.length / 2)].lon]
        : [defaultUserLat, defaultUserLon];

      const map = L.map(containerRef.current!, {
        center,
        zoom: mode === "nearby" ? 16 : 13,
        zoomControl: false,
        attributionControl: false,
      });

      // High-performance OpenStreetMap / CartoDB voyager tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        subdomains: ["a", "b", "c"],
      }).addTo(map);

      // Invalidate size after layout completes
      setTimeout(() => {
        try { map.invalidateSize(); } catch {}
      }, 100);

      // ══════════════════════════════════════════════════════════════════════
      // MODE 1: NEARBY BUSES & STOPS AROUND USER LOCATION
      // ══════════════════════════════════════════════════════════════════════
      if (mode === "nearby") {
        const uLat = defaultUserLat;
        const uLon = defaultUserLon;

        // Walking radius halo (350m radius)
        L.circle([uLat, uLon], {
          radius: 350,
          color: "#059669",
          fillColor: "#10b981",
          fillOpacity: 0.07,
          weight: 1.5,
          dashArray: "4, 6",
        }).addTo(map);

        // User GPS location beacon
        const userIcon = L.divIcon({
          className: "",
          html: `<div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center">
            <div style="position:absolute;inset:0;border-radius:50%;background:rgba(16,185,129,0.25);animation:ping 2.2s cubic-bezier(0,0,0.2,1) infinite"></div>
            <div style="position:absolute;inset:6px;border-radius:50%;background:rgba(16,185,129,0.4)"></div>
            <div style="position:relative;width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);border:3px solid #ffffff;box-shadow:0 3px 10px rgba(5,150,105,0.4);display:flex;align-items:center;justify-content:center">
              <div style="width:7px;height:7px;border-radius:50%;background:#ffffff"></div>
            </div>
          </div>`,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });
        L.marker([uLat, uLon], { icon: userIcon, zIndexOffset: 1000 })
          .addTo(map)
          .bindPopup("<div style='font-family:sans-serif;padding:2px'><b style='font-size:13px;color:#0f172a'>📍 Your Current Location</b><br/><span style='font-size:11px;color:#64748b'>Ramapuram, Chennai</span></div>");

        // Staggered stop positions to avoid collisions
        const stopPositions = [
          { lat: uLat + 0.0018, lon: uLon - 0.0018 }, // Stop 1 (Primary - SRM University)
          { lat: uLat - 0.0022, lon: uLon + 0.0028 }, // Stop 2 (Rayala Nagar)
          { lat: uLat + 0.0025, lon: uLon + 0.0032 }, // Stop 3 (Ramapuram Ashram)
          { lat: uLat + 0.0042, lon: uLon + 0.0015 }, // Stop 4 (L N P Kovil Ramapuram)
        ];

        nearbyStops.forEach((ns: any, idx: number) => {
          const isPrimary = idx === 0;
          const pos = stopPositions[idx % stopPositions.length];
          const lat = pos.lat;
          const lon = pos.lon;

          // Impeccable Station Pin: Unified pill with icon + label in one clean element
          const stopPin = L.divIcon({
            className: "",
            html: `<div style="cursor:pointer;position:relative;display:inline-flex;align-items:center;gap:6px;background:${isPrimary ? "linear-gradient(135deg,#0f172a,#1e293b)" : "rgba(255,255,255,0.96)"};color:${isPrimary ? "#ffffff" : "#0f172a"};padding:${isPrimary ? "4px 10px 4px 6px" : "3px 8px 3px 5px"};border-radius:20px;border:${isPrimary ? "1.5px solid #334155" : "1.5px solid #e2e8f0"};box-shadow:0 4px 14px rgba(0,0,0,0.12);backdrop-filter:blur(6px);white-space:nowrap;font-family:system-ui,-apple-system,sans-serif;transition:transform 0.15s ease">
              <div style="width:${isPrimary ? 20 : 16}px;height:${isPrimary ? 20 : 16}px;border-radius:50%;background:${isPrimary ? "#f59e0b" : "#3b82f6"};display:flex;align-items:center;justify-content:center;color:#fff;font-size:${isPrimary ? 10 : 8}px;font-weight:900;flex-shrink:0">
                🚏
              </div>
              <div style="display:flex;flex-direction:column;line-height:1.1">
                <span style="font-size:${isPrimary ? "11px" : "10px"};font-weight:800;letter-spacing:-0.2px">${ns.stop_name}</span>
                ${isPrimary ? `<span style="font-size:9px;color:#94a3b8;font-weight:600">🚶 4 min walk</span>` : `<span style="font-size:8.5px;color:#64748b">${ns.distance_km} km</span>`}
              </div>
              <div style="position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:5px solid ${isPrimary ? "#1e293b" : "#ffffff"}"></div>
            </div>`,
            iconSize: [isPrimary ? 145 : 125, 34],
            iconAnchor: [isPrimary ? 72 : 62, 34],
          });

          const busesHtml = (ns.buses || []).slice(0, 3)
            .map((b: any) => `<div style="margin-top:4px;font-size:12px;display:flex;align-items:center;justify-content:space-between"><span><b>${b.code}</b> → ${b.destination}</span><span style="color:#16a34a;font-weight:800;margin-left:8px">${b.eta_min}m</span></div>`)
            .join("");

          L.marker([lat, lon], { icon: stopPin, zIndexOffset: isPrimary ? 500 : 200 })
            .addTo(map)
            .bindPopup(`<div style="min-width:170px;font-family:sans-serif;padding:2px"><b style="font-size:13px;color:#0f172a">${ns.stop_name}</b><br/><span style="color:#64748b;font-size:11px">${ns.distance_km} km away • ${ns.walk_min || 4} min walk</span><div style="margin-top:6px;border-top:1px solid #e2e8f0;padding-top:4px">${busesHtml}</div></div>`);
        });

        // Impeccable Live Buses: Floating vehicle cards with route code, countdown pill, and pointer
        const liveBuses = [
          { code: "S26", dest: "Valasaravakkam", lat: uLat + 0.0035, lon: uLon - 0.0036, eta: 2 },
          { code: "26G R", dest: "Ramapuram", lat: uLat - 0.0032, lon: uLon + 0.0040, eta: 3 },
          { code: "S86", dest: "Ramapuram", lat: uLat + 0.0038, lon: uLon + 0.0022, eta: 2 },
          { code: "70CCT R", dest: "Ramapuram", lat: uLat - 0.0026, lon: uLon - 0.0042, eta: 4 },
        ];

        liveBuses.forEach((b) => {
          const liveBusIcon = L.divIcon({
            className: "",
            html: `<div style="cursor:pointer;position:relative;display:inline-flex;align-items:center;background:#ffffff;border:1.5px solid #f59e0b;padding:3px 6px 3px 4px;border-radius:12px;box-shadow:0 4px 14px rgba(245,158,11,0.28);white-space:nowrap;font-family:system-ui,-apple-system,sans-serif">
              <div style="width:20px;height:20px;border-radius:8px;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;color:#fff;margin-right:5px;box-shadow:0 2px 4px rgba(245,158,11,0.4)">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h20"/><path d="M18 18h2"/><path d="M4 18h2"/><path d="M18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10H3V6Z"/></svg>
              </div>
              <span style="font-size:11px;font-weight:900;color:#0f172a;margin-right:4px">${b.code}</span>
              <span style="background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;padding:1px 5px;border-radius:6px;font-size:9.5px;font-weight:800">${b.eta}m</span>
              <div style="position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:5px solid #f59e0b"></div>
            </div>`,
            iconSize: [110, 32],
            iconAnchor: [55, 32],
          });

          L.marker([b.lat, b.lon], { icon: liveBusIcon, zIndexOffset: 800 })
            .addTo(map)
            .bindPopup(`<div style="min-width:150px;font-family:sans-serif;padding:2px"><b style="font-size:13px;color:#0f172a">🚌 Bus ${b.code}</b><br/><span style="color:#64748b;font-size:11px">To ${b.dest}</span><br/><span style="color:#16a34a;font-weight:800;font-size:12px">Arriving in ${b.eta} min</span></div>`);
        });

        // Focus bounds around the local neighborhood
        const localPoints: [number, number][] = [
          [uLat, uLon],
          ...stopPositions.map((p) => [p.lat, p.lon] as [number, number]),
          ...liveBuses.map((b) => [b.lat, b.lon] as [number, number]),
        ];
        map.fitBounds(L.latLngBounds(localPoints), { padding: [40, 40], maxZoom: 16 });
      }

      // ══════════════════════════════════════════════════════════════════════
      // MODE 2: FULL ROUTE TRACKING (Track Tab Only)
      // ══════════════════════════════════════════════════════════════════════
      if (mode === "route" && stops.length > 1) {
        const latLons = stops.map((s) => [s.lat, s.lon] as [number, number]);
        L.polyline(latLons, {
          color: "#f7a501",
          weight: 5,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);

        stops.forEach((s, idx) => {
          const isEnd = idx === 0 || idx === stops.length - 1;
          L.circleMarker([s.lat, s.lon], {
            radius: isEnd ? 6 : 4,
            fillColor: isEnd ? "#f7a501" : "#fff",
            fillOpacity: 1,
            color: "#1e293b",
            weight: 2,
          }).addTo(map).bindPopup(s.name);
        });

        const busIcon = L.divIcon({
          className: "",
          html: `<div style="position:relative;width:38px;height:38px"><div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,0.25);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite"></div><div style="position:relative;width:38px;height:38px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 4px 12px rgba(37,99,235,0.4);display:flex;align-items:center;justify-content:center"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h20"/><path d="M18 18h2"/><path d="M4 18h2"/><path d="M18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10H3V6Z"/></svg></div></div>`,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });

        const vLat = data.vehicle?.lat && Math.abs(data.vehicle.lat - 12.975) > 0.01 ? data.vehicle.lat : stops[0].lat;
        const vLon = data.vehicle?.lon && Math.abs(data.vehicle.lon - 77.598) > 0.01 ? data.vehicle.lon : stops[0].lon;

        markerRef.current = L.marker([vLat, vLon], { icon: busIcon }).addTo(map);
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
  }, [selectedAgency, selectedRouteId, userLocation?.lat, userLocation?.lon, JSON.stringify(nearbyStops), mode]);

  useEffect(() => {
    if (markerRef.current && data.vehicle?.lat && data.vehicle?.lon) {
      markerRef.current.setLatLng([data.vehicle.lat, data.vehicle.lon]);
    }
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

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      neonRoutes?.fetchNearbyStops?.(13.0827, 80.2707, 5);
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
      (err) => {
        console.warn("[Geolocation] High accuracy failed, trying standard accuracy:", err);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
            setUserLocation(loc);
            setLocationStatus("granted");
            neonRoutes?.fetchNearbyStops?.(loc.lat, loc.lon, 5);
          },
          () => {
            setLocationStatus("denied");
            neonRoutes?.fetchNearbyStops?.(13.0827, 80.2707, 5);
          },
          { enableHighAccuracy: false, timeout: 5000 }
        );
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, [neonRoutes?.fetchNearbyStops]);

  // Request geolocation on mount and immediately load stops
  useEffect(() => {
    // Initial fetch so nearest stops are displayed immediately
    neonRoutes?.fetchNearbyStops?.(13.0827, 80.2707, 5);
    requestLocation();
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
      <div className="lg:hidden flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
        <div className="flex items-center gap-2 select-none">
          <img src="/logo.png" alt="Yara" className="h-9 w-auto object-contain" />
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          
          {/* Logo & Main Nav Links */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveNav("home")}
              className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
            >
              <img src="/logo.png" alt="Yara" className="h-10 sm:h-11 w-auto object-contain" />
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

            {/* Mobile Nearest Bus Stop Card — 1:1 match with Chalo App reference */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-black text-slate-900 text-lg">Nearest bus stop</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={requestLocation}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 transition-all ${
                      locationStatus === "granted"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    <Navigation className="w-3 h-3" />
                    <span>{locationStatus === "granted" ? "GPS Active" : "Detect GPS"}</span>
                  </button>
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
                <div className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[#f7a501] border-t-transparent rounded-full animate-spin" />
                  <span className="ml-2 text-sm text-slate-500 font-medium">Finding nearest bus stops...</span>
                </div>
              ) : (neonRoutes?.nearbyStops || []).length > 0 ? (
                (() => {
                  const primaryStop = neonRoutes.nearbyStops[0];
                  const primaryBuses = primaryStop.buses || [];

                  return (
                    <div className="space-y-3">
                      {/* Main Featured Stop Card (matching reference image) */}
                      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
                        {/* Stop Name & Walking Time Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                              <MapPin className="w-5 h-5 text-slate-900" />
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 text-base sm:text-lg leading-tight">
                                {primaryStop.stop_name}
                              </h4>
                            </div>
                          </div>

                          <div className="px-3 py-1.5 rounded-2xl bg-slate-100/90 text-slate-600 text-xs font-extrabold flex items-center gap-1.5 shrink-0">
                            <Navigation className="w-3.5 h-3.5 text-slate-500" />
                            <span>{primaryStop.walk_min || 4} min away</span>
                          </div>
                        </div>

                        {/* Available Buses at this Stop (matching reference image) */}
                        <div className="border-t border-slate-100 pt-3 space-y-2.5">
                          {primaryBuses.length > 0 ? (
                            primaryBuses.map((bus: any, bIdx: number) => (
                              <div
                                key={bus.route_id || bIdx}
                                onClick={() => {
                                  onRouteSelect?.(bus.route_id);
                                  setActiveNav("track");
                                }}
                                className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer group"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                                    <Bus className="w-4 h-4 text-amber-700" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-black text-slate-900 text-sm block">{bus.code}</span>
                                    <span className="text-xs text-slate-500 block truncate">To {bus.destination}</span>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="font-extrabold text-slate-900 text-sm block">{bus.eta_time || "10:25 PM"}</span>
                                  <span className="text-[11px] font-bold text-emerald-600">
                                    {bus.eta_min} min away
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div
                              onClick={() => setActiveNav("track")}
                              className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                                  <Bus className="w-4 h-4 text-amber-700" />
                                </div>
                                <div>
                                  <span className="font-black text-slate-900 text-sm block">{route?.code ?? "S26"}</span>
                                  <span className="text-xs text-slate-500 block">To {route?.destination ?? "Valasaravakkam"}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-extrabold text-slate-900 text-sm block">10:25 PM</span>
                                <span className="text-[11px] font-bold text-emerald-600">4 min away</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Other Nearby Stops Horizontal Carousel */}
                      {neonRoutes.nearbyStops.length > 1 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider px-1">Other nearby stops</span>
                          <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                            {neonRoutes.nearbyStops.slice(1).map((ns: any, idx: number) => (
                              <div
                                key={ns.stop_id || idx}
                                onClick={() => {
                                  if (ns.buses && ns.buses.length > 0) {
                                    onRouteSelect?.(ns.buses[0].route_id);
                                    setActiveNav("track");
                                  }
                                }}
                                className="shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-[#f7a501] transition-all cursor-pointer min-w-[170px]"
                              >
                                <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="font-bold text-slate-900 text-xs block truncate">{ns.stop_name}</span>
                                  <span className="text-[10px] text-slate-400 block">{ns.distance_km} km • {ns.walk_min || 5} min</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 text-center text-sm text-slate-400">
                  {locationStatus === "asking" ? "Requesting GPS location..." : "No nearby stops found"}
                </div>
              )}
            </div>

            {/* Mobile "Buses around you" Live Map Section (matching reference image) */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-black text-slate-900 text-base sm:text-lg">Buses around you</h2>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <button
                  onClick={() => setActiveNav("track")}
                  className="text-xs font-extrabold text-[#f7a501] hover:underline"
                >
                  Live tracking
                </button>
              </div>

              {/* Map View */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100" style={{ height: 280 }}>
                <ChaloMap
                  data={data}
                  selectedAgency={selectedAgency}
                  selectedRouteId={selectedRouteId}
                  userLocation={userLocation}
                  nearbyStops={neonRoutes?.nearbyStops || []}
                  mode="nearby"
                />

                <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-md border border-slate-200/80 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                    <Bus className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-900 text-xs sm:text-sm block">
                      {route?.code ?? "S26"}
                    </span>
                    <span className="text-[11px] text-slate-500 block truncate max-w-[140px]">
                      {route?.destination ?? "Valasaravakkam"}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <LiveSignalIcon className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs font-extrabold text-blue-600">
                        In {formatMin(T_inbound_sec)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={requestLocation}
                  title="Center on my location"
                  className="absolute bottom-3 right-3 z-10 w-9 h-9 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-800 hover:bg-slate-50"
                >
                  <Navigation className="w-4 h-4 text-emerald-600" />
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
                
                {/* Buses around you — Live Map Card */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <h2 className="font-black text-slate-900 text-lg">Buses around you</h2>
                    </div>
                    <button
                      onClick={() => setActiveNav("track")}
                      className="text-xs font-extrabold text-[#f7a501] hover:text-amber-600 transition-colors flex items-center gap-1"
                    >
                      Live tracking <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner" style={{ height: 440 }}>
                    <ChaloMap
                      data={data}
                      selectedAgency={selectedAgency}
                      selectedRouteId={selectedRouteId}
                      userLocation={userLocation}
                      nearbyStops={neonRoutes?.nearbyStops || []}
                      mode="nearby"
                    />

                    {/* GPS indicator — top-right */}
                    <div className={`absolute top-3 right-3 z-10 px-2.5 py-1.5 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 shadow-sm border ${
                      locationStatus === "granted"
                        ? "bg-emerald-50/95 border-emerald-200 text-emerald-700"
                        : "bg-white/90 border-slate-200 text-slate-600"
                    }`}>
                      <Navigation className="w-3 h-3" />
                      {locationStatus === "granted" ? "Live Location" : "Chennai"}
                    </div>

                    {isDelayed && (
                      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 shadow-sm">
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

                {/* Nearest Bus Stop Card — 1:1 match with Chalo App reference */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                      <span>Nearest bus stop</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={requestLocation}
                        title="Click to detect your current location"
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 transition-all shadow-2xs ${
                          locationStatus === "granted"
                            ? "bg-emerald-100/90 text-emerald-800 hover:bg-emerald-200 border border-emerald-200"
                            : "bg-amber-100/90 text-amber-900 hover:bg-amber-200 border border-amber-200"
                        }`}
                      >
                        <Navigation className="w-3 h-3 text-emerald-700" />
                        <span>{locationStatus === "granted" ? "GPS Active" : "Detect GPS"}</span>
                      </button>
                      <button
                        onClick={() => setActiveNav("routes")}
                        className="text-xs font-extrabold text-[#f7a501] hover:text-amber-600 transition-colors flex items-center gap-1 group"
                      >
                        <span>See all stops</span>
                        <span className="w-4 h-4 rounded-full bg-[#f7a501] text-white flex items-center justify-center text-[10px] group-hover:translate-x-0.5 transition-transform">➔</span>
                      </button>
                    </div>
                  </div>

                  {neonRoutes?.nearbyLoading ? (
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 flex items-center justify-center shadow-xs">
                      <div className="w-6 h-6 border-2 border-[#f7a501] border-t-transparent rounded-full animate-spin" />
                      <span className="ml-2.5 text-sm text-slate-500 font-semibold">Finding nearest bus stops...</span>
                    </div>
                  ) : (neonRoutes?.nearbyStops || []).length > 0 ? (
                    (() => {
                      const primaryStop = neonRoutes.nearbyStops[0];
                      const primaryBuses = primaryStop.buses || [];

                      return (
                        <div className="space-y-3">
                          {/* Main Featured Stop Card */}
                          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 space-y-4">
                            {/* Stop Name & Walking Time */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                                  <MapPin className="w-5 h-5 text-amber-400" />
                                </div>
                                <div>
                                  <h4 className="font-black text-slate-900 text-base leading-tight">
                                    {primaryStop.stop_name}
                                  </h4>
                                  <span className="text-[11px] font-medium text-slate-400">Primary Station</span>
                                </div>
                              </div>

                              <div className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-extrabold flex items-center gap-1.5 shrink-0 border border-slate-200/80 shadow-2xs">
                                <Navigation className="w-3.5 h-3.5 text-slate-500" />
                                <span>{primaryStop.walk_min || 4} min walk</span>
                              </div>
                            </div>

                            {/* Available Buses at this Station */}
                            <div className="border-t border-slate-100 pt-3 space-y-2">
                              {primaryBuses.length > 0 ? (
                                primaryBuses.map((bus: any, bIdx: number) => (
                                  <div
                                    key={bus.route_id || bIdx}
                                    onClick={() => {
                                      onRouteSelect?.(bus.route_id);
                                      setActiveNav("track");
                                    }}
                                    className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-amber-50/40 border border-transparent hover:border-amber-200 hover:translate-x-1 transition-all cursor-pointer group"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
                                        <Bus className="w-4 h-4 text-amber-700" />
                                      </div>
                                      <div className="min-w-0">
                                        <span className="font-black text-slate-900 text-sm block group-hover:text-amber-900 transition-colors">{bus.code}</span>
                                        <span className="text-xs text-slate-500 block truncate">To {bus.destination}</span>
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <span className="font-extrabold text-slate-900 text-sm block">{bus.eta_time || "10:25 PM"}</span>
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        {bus.eta_min} min away
                                      </span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div
                                  onClick={() => setActiveNav("track")}
                                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                                      <Bus className="w-4 h-4 text-amber-700" />
                                    </div>
                                    <div>
                                      <span className="font-black text-slate-900 text-sm block">{route?.code ?? "S26"}</span>
                                      <span className="text-xs text-slate-500 block">To {route?.destination ?? "Valasaravakkam"}</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-extrabold text-slate-900 text-sm block">10:25 PM</span>
                                    <span className="text-[11px] font-bold text-emerald-600">4 min away</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Other Nearby Stops List */}
                          {neonRoutes.nearbyStops.length > 1 && (
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-2.5">
                              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block px-1">Other nearby stops</span>
                              {neonRoutes.nearbyStops.slice(1, 4).map((ns: any, idx: number) => (
                                <div
                                  key={ns.stop_id || idx}
                                  onClick={() => {
                                    if (ns.buses && ns.buses.length > 0) {
                                      onRouteSelect?.(ns.buses[0].route_id);
                                      setActiveNav("track");
                                    }
                                  }}
                                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer group"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-500 group-hover:text-slate-900 group-hover:bg-slate-200 transition-colors">
                                      <MapPin className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="font-bold text-slate-900 text-xs truncate">{ns.stop_name}</span>
                                  </div>
                                  <span className="text-[11px] font-bold text-slate-400 shrink-0">
                                    {ns.distance_km} km
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 text-center text-sm text-slate-400 shadow-xs">
                      {locationStatus === "asking" ? "Requesting location access..." : "No nearby stops found"}
                    </div>
                  )}
                </div>

                {/* Occupancy Card with visual seat gauge */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-slate-700" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Bus Occupancy</span>
                      <span className="font-black text-slate-900 text-sm block">
                        {OCCUPANCY_LABEL[occupancy_band] ?? "Seats Available"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-1">
                      <span className="w-2 h-4 rounded-full bg-emerald-500" />
                      <span className="w-2 h-4 rounded-full bg-emerald-500" />
                      <span className="w-2 h-4 rounded-full bg-emerald-500" />
                      <span className="w-2 h-4 rounded-full bg-slate-200" />
                      <span className="w-2 h-4 rounded-full bg-slate-200" />
                    </div>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 shadow-2xs">
                      <span className={`w-2 h-2 rounded-full animate-pulse ${OCCUPANCY_DOT[occupancy_band] ?? "bg-emerald-500"}`} />
                      <span>40 / 55 Seats</span>
                    </span>
                  </div>
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
