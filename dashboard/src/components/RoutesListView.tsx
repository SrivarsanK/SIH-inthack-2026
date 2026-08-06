import React, { useState } from "react";
import {
  ArrowLeft,
  Bus,
  ChevronRight,
  MapPin,
  Star,
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
      className="inline-block px-1.5 py-0.5 rounded-md text-[9px] font-extrabold"
      style={{ background: s.bg, color: s.text }}
    >
      {type}
    </span>
  );
};

// ─── Route Row ────────────────────────────────────────────────────────────────
const RouteRow: React.FC<{
  code: string;
  badge: string;
  path: string;
  onSelect?: () => void;
}> = ({ code, badge, path, onSelect }) => (
  <button
    onClick={onSelect}
    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 text-left"
  >
    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
      <Bus className="w-4.5 h-4.5 text-slate-600" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="font-black text-slate-900 text-sm">{code}</span>
        <ServiceBadge type={badge} />
      </div>
      <span className="text-xs text-slate-500 truncate block">{path}</span>
    </div>
    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
  </button>
);

// ─── Main Routes List View ────────────────────────────────────────────────────
export const RoutesListView: React.FC<RoutesListViewProps> = ({
  selectedAgency,
  onSelectRoute,
  onBack,
}) => {
  const [showAll, setShowAll] = useState(false);

  // Build route variants: Deluxe, AC, Express, Fans, Ordinary per agency route
  const SERVICE_VARIANTS = ["Deluxe", "AC", "Fans", "Express", "Ordinary", "SuperFast"];

  const allVariants = selectedAgency.routes.flatMap((r) =>
    SERVICE_VARIANTS.map((svc) => ({
      code: r.code,
      badge: svc,
      path: `${r.origin} - ${r.destination}`,
      id: `${r.id}-${svc}`,
    }))
  );

  // Show first 2 by default
  const displayed = showAll ? allVariants : allVariants.slice(0, 2);

  return (
    <div className="flex-1 flex flex-col" style={{ background: "#FAF9F6" }}>

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-700" />
        </button>
        <div className="flex items-center gap-2">
          <Bus className="w-4 h-4 text-slate-600" />
          <span className="font-black text-slate-900 text-base">
            {selectedAgency.routes.map((r) => r.code).join(", ")}
          </span>
        </div>
      </div>

      {/* Routes section */}
      <div className="px-4 pt-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-black text-slate-800 uppercase tracking-wide">Routes</p>
          <span className="text-xs text-slate-500 font-medium">
            {selectedAgency.city} · {allVariants.length} variants
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {displayed.map((v) => (
            <RouteRow
              key={v.id}
              code={v.code}
              badge={v.badge}
              path={v.path}
              onSelect={() => onSelectRoute?.(v.code)}
            />
          ))}

          {!showAll && allVariants.length > 2 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full py-3.5 text-[#f7a501] text-xs font-extrabold uppercase tracking-widest border-t border-orange-100 hover:bg-amber-50 transition-colors"
            >
              See More
            </button>
          )}

          {showAll && (
            <button
              onClick={() => setShowAll(false)}
              className="w-full py-3.5 text-slate-500 text-xs font-extrabold uppercase tracking-widest border-t border-slate-100 hover:bg-slate-50 transition-colors"
            >
              Show Less
            </button>
          )}
        </div>
      </div>

      {/* Stops preview */}
      <div className="px-4 pt-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-black text-slate-800 uppercase tracking-wide">Major Stops</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {selectedAgency.routes[0]?.coords.map((stop, idx) => (
            <div
              key={stop.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${idx === 0 ? "bg-emerald-500" : idx === selectedAgency.routes[0].coords.length - 1 ? "bg-slate-800" : "bg-slate-300"}`} />
              <span className="text-sm text-slate-700 font-medium">{stop.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
