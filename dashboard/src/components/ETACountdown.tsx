import React from "react";
import { Clock, AlertTriangle, ShieldCheck, Zap } from "lucide-react";
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
    <div className={`p-6 rounded-2xl border transition-all duration-300 backdrop-blur-md shadow-2xl space-y-5 ${
      is_delayed 
        ? "bg-rose-950/40 border-rose-600/60 ring-2 ring-rose-500/30" 
        : "bg-slate-900/90 border-slate-800"
    }`}>
      {/* Top Bar: Header & Data Contract Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#f7a501]" />
          <h2 className="text-xs font-bold tracking-wider text-slate-300 uppercase">
            PREDICTIVE INBOUND ETA
          </h2>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-[11px] font-mono font-bold text-slate-200">
          <ShieldCheck className="w-3.5 h-3.5 text-[#f7a501]" />
          <span>GTFS-RT Block Chained</span>
        </div>
      </div>

      {/* Main Countdown Display */}
      <div className="text-center py-2 relative">
        <span className="text-[11px] font-bold text-slate-400 tracking-widest uppercase block mb-1">
          BUS ARRIVES IN
        </span>
        <div className={`text-6xl sm:text-7xl font-black font-mono tracking-tight drop-shadow-lg transition-colors ${
          is_delayed ? "text-rose-400" : "text-white"
        }`}>
          {formatMMSS(T_total_sec)}
        </div>
        
        {is_delayed ? (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-extrabold text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/30 w-fit mx-auto animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>DELAYED (+{delay_min} min) — Compounding Catch-up Active</span>
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400">
            <Zap className="w-3.5 h-3.5 text-[#f7a501]" />
            <span>Live compounding calculation</span>
          </div>
        )}
      </div>

      {/* Sub-component Breakdown Breakdown Grid */}
      <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/80 text-center">
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-400 font-semibold uppercase block">Prior Leg</span>
          <span className="text-sm font-bold font-mono text-slate-200 block my-0.5">{formatMMSS(T_outbound_sec)}</span>
          <span className="text-[9px] text-slate-500 font-mono">T_outbound</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-400 font-semibold uppercase block">Terminal Halt</span>
          <span className="text-sm font-bold font-mono text-[#f7a501] block my-0.5">{formatMMSS(T_dwell_sec)}</span>
          <span className="text-[9px] text-slate-500 font-mono">T_dwell (Recovery)</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-400 font-semibold uppercase block">To Stop</span>
          <span className="text-sm font-bold font-mono text-slate-200 block my-0.5">{formatMMSS(T_inbound_sec)}</span>
          <span className="text-[9px] text-slate-500 font-mono">T_inbound</span>
        </div>
      </div>
    </div>
  );
};
