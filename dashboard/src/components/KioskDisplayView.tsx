import React from "react";
import type { TransitSnapshot } from "../lib/useTransitStream";
import { Bus, Clock, ShieldCheck, Navigation, Users, ArrowRight } from "lucide-react";

interface KioskDisplayViewProps {
  data: TransitSnapshot;
  onExit: () => void;
}

function formatMMSS(sec: number): string {
  if (sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export const KioskDisplayView: React.FC<KioskDisplayViewProps> = ({ data, onExit }) => {
  const { T_total_sec } = data.inbound;

  const bandConfig = {
    SEATS_AVAILABLE: { label: "Seats Available", bg: "bg-emerald-500", text: "text-emerald-950", emoji: "🟢" },
    MODERATE:        { label: "Moderate Crowd",   bg: "bg-amber-500",   text: "text-amber-950",   emoji: "🟡" },
    STANDING_ROOM:   { label: "Standing Room",    bg: "bg-orange-500",  text: "text-orange-950",  emoji: "🟠" },
    VERY_CROWDED:    { label: "Very Crowded",     bg: "bg-rose-500",    text: "text-white",       emoji: "🔴" },
  }[data.inbound.occupancy_band] || { label: "Seats Available", bg: "bg-emerald-500", text: "text-emerald-950", emoji: "🟢" };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-8 flex flex-col justify-between select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
            <Bus className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight">Station B Bus Stop Display</h1>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-lg text-sm font-bold">
                BUS KIOSK #04
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">SIH 2026 Continuous Transit Intelligence Network</p>
          </div>
        </div>

        <button
          onClick={onExit}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all shadow-lg"
        >
          Exit Kiosk Mode ✕
        </button>
      </div>

      {/* Main Kiosk Content */}
      <div className="my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Giant ETA Display */}
        <div className="lg:col-span-7 bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-10 shadow-2xl flex flex-col items-center text-center">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 text-sm font-bold mb-4">
            <Navigation className="w-4 h-4" />
            <span>ROUTE 101 — NEXT ARRIVAL</span>
          </div>

          <span className="text-sm text-slate-400 font-semibold tracking-widest uppercase">ARRIVING IN</span>
          <div className="text-8xl sm:text-9xl font-black font-mono tracking-tight text-white my-4 drop-shadow-2xl">
            {formatMMSS(T_total_sec)}
          </div>

          <div className={`mt-2 px-6 py-3 rounded-2xl text-lg font-extrabold flex items-center gap-3 shadow-xl ${bandConfig.bg} ${bandConfig.text}`}>
            <span className="text-2xl">{bandConfig.emoji}</span>
            <span>{bandConfig.label} ONBOARD</span>
          </div>
        </div>

        {/* Right: Upcoming Departures */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span>Upcoming Departures (Station B)</span>
          </h3>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-blue-600/20 border-2 border-blue-500/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center">101</span>
                <div>
                  <span className="font-bold text-white block text-base">Route 101 to Station A</span>
                  <span className="text-xs text-blue-300">Live Block Chained</span>
                </div>
              </div>
              <span className="text-2xl font-black font-mono text-white">{formatMMSS(T_total_sec)}</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 font-bold text-sm flex items-center justify-center">16C</span>
                <div>
                  <span className="font-bold text-slate-200 block text-base">Route 16C to Sainikpuri</span>
                  <span className="text-xs text-slate-400">Scheduled Departure</span>
                </div>
              </div>
              <span className="text-xl font-bold font-mono text-slate-300">18:00</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 font-bold text-sm flex items-center justify-center">24E</span>
                <div>
                  <span className="font-bold text-slate-200 block text-base">Route 24E to ECIL</span>
                  <span className="text-xs text-slate-400">Scheduled Departure</span>
                </div>
              </div>
              <span className="text-xl font-bold font-mono text-slate-300">26:00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Ticker */}
      <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Real-time Kalman GNSS + Cell Triangulation Active</span>
        </div>
        <div>Press ESC or click Exit to return to Command Center</div>
      </div>
    </div>
  );
};
