import React from "react";
import { Navigation, Footprints, Bus, MapPin, CheckCircle2, ChevronRight } from "lucide-react";
import type { TransitAgency } from "../lib/agencies";

interface TripTimelineProps {
  selectedAgency?: TransitAgency;
}

export const TripTimeline: React.FC<TripTimelineProps> = ({ selectedAgency }) => {
  const activeRoute = selectedAgency?.routes[0];
  const originName = activeRoute?.origin || "Majestic Kempegowda BS";
  const destName = activeRoute?.destination || "Indiranagar Depot";
  const routeCode = activeRoute?.code || "101";

  const stops = [
    { name: originName, time: "19:30", status: "passed", code: "S1" },
    { name: "Corporation Circle", time: "19:35", status: "passed", code: "S2" },
    { name: "Residency Road", time: "19:40", status: "active", code: "S3" },
    { name: "MG Road Metro", time: "19:45", status: "next", code: "S4" },
    { name: "Halasuru", time: "19:50", status: "upcoming", code: "S5" },
    { name: destName, time: "19:55", status: "upcoming", code: "S6" },
  ];

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-[#f7a501]" />
          <h3 className="text-xs font-bold text-slate-300 tracking-wider uppercase">
            ROUTE PROGRESS & MULTIMODAL TIMELINE
          </h3>
        </div>
        <span className="px-2.5 py-1 rounded-md bg-[#f7a501]/10 text-[#f7a501] border border-[#f7a501]/30 text-xs font-bold font-mono">
          ₹25 Fare
        </span>
      </div>

      {/* Visual Journey Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
          <span>{originName}</span>
          <span className="text-[#f7a501] font-mono font-bold">45% en route</span>
          <span>{destName}</span>
        </div>

        <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 relative overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-[#f7a501] to-emerald-400 rounded-full transition-all duration-500 shadow-md"
            style={{ width: "45%" }}
          />
        </div>
      </div>

      {/* Multimodal Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
            <Footprints className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-200 block">Walk to Stop</span>
            <span className="text-[11px] text-slate-400">0.2 km · 3 min</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/70 border-2 border-[#f7a501]/50 flex items-center gap-3 shadow-lg">
          <div className="w-9 h-9 rounded-lg bg-[#f7a501] flex items-center justify-center text-slate-950 font-black text-xs shrink-0">
            {routeCode}
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Board Bus {routeCode}</span>
            <span className="text-[11px] text-[#f7a501] font-semibold">6 Stops · 18 min</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-200 block">{destName}</span>
            <span className="text-[11px] text-slate-400">Destination</span>
          </div>
        </div>
      </div>
    </div>
  );
};
