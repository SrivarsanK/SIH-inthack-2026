import React from "react";
import type { TransitSnapshot } from "../lib/useTransitStream";
import type { TransitAgency } from "../lib/agencies";
import { Bus, Clock, ShieldCheck, Navigation, Users, Radio, ArrowRight } from "lucide-react";

interface KioskDisplayViewProps {
  data: TransitSnapshot;
  onExit: () => void;
  selectedAgency?: TransitAgency;
}

function formatMMSS(sec: number): string {
  if (sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export const KioskDisplayView: React.FC<KioskDisplayViewProps> = ({ data, onExit, selectedAgency }) => {
  const { T_total_sec } = data.inbound;

  const activeRoute = selectedAgency?.routes[0];
  const routeCode = activeRoute?.code || "101";
  const originName = activeRoute?.origin || "Station A";
  const destName = activeRoute?.destination || "Station B";
  const agencyName = selectedAgency?.shortName || "TransitSense";

  const bandConfig = {
    SEATS_AVAILABLE: { label: "Seats Available", bg: "bg-emerald-500", text: "text-emerald-950" },
    MODERATE:        { label: "Moderate Crowd",   bg: "bg-amber-500",   text: "text-amber-950" },
    STANDING_ROOM:   { label: "Standing Room",    bg: "bg-orange-500",  text: "text-orange-950" },
    VERY_CROWDED:    { label: "Very Crowded",     bg: "bg-rose-500",    text: "text-white" },
  }[data.inbound.occupancy_band] || { label: "Seats Available", bg: "bg-emerald-500", text: "text-emerald-950" };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-6 sm:p-8 flex flex-col justify-between select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#f7a501] flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/20 shrink-0">
            <Bus className="w-7 h-7 text-slate-950" strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{destName} Bus Kiosk</h1>
              <span className="px-3 py-1 bg-amber-500/10 text-[#f7a501] border border-amber-500/30 rounded-xl text-xs font-black tracking-wider uppercase">
                {agencyName} KIOSK
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-0.5">SIH 2026 Continuous Transit Intelligence Network</p>
          </div>
        </div>

        <button
          onClick={onExit}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 rounded-xl text-xs font-extrabold transition-all shadow-lg hover:border-slate-600"
        >
          Exit Kiosk Mode ✕
        </button>
      </div>

      {/* Main Kiosk Dashboard Content */}
      <div className="my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Giant Live Arrival Countdown Display */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800/90 rounded-3xl p-8 sm:p-10 shadow-2xl flex flex-col items-center text-center">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-[#f7a501] border border-amber-500/30 text-xs font-black tracking-wider uppercase mb-4">
            <Navigation className="w-4 h-4 text-[#f7a501]" />
            <span>ROUTE {routeCode} — NEXT ARRIVAL</span>
          </div>

          <span className="text-xs text-slate-400 font-extrabold tracking-widest uppercase">ARRIVING IN</span>
          <div className="text-8xl sm:text-9xl font-black font-mono tracking-tight text-white my-4 drop-shadow-2xl">
            {formatMMSS(T_total_sec)}
          </div>

          <div className={`mt-2 px-6 py-3 rounded-2xl text-base font-black flex items-center gap-3 shadow-xl ${bandConfig.bg} ${bandConfig.text}`}>
            <Users className="w-5 h-5" />
            <span>{bandConfig.label.toUpperCase()} ONBOARD</span>
          </div>
        </div>

        {/* Right Column: Upcoming Scheduled Departures List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#f7a501]" />
              <h3 className="text-base font-black text-slate-200">Upcoming Departures ({destName})</h3>
            </div>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
              Live Feed
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-[#f7a501]/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-[#f7a501] text-slate-950 font-black text-sm flex items-center justify-center shrink-0">{routeCode}</span>
                <div>
                  <span className="font-extrabold text-white block text-base">Route {routeCode} to {originName}</span>
                  <span className="text-xs text-amber-300 font-bold">Live Block Chained</span>
                </div>
              </div>
              <span className="text-2xl font-black font-mono text-[#f7a501]">{formatMMSS(T_total_sec)}</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 font-extrabold text-sm flex items-center justify-center shrink-0">16C</span>
                <div>
                  <span className="font-extrabold text-slate-200 block text-base">Route 16C Express</span>
                  <span className="text-xs text-slate-400 font-semibold">Scheduled Departure</span>
                </div>
              </div>
              <span className="text-xl font-black font-mono text-slate-300">18:00</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 font-extrabold text-sm flex items-center justify-center shrink-0">24E</span>
                <div>
                  <span className="font-extrabold text-slate-200 block text-base">Route 24E Feeder</span>
                  <span className="text-xs text-slate-400 font-semibold">Scheduled Departure</span>
                </div>
              </div>
              <span className="text-xl font-black font-mono text-slate-300">26:00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Information Ticker */}
      <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between text-xs text-slate-400 font-semibold">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Real-time Kalman GNSS + Cell Triangulation Active</span>
        </div>
        <div>Press ESC or click Exit to return to Command Center</div>
      </div>
    </div>
  );
};
