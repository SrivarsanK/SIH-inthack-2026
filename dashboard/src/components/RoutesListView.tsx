import React, { useState } from "react";
import {
  ArrowLeft,
  Bus,
  ChevronRight,
  Clock,
  MapPin,
  ShieldCheck,
  Star,
  Zap,
} from "lucide-react";
import type { TransitAgency } from "../lib/agencies";

interface RoutesListViewProps {
  selectedAgency: TransitAgency;
  onSelectRoute?: (routeCode: string) => void;
  onBack: () => void;
}

// ─── Service Badge ────────────────────────────────────────────────────────────
const ServiceBadge: React.FC<{ type: string }> = ({ type }) => {
  const variants: Record<string, { bg: string; text: string }> = {
    Deluxe: { bg: "#f7a501", text: "#1c1400" },
    Express: { bg: "#16a34a", text: "#fff" },
    AC: { bg: "#0284c7", text: "#fff" },
    Fans: { bg: "#7c3aed", text: "#fff" },
    Ordinary: { bg: "#6b7280", text: "#fff" },
    SuperFast: { bg: "#dc2626", text: "#fff" },
  };
  const s = variants[type] ?? { bg: "#6b7280", text: "#fff" };
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold"
      style={{ background: s.bg, color: s.text }}
    >
      {type}
    </span>
  );
};

// ─── Route Card Item ──────────────────────────────────────────────────────────
const RouteCard: React.FC<{
  code: string;
  badge: string;
  origin: string;
  destination: string;
  onSelect?: () => void;
}> = ({ code, badge, origin, destination, onSelect }) => (
  <div
    onClick={onSelect}
    className="group flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-[#f7a501] hover:bg-amber-50/20 transition-all cursor-pointer"
  >
    <div className="flex items-center gap-3.5 min-w-0">
      <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-amber-100/80 flex items-center justify-center shrink-0 transition-colors">
        <Bus className="w-5 h-5 text-slate-700 group-hover:text-[#b17816] transition-colors" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-black text-slate-900 text-base">{code}</span>
          <ServiceBadge type={badge} />
        </div>
        <span className="text-xs text-slate-500 font-medium truncate block">
          {origin} → {destination}
        </span>
      </div>
    </div>

    <button
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 group-hover:bg-[#f7a501] group-hover:text-slate-950 text-xs font-extrabold text-slate-700 transition-all shrink-0 ml-3"
    >
      <span>Track</span>
      <ChevronRight className="w-3.5 h-3.5" />
    </button>
  </div>
);

// ─── Main Routes List View ────────────────────────────────────────────────────
export const RoutesListView: React.FC<RoutesListViewProps> = ({
  selectedAgency,
  onSelectRoute,
  onBack,
}) => {
  const [showAll, setShowAll] = useState(false);

  const realRoutes = selectedAgency.routes.map((r) => ({
    code: r.code,
    badge: "MTC",
    origin: r.origin,
    destination: r.destination,
    id: r.id,
  }));

  const displayed = showAll ? realRoutes : realRoutes.slice(0, 10);

  const majorStops = selectedAgency.routes[0]?.coords ?? [];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6">

      {/* Navigation Header Bar */}
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
          <div>
            <h1 className="text-xl font-black text-slate-900">
              Agency Routes ({selectedAgency.shortName})
            </h1>
            <span className="text-xs text-slate-500 font-medium block">
              {selectedAgency.city} · {realRoutes.length} Active Routes
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[#b17816] text-xs font-extrabold flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-[#f7a501] text-[#f7a501]" />
            {selectedAgency.routes.length} Active Corridors
          </span>
        </div>
      </div>

      {/* Responsive 2-Column Desktop Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: All Routes List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-slate-900 text-base">Available Routes</h2>
            <span className="text-xs text-slate-500 font-bold">
              Showing {displayed.length} of {realRoutes.length}
            </span>
          </div>

          <div className="space-y-3">
            {displayed.map((v) => (
              <RouteCard
                key={v.id}
                code={v.code}
                badge={v.badge}
                origin={v.origin}
                destination={v.destination}
                onSelect={() => onSelectRoute?.(v.id)}
              />
            ))}
          </div>

          {realRoutes.length > 10 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#f7a501] text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{showAll ? "Show Less" : `See All ${realRoutes.length} Routes`}</span>
              <ChevronRight className={`w-4 h-4 transition-transform ${showAll ? "rotate-90" : ""}`} />
            </button>
          )}
        </div>

        {/* Right Column: Major Stops Timeline & Corridor Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Major Stops Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#f7a501]" />
                <h3 className="font-black text-slate-900 text-sm">Major Interchange Stops</h3>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {majorStops.length} Key Stops
              </span>
            </div>

            <div className="space-y-2">
              {majorStops.map((stop, idx) => {
                const isOrigin = idx === 0;
                const isTerminus = idx === majorStops.length - 1;
                return (
                  <div
                    key={stop.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-100 shadow-2xs"
                  >
                    <div
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        isOrigin
                          ? "bg-emerald-500 ring-4 ring-emerald-100"
                          : isTerminus
                          ? "bg-slate-900 ring-4 ring-slate-200"
                          : "bg-slate-300"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-slate-800 text-xs block truncate">
                        {stop.name}
                      </span>
                    </div>
                    {isOrigin && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-extrabold shrink-0">
                        Origin
                      </span>
                    )}
                    {isTerminus && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[9px] font-extrabold shrink-0">
                        Terminus
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agency Fleet Info Card */}
          <div className="bg-[#FAF9F6] border border-slate-200 rounded-3xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck className="w-5 h-5 text-[#f7a501]" />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 text-xs block">
                  GTFS Feed Verified
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {selectedAgency.city} Transit Authority
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold">
              Active Stream
            </span>
          </div>

        </div>

      </div>

    </div>
  );
};
