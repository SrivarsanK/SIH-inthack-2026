import React, { useState } from "react";
import {
  ArrowLeft,
  Bus,
  ChevronRight,
  Clock,
  MapPin,
  MoreVertical,
  Search,
  X,
} from "lucide-react";
import type { TransitAgency } from "../lib/agencies";

interface SearchViewProps {
  selectedAgency: TransitAgency;
}

// ─── Service Badge ────────────────────────────────────────────────────────────
const ServiceBadge: React.FC<{ type: string }> = ({ type }) => {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    Deluxe: { label: "Deluxe", bg: "#f7a501", text: "#1c1400" },
    Express: { label: "Express", bg: "#16a34a", text: "#fff" },
    AC: { label: "AC", bg: "#0284c7", text: "#fff" },
    Fans: { label: "Fans", bg: "#7c3aed", text: "#fff" },
    Ordinary: { label: "Ordinary", bg: "#6b7280", text: "#fff" },
  };
  const s = map[type] ?? { label: type, bg: "#6b7280", text: "#fff" };
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded-md text-[9px] font-extrabold"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
};

export const SearchView: React.FC<SearchViewProps> = ({ selectedAgency }) => {
  const [query, setQuery] = useState("");

  // Recent searches built from agency routes
  const recentRoutes = selectedAgency.routes.flatMap((r) => [
    { type: "route", badge: "Deluxe", code: r.code, path: `${r.origin} - ${r.destination}` },
    { type: "route", badge: "Express", code: r.code, path: `${r.destination} - ${r.origin}` },
  ]).slice(0, 3);

  const recentStops = selectedAgency.routes[0]?.coords.slice(0, 3).map((s) => ({
    type: "stop",
    name: s.name,
    sub: `${selectedAgency.city}, ${selectedAgency.state}`,
  })) ?? [];

  const recentPlaces = [
    { type: "place", name: selectedAgency.routes[0]?.origin ?? "Origin Stop", sub: selectedAgency.city },
    { type: "place", name: selectedAgency.routes[0]?.destination ?? "Destination", sub: selectedAgency.city },
  ];

  const allRecent = [...recentRoutes, ...recentStops, ...recentPlaces];

  // Filter results when querying
  const routeResults = query
    ? selectedAgency.routes.flatMap((r) => [
        { code: r.code, badge: "Deluxe", path: `${r.origin} - ${r.destination}` },
        { code: r.code, badge: "AC", path: `${r.origin} - ${r.destination}` },
      ])
    : [];

  return (
    <div className="flex-1 flex flex-col" style={{ background: "#FAF9F6" }}>

      {/* Search bar */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-slate-100 border border-slate-200">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Enter destination or bus number"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none font-medium"
            />
            {query && (
              <button onClick={() => setQuery("")}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Route results (when searching) */}
      {query && routeResults.length > 0 && (
        <div className="px-4 pt-4">
          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">Routes</p>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {routeResults.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Bus className="w-4 h-4 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-black text-slate-900 text-sm">{r.code}</span>
                    <ServiceBadge type={r.badge} />
                  </div>
                  <span className="text-xs text-slate-500 truncate block">{r.path}</span>
                </div>
                <MoreVertical className="w-4 h-4 text-slate-300 shrink-0" />
              </div>
            ))}
            <button className="w-full flex items-center justify-center py-3 text-[#f7a501] text-xs font-extrabold uppercase tracking-wider hover:bg-amber-50 transition-colors border-t border-slate-100">
              See More
            </button>
          </div>
        </div>
      )}

      {/* Recent searches (default state) */}
      {!query && (
        <div className="px-4 pt-4">
          <p className="text-sm font-black text-slate-800 mb-3">Recent Searches</p>
          <div className="space-y-px">
            {allRecent.map((item, i) => {
              if (item.type === "route") {
                const r = item as { type: string; badge: string; code: string; path: string };
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-0 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors -mx-1 px-1 rounded-xl"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <Bus className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <ServiceBadge type={r.badge} />
                        <span className="font-black text-slate-900 text-sm">{r.code}</span>
                      </div>
                      <span className="text-xs text-slate-500 truncate block">{r.path}</span>
                    </div>
                    <MoreVertical className="w-4 h-4 text-slate-300 shrink-0" />
                  </div>
                );
              }

              if (item.type === "stop") {
                const s = item as { type: string; name: string; sub: string };
                return (
                  <div key={i} className="flex items-start gap-3 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors -mx-1 px-1 rounded-xl">
                    {/* Vertical line + dot (stop icon) */}
                    <div className="flex flex-col items-center pt-0.5 shrink-0">
                      <div className="w-4 h-4 rounded-full border-2 border-[#f7a501] bg-white flex items-center justify-center">
                        <span className="text-[6px] font-black text-[#f7a501]">Bus</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-slate-900 text-sm block">{s.name}</span>
                    </div>
                    <MoreVertical className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                  </div>
                );
              }

              // place
              const p = item as { type: string; name: string; sub: string };
              return (
                <div key={i} className="flex items-start gap-3 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors -mx-1 px-1 rounded-xl">
                  <div className="shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-900 text-sm block">{p.name}</span>
                    <span className="text-xs text-slate-500 block">{p.sub}</span>
                  </div>
                  <MoreVertical className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
