import React from "react";
import { Navigation, Footprints, MapPin } from "lucide-react";
import type { TransitAgency } from "../lib/agencies";

interface TripTimelineProps {
  selectedAgency?: TransitAgency;
}

export const TripTimeline: React.FC<TripTimelineProps> = ({ selectedAgency }) => {
  const activeRoute = selectedAgency?.routes[0];
  const originName = activeRoute?.origin || "Majestic Kempegowda BS";
  const destName = activeRoute?.destination || "Indiranagar Depot";
  const routeCode = activeRoute?.code || "101";

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-300 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-[#b17816]" />
          <h3 className="text-xs font-bold text-slate-800 tracking-wider uppercase">
            ROUTE PROGRESS & MULTIMODAL TIMELINE
          </h3>
        </div>
        <span className="px-2.5 py-1 rounded-md bg-amber-50 text-[#b17816] border border-amber-300 text-xs font-bold font-mono">
          ₹25 Fare
        </span>
      </div>

      {/* Visual Journey Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
          <span>{originName}</span>
          <span className="text-[#b17816] font-mono">45% en route</span>
          <span>{destName}</span>
        </div>

        <div className="w-full h-3 rounded-full bg-slate-100 border border-slate-300 relative overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-[#f7a501] to-emerald-500 rounded-full transition-all duration-500 shadow-sm"
            style={{ width: "45%" }}
          />
        </div>
      </div>

      {/* Multimodal Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
            <Footprints className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block">Walk to Stop</span>
            <span className="text-[11px] text-slate-500 font-medium">0.2 km · 3 min</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/80 border-2 border-[#f7a501] flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-[#f7a501] flex items-center justify-center text-slate-950 font-black text-xs shrink-0">
            {routeCode}
          </div>
          <div>
            <span className="text-xs font-bold text-slate-950 block">Board Bus {routeCode}</span>
            <span className="text-[11px] text-[#b17816] font-bold">6 Stops · 18 min</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block">{destName}</span>
            <span className="text-[11px] text-slate-500 font-medium">Destination</span>
          </div>
        </div>
      </div>
    </div>
  );
};
