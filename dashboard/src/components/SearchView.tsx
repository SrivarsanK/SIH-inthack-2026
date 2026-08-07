import React, { useState } from "react";
import {
  ArrowLeft,
  Bus,
  ChevronRight,
  Clock,
  Compass,
  MapPin,
  MoreVertical,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import type { TransitAgency } from "../lib/agencies";

interface SearchViewProps {
  selectedAgency: TransitAgency;
  neonRoutes?: any;
  onSelectRoute?: (routeCode: string) => void;
}

// ─── Service Badge ────────────────────────────────────────────────────────────
const ServiceBadge: React.FC<{ type: string }> = ({ type }) => {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    Deluxe: { label: "Deluxe", bg: "#f7a501", text: "#1c1400" },
    Express: { label: "Express", bg: "#16a34a", text: "#fff" },
    AC: { label: "AC", bg: "#0284c7", text: "#fff" },
    Fans: { label: "Fans", bg: "#7c3aed", text: "#fff" },
    Ordinary: { label: "Ordinary", bg: "#6b7280", text: "#fff" },
    MTC: { label: "MTC GTFS", bg: "#2563eb", text: "#fff" },
  };
  const s = map[type] ?? { label: type, bg: "#2563eb", text: "#fff" };
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
};

export const SearchView: React.FC<SearchViewProps> = ({ selectedAgency, neonRoutes, onSelectRoute }) => {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "routes" | "stops">("all");
  const [neonRouteResults, setNeonRouteResults] = useState<any[]>([]);
  const [neonStopResults, setNeonStopResults] = useState<any[]>([]);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced Neon DB search
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

  // Sync neon search results
  React.useEffect(() => {
    if (neonRoutes?.searchResults) setNeonRouteResults(neonRoutes.searchResults);
  }, [neonRoutes?.searchResults]);
  React.useEffect(() => {
    if (neonRoutes?.stopSearchResults) setNeonStopResults(neonRoutes.stopSearchResults);
  }, [neonRoutes?.stopSearchResults]);

  const recentRoutes = selectedAgency.routes.flatMap((r) => [
    { type: "route", badge: "Deluxe", code: r.code, path: `${r.origin} → ${r.destination}` },
    { type: "route", badge: "Express", code: r.code, path: `${r.destination} → ${r.origin}` },
  ]).slice(0, 3);

  const recentStops = selectedAgency.routes[0]?.coords.slice(0, 4).map((s) => ({
    type: "stop",
    name: s.name,
    sub: `${selectedAgency.city} · Active Stop`,
  })) ?? [];

  const recentPlaces = [
    { type: "place", name: selectedAgency.routes[0]?.origin ?? "Origin Stop", sub: `${selectedAgency.city} Terminal` },
    { type: "place", name: selectedAgency.routes[0]?.destination ?? "Destination", sub: `${selectedAgency.city} Terminus` },
  ];

  // Use Neon DB results when available, otherwise fall back to local filter
  const routeResults = query
    ? (neonRouteResults.length > 0
      ? neonRouteResults.map((r: any) => {
          // Use deterministically-inferred origin/destination from normalization pipeline
          const code = r.canonical_code || r.route_short_name;
          const origin = r.origin || r.route_long_name?.split(" TO ")[0]?.trim() || "";
          const dest = r.destination || r.route_long_name?.split(" TO ")[1]?.trim() || "";
          const svcClass = r.service_class || "MTC";
          return {
            routeId: r.route_id,
            code,
            badge: svcClass,
            path: origin && dest ? `${origin} → ${dest}` : r.route_long_name || "",
          };
        })
      : selectedAgency.routes.flatMap((r) => [
          { routeId: r.id, code: r.code, badge: "MTC", path: `${r.origin} → ${r.destination}` },
        ]).filter(
          (r) =>
            r.code.toLowerCase().includes(query.toLowerCase()) ||
            r.path.toLowerCase().includes(query.toLowerCase())
        ))
    : [];

  const stopResults = query
    ? (neonStopResults.length > 0
      ? neonStopResults.map((s: any) => ({ id: s.stop_id, name: s.stop_name, lat: s.stop_lat, lon: s.stop_lon }))
      : (selectedAgency.routes[0]?.coords ?? []).filter((s) =>
          s.name.toLowerCase().includes(query.toLowerCase())
        ))
    : [];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6">

      {/* Search Input Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-[#f7a501]" />
            <h1 className="text-xl font-black text-slate-900">Transit Search</h1>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {selectedAgency.city} Transit Network
          </span>
        </div>

        {/* Large Active Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 focus-within:border-[#f7a501] focus-within:bg-white transition-all shadow-xs">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by bus number (e.g. 101, 21G), stop or destination..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-sm sm:text-base text-slate-900 placeholder-slate-400 outline-none font-bold"
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-full hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold text-slate-400 bg-slate-200 rounded-md">
              ESC
            </kbd>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 pt-1 overflow-x-auto">
          {[
            { id: "all" as const, label: "All Suggestions" },
            { id: "routes" as const, label: "Bus Routes" },
            { id: "stops" as const, label: "Stops & Stations" },
          ].map(({ id, label }) => {
            const active = activeFilter === id;
            return (
              <button
                key={id}
                onClick={() => setActiveFilter(id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                  active
                    ? "bg-[#f7a501] text-slate-950 shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Query Search Results */}
      {query && (
        <div className="space-y-4">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
            Search Results for "{query}"
          </h2>

          {routeResults.length === 0 && stopResults.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <Bus className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-extrabold text-slate-800 text-sm">No matching routes or stops found</p>
              <p className="text-xs text-slate-500">Try searching for "{selectedAgency.routes[0]?.code}" or "{selectedAgency.city}"</p>
            </div>
          ) : (
            <div className="space-y-3">
              {routeResults.map((r, i) => (
                <div
                  key={i}
                  onClick={() => onSelectRoute?.(r.routeId || r.code)}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-[#f7a501] hover:bg-amber-50/20 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                      <Bus className="w-5 h-5 text-[#b17816]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-black text-slate-900 text-base">{r.code}</span>
                        <ServiceBadge type={r.badge} />
                      </div>
                      <span className="text-xs text-slate-500 font-medium">{r.path}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}

              {stopResults.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-[#f7a501] hover:bg-amber-50/20 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 text-sm block">{s.name}</span>
                      <span className="text-xs text-slate-500">{selectedAgency.city} · Active Stop</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Default Recent Searches & Suggestions */}
      {!query && (
        <div className="space-y-6 pt-2">
          
          {/* Recent Routes Section */}
          {(activeFilter === "all" || activeFilter === "routes") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#f7a501]" /> Recent Routes
                </span>
              </div>
              <div className="space-y-2.5">
                {recentRoutes.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-[#f7a501] hover:shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 group-hover:bg-amber-50">
                        <Bus className="w-4 h-4 text-slate-700 group-hover:text-[#b17816]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-black text-slate-900 text-sm">{r.code}</span>
                          <ServiceBadge type={r.badge} />
                        </div>
                        <span className="text-xs text-slate-500 font-medium truncate block">{r.path}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Frequent Bus Stops Section */}
          {(activeFilter === "all" || activeFilter === "stops") && (
            <div className="space-y-3">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#f7a501]" /> Frequent Bus Stops
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentStops.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-[#f7a501] hover:shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-[#b17816]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-slate-900 text-xs block truncate">{s.name}</span>
                      <span className="text-[11px] text-slate-500 block truncate">{s.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Popular Places & Terminals Section */}
          {activeFilter === "all" && (
            <div className="space-y-3">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#f7a501]" /> Terminals & Key Places
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentPlaces.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-[#f7a501] hover:shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 font-extrabold text-xs">
                      {p.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-extrabold text-slate-900 text-xs block truncate">{p.name}</span>
                      <span className="text-[11px] text-slate-500 block truncate">{p.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
