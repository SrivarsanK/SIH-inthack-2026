import React from "react";
import { Clock, AlertTriangle, ShieldCheck, Wifi } from "lucide-react";
import type { TransitSnapshot } from "../lib/useTransitStream";

interface ETACountdownProps {
  data: TransitSnapshot;
}

function formatMMSS(sec: number): string {
  if (sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export const ETACountdown: React.FC<ETACountdownProps> = ({ data }) => {
  const { T_outbound_sec, T_dwell_sec, T_inbound_sec, T_total_sec, is_delayed, delay_min } = data.inbound;

  return (
    <div className={`p-6 rounded-2xl border transition-all duration-300 shadow-sm space-y-5 ${
      is_delayed 
        ? "bg-rose-50 border-rose-300 ring-2 ring-rose-400/30" 
        : "bg-white border-slate-300"
    }`}>
      {/* Top Bar: Header & Data Contract Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#b17816]" />
          <h2 className="text-xs font-extrabold tracking-wider text-slate-700 uppercase">
            PREDICTIVE INBOUND ETA
          </h2>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-300 text-[11px] font-mono font-bold text-slate-800">
          <ShieldCheck className="w-3.5 h-3.5 text-[#b17816]" />
          <span>GTFS-RT Block Chained</span>
        </div>
      </div>

      {/* Main Countdown Display */}
      <div className="text-center py-2 relative">
        <span className="text-[11px] font-bold text-slate-500 tracking-widest uppercase block mb-1">
          BUS ARRIVES IN
        </span>
        <div className={`text-6xl sm:text-7xl font-black font-mono tracking-tight drop-shadow-sm transition-colors ${
          is_delayed ? "text-rose-600" : "text-slate-900"
        }`}>
          {formatMMSS(T_total_sec)}
        </div>
        
        {is_delayed ? (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-extrabold text-rose-700 bg-rose-100 px-3 py-1 rounded-full border border-rose-300 w-fit mx-auto animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>DELAYED (+{delay_min} min) — Compounding Catch-up Active</span>
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700">
            <Wifi className="w-3.5 h-3.5 text-blue-600" />
            <span>Live compounding calculation</span>
          </div>
        )}
      </div>

      {/* Sub-component Breakdown Grid */}
      <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-200 text-center">
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[10px] text-slate-500 font-semibold uppercase block">Prior Leg</span>
          <span className="text-sm font-bold font-mono text-slate-900 block my-0.5">{formatMMSS(T_outbound_sec)}</span>
          <span className="text-[9px] text-slate-500 font-mono">T_outbound</span>
        </div>

        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
          <span className="text-[10px] text-amber-900 font-semibold uppercase block">Terminal Halt</span>
          <span className="text-sm font-bold font-mono text-[#b17816] block my-0.5">{formatMMSS(T_dwell_sec)}</span>
          <span className="text-[9px] text-amber-700 font-mono">T_dwell (Recovery)</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[10px] text-slate-500 font-semibold uppercase block">To Stop</span>
          <span className="text-sm font-bold font-mono text-slate-900 block my-0.5">{formatMMSS(T_inbound_sec)}</span>
          <span className="text-[9px] text-slate-500 font-mono">T_inbound</span>
        </div>
      </div>
    </div>
  );
};
