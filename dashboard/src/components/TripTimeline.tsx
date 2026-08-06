import React from "react";
import { Navigation, MapPin, Footprints, ArrowRight, IndianRupee, Layers } from "lucide-react";
import type { TransitSnapshot } from "../lib/useTransitStream";

interface TripTimelineProps {
  data: TransitSnapshot;
}

export const TripTimeline: React.FC<TripTimelineProps> = ({ data }) => {
  const { progress, leg } = data.vehicle;
  const progressPercent = Math.round(progress * 100);

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Layers className="w-4 h-4 text-blue-400" />
          <span>ROUTE PROGRESS & MULTIMODAL TIMELINE</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono">
          <span>₹35 Fare</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-medium text-slate-400">
          <span className="flex items-center gap-1 text-slate-200">
            <MapPin className="w-3.5 h-3.5 text-blue-400" /> Station A
          </span>
          <span className="font-mono text-blue-400 font-bold">{progressPercent}% en route</span>
          <span className="flex items-center gap-1 text-slate-200">
            Station B <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-400 rounded-full transition-all duration-500 shadow-lg"
            style={{ width: `${Math.max(5, progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Step Sequence Timeline */}
      <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <Footprints className="w-4 h-4" />
          </div>
          <div>
            <span className="block font-semibold text-slate-200">Walk to Stop</span>
            <span className="block text-[10px] text-slate-400">0.2 km · 3 min</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
            101
          </div>
          <div>
            <span className="block font-semibold text-blue-300">Board Bus 101</span>
            <span className="block text-[10px] text-blue-400">6 Stops · 18 min</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <span className="block font-semibold text-slate-200">Station B</span>
            <span className="block text-[10px] text-slate-400">Destination</span>
          </div>
        </div>
      </div>
    </div>
  );
};
