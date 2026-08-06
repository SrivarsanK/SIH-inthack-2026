import React, { useEffect, useState } from "react";
import type { TransitSnapshot } from "../lib/useTransitStream";
import { Clock, TrendingDown, ArrowRight, ShieldCheck } from "lucide-react";

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
  const { T_total_sec, T_outbound_sec, T_dwell_sec, T_inbound_sec } = data.inbound;
  const [flashColor, setFlashColor] = useState<"normal" | "red" | "green">("normal");
  const [prevTotal, setPrevTotal] = useState<number>(T_total_sec);

  useEffect(() => {
    if (T_total_sec !== prevTotal) {
      if (T_total_sec > prevTotal) {
        setFlashColor("red");
      } else if (T_total_sec < prevTotal) {
        setFlashColor("green");
      }
      setPrevTotal(T_total_sec);
      const timer = setTimeout(() => setFlashColor("normal"), 2000);
      return () => clearTimeout(timer);
    }
  }, [T_total_sec, prevTotal]);

  const flashBgClass = flashColor === "red" 
    ? "bg-rose-500/10 border-rose-500/40 shadow-rose-500/10" 
    : flashColor === "green" 
    ? "bg-emerald-500/10 border-emerald-500/40 shadow-emerald-500/10"
    : "bg-slate-900/90 border-slate-800 shadow-2xl";

  return (
    <div className={`p-6 rounded-2xl border backdrop-blur-md transition-colors duration-500 ${flashBgClass}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
          <Clock className="w-4 h-4 text-blue-400" />
          <span>PREDICTIVE INBOUND ETA</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>GTFS-RT Block Chained</span>
        </div>
      </div>

      <div className="text-center py-4 my-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
        <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Bus Arrives In</span>
        <div className="text-5xl font-extrabold text-white tracking-tight font-mono mt-1 mb-2">
          {formatMMSS(T_total_sec)}
        </div>
        <div className="flex items-center justify-center gap-1 text-xs text-slate-400 font-medium">
          <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
          <span>Live compounding calculation</span>
        </div>
      </div>

      {/* Sub-component Breakdown */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-center">
          <span className="text-[11px] text-slate-400 block font-medium">Prior Leg</span>
          <span className="text-sm font-bold text-slate-200 font-mono mt-0.5 block">
            {formatMMSS(T_outbound_sec)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">T_outbound</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-center">
          <span className="text-[11px] text-slate-400 block font-medium">Terminal Halt</span>
          <span className="text-sm font-bold text-amber-400 font-mono mt-0.5 block">
            {formatMMSS(T_dwell_sec)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">T_dwell (Recovery)</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-center">
          <span className="text-[11px] text-slate-400 block font-medium">To Stop</span>
          <span className="text-sm font-bold text-blue-400 font-mono mt-0.5 block">
            {formatMMSS(T_inbound_sec)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">T_inbound</span>
        </div>
      </div>
    </div>
  );
};
