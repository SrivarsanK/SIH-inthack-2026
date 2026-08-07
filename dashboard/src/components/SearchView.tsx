import React, { useState } from "react";
import {
  ArrowRight,
  Bus,
  ChevronRight,
  Clock,
  Compass,
  Flag,
  MapPin,
  Navigation,
  Search,
  Star,
  X,
  Zap,
} from "lucide-react";
import type { TransitAgency } from "../lib/agencies";

interface SearchViewProps {
  selectedAgency: TransitAgency;
  neonRoutes?: any;
  onSelectRoute?: (routeCode: string) => void;
}

// ─── Service Badge ─────────────────────────────────────────────────────────────
const ServiceBadge: React.FC<{ type: string }> = ({ type }) => {
  const map: Record<string, { label: string; bg: string; text: string; icon?: React.ReactNode }> = {
    Deluxe:   { label: "Deluxe",    bg: "#f7a501", text: "#1c1400" },
    Express:  { label: "Express",   bg: "#16a34a", text: "#fff" },
    AC:       { label: "AC",        bg: "#0284c7", text: "#fff" },
    Fans:     { label: "Fans",      bg: "#7c3aed", text: "#fff" },
    Ordinary: { label: "Ordinary",  bg: "#6b7280", text: "#fff" },
    MTC:      { label: "MTC GTFS",  bg: "#2563eb", text: "#fff" },
    Outbound: { label: "Outbound",  bg: "#0ea5e9", text: "#fff" },
    Return:   { label: "Return",    bg: "#8b5cf6", text: "#fff" },
  };
  const s = map[type] ?? { label: type, bg: "#2563eb", text: "#fff" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold leading-tight"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
};

// ─── Filter config ─────────────────────────────────────────────────────────────
const FILTERS = [
  { id: "all"    as const, label: "All Suggestions", icon: <Zap className="w-3.5 h-3.5" /> },
  { id: "routes" as const, label: "Bus Routes",      icon: <Bus className="w-3.5 h-3.5" /> },
  { id: "stops"  as const, label: "Stops & Stations",icon: <MapPin className="w-3.5 h-3.5" /> },
];

export const SearchView: React.FC<SearchViewProps> = ({ selectedAgency, neonRoutes, onSelectRoute }) => {
  const [query, setQuery]               = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "routes" | "stops">("all");
  const [neonRouteResults, setNeonRouteResults] = useState<any[]>([]);
  const [neonStopResults,  setNeonStopResults]  = useState<any[]>([]);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Debounced Neon DB search ──────────────────────────────────────────────
  React.useEffect(() => {
    if (!query.trim() || !neonRoutes) {
      setNeonRouteResults([]);
      setNeonStopResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      await neonRoutes.searchRoutes(query);
      await neonRoutes.searchStops(query);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, neonRoutes]);

  React.useEffect(() => {
    if (neonRoutes?.searchResults) setNeonRouteResults(neonRoutes.searchResults);
  }, [neonRoutes?.searchResults]);
  React.useEffect(() => {
    if (neonRoutes?.stopSearchResults) setNeonStopResults(neonRoutes.stopSearchResults);
  }, [neonRoutes?.stopSearchResults]);

  // ── Data ──────────────────────────────────────────────────────────────────
  const recentRoutes = selectedAgency.routes.flatMap((r) => [
    { code: r.code, routeId: r.id, badge: "Deluxe",   path: `${r.origin} → ${r.destination}` },
    { code: r.code, routeId: `${r.id}-r`, badge: "Express",  path: `${r.destination} → ${r.origin}` },
  ]).slice(0, 3);

  const recentStops = selectedAgency.routes[0]?.coords.slice(0, 4).map((s) => ({
    name: s.name,
    sub: `${selectedAgency.city} · Active Stop`,
    lat: s.lat,
    lon: s.lon,
  })) ?? [];

  const recentPlaces = [
    { name: selectedAgency.routes[0]?.origin      ?? "Origin Stop", sub: `${selectedAgency.city} Terminal`,  routeId: selectedAgency.routes[0]?.id },
    { name: selectedAgency.routes[0]?.destination ?? "Destination",  sub: `${selectedAgency.city} Terminus`, routeId: selectedAgency.routes[0]?.id },
  ];

  const routeResults = query
    ? (neonRouteResults.length > 0
      ? neonRouteResults.map((r: any) => {
          const code = r.canonical_code || r.route_short_name;
          const origin = r.origin || r.route_long_name?.split(" TO ")[0]?.trim() || "";
          const dest   = r.destination || r.route_long_name?.split(" TO ")[1]?.trim() || "";
          const dirLabel = r.direction_label || (r.direction_id === 1 ? "Return" : "Outbound");
          return { routeId: r.route_id, code, badge: dirLabel, path: origin && dest ? `${origin} → ${dest}` : r.route_long_name || "" };
        })
      : selectedAgency.routes.flatMap((r) => [
          { routeId: `${r.id}`,    code: r.code, badge: "Outbound", path: `${r.origin} → ${r.destination}` },
          { routeId: `${r.id}-r`,  code: r.code, badge: "Return",   path: `${r.destination} → ${r.origin}` },
        ]).filter((r) =>
          r.code.toLowerCase().includes(query.toLowerCase()) ||
          r.path.toLowerCase().includes(query.toLowerCase())
        ))
    : [];

  const stopResults = query
    ? (neonStopResults.length > 0
      ? neonStopResults.map((s: any) => ({ id: s.stop_id, name: s.stop_name, lat: s.stop_lat, lon: s.stop_lon }))
      : (selectedAgency.routes[0]?.coords ?? []).filter((s) => s.name.toLowerCase().includes(query.toLowerCase())))
    : [];

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* ── Top Header Card ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
              <Search className="w-4.5 h-4.5 text-[#f7a501]" style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 leading-tight">Transit Search</h1>
              <p className="text-[11px] text-slate-400 font-semibold">{selectedAgency.city} Transit Network</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-emerald-700">Live</span>
          </div>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 focus-within:border-[#f7a501] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(247,165,1,0.08)] transition-all">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by bus number (e.g. 101, 21G), stop or destination..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none font-semibold"
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              className="p-1.5 rounded-full bg-slate-200 hover:bg-slate-300 transition-colors shrink-0"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5 text-slate-600" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold text-slate-400 bg-slate-200 rounded-md shrink-0">
              ESC
            </kbd>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 pt-3 overflow-x-auto pb-0.5">
          {FILTERS.map(({ id, label, icon }) => {
            const active = activeFilter === id;
            return (
              <button
                key={id}
                onClick={() => setActiveFilter(id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                  active
                    ? "bg-[#f7a501] text-slate-950 shadow-sm"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                }`}
              >
                {icon}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Search Results ───────────────────────────────────────────────── */}
      {query && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm px-5 py-4 space-y-4">
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Results for "{query}"
            </span>
          </div>

          {routeResults.length === 0 && stopResults.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Bus className="w-6 h-6 text-slate-400" />
              </div>
              <p className="font-extrabold text-slate-800 text-sm">No routes or stops found</p>
              <p className="text-xs text-slate-400">Try "{selectedAgency.routes[0]?.code}" or "{selectedAgency.city}"</p>
            </div>
          ) : (
            <div className="space-y-2">
              {routeResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => onSelectRoute?.(r.routeId || r.code)}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#f7a501] hover:bg-amber-50/30 active:scale-[0.99] transition-all cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-amber-200 flex items-center justify-center shrink-0 group-hover:bg-amber-50 transition-colors">
                      <Bus className="w-4 h-4 text-[#b17816]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-black text-slate-900 text-sm">{r.code}</span>
                        <ServiceBadge type={r.badge} />
                      </div>
                      <span className="text-xs text-slate-500 font-medium">{r.path}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#f7a501] shrink-0 ml-2 transition-colors" />
                </button>
              ))}
              {stopResults.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onSelectRoute?.(s.id || s.name)}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 active:scale-[0.99] transition-all cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 text-sm block">{s.name}</span>
                      <span className="text-xs text-slate-400">{selectedAgency.city} · Active Stop</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 shrink-0 ml-2 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Default Suggestions ──────────────────────────────────────────── */}
      {!query && (
        <div className="space-y-4">

          {/* Recent Routes */}
          {(activeFilter === "all" || activeFilter === "routes") && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#f7a501]" />
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Recent Routes</span>
                </div>
                <button className="text-[11px] font-bold text-[#f7a501] hover:underline">See all</button>
              </div>
              <div className="space-y-2">
                {recentRoutes.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => onSelectRoute?.(r.routeId || r.code)}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-[#f7a501] hover:bg-amber-50/30 active:scale-[0.99] transition-all cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 group-hover:border-amber-200 group-hover:bg-amber-50 transition-colors">
                        <Bus className="w-4 h-4 text-slate-500 group-hover:text-[#b17816] transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-black text-slate-900 text-sm">{r.code}</span>
                          <ServiceBadge type={r.badge} />
                        </div>
                        <span className="text-xs text-slate-500 font-medium truncate block">{r.path}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#f7a501] shrink-0 ml-2 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Frequent Bus Stops */}
          {(activeFilter === "all" || activeFilter === "stops") && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-[#f7a501]" />
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Frequent Bus Stops</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {recentStops.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => onSelectRoute?.(s.name)}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-[#f7a501] hover:bg-amber-50/30 active:scale-[0.99] transition-all cursor-pointer group text-left w-full"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
                      <MapPin className="w-4 h-4 text-[#b17816]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-slate-900 text-xs block truncate">{s.name}</span>
                      <span className="text-[11px] text-slate-400 block truncate">{s.sub}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#f7a501] shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Terminals & Key Places */}
          {activeFilter === "all" && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm px-5 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <Flag className="w-3.5 h-3.5 text-[#f7a501]" />
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Terminals & Key Places</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {recentPlaces.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => onSelectRoute?.(p.routeId || p.name)}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-[#f7a501] hover:bg-amber-50/30 active:scale-[0.99] transition-all cursor-pointer group text-left w-full"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-900 group-hover:bg-[#1e293b] text-white flex items-center justify-center shrink-0 font-extrabold text-xs transition-colors shadow-sm">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-extrabold text-slate-900 text-xs block truncate">{p.name}</span>
                      <span className="text-[11px] text-slate-400 block truncate">{p.sub}</span>
                    </div>
                    <Navigation className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#f7a501] shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
