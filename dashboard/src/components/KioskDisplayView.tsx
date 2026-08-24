import React, { useState, useEffect } from "react";
import type { TransitSnapshot } from "../lib/useTransitStream";
import type { TransitAgency } from "../lib/agencies";
import {
  Bus,
  Clock,
  ShieldCheck,
  Navigation,
  Users,
  Radio,
  ArrowRight,
  MapPin,
  Sparkles,
  AlertCircle,
  Activity,
  ArrowLeft
} from "lucide-react";

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

const DENSITY_CONFIG: Record<string, {
  label: string;
  sublabel: string;
  dot: string;
  bg: string;
  text: string;
  border: string;
  bar: string;
  barPct: number;
}> = {
  SEATS_AVAILABLE: {
    label: "Seats Available",
    sublabel: "Comfortable · Seats Open",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    bar: "bg-emerald-500",
    barPct: 25,
  },
  MODERATE: {
    label: "Standing Room",
    sublabel: "Moderate · Standing space",
    dot: "bg-amber-400",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    bar: "bg-amber-400",
    barPct: 50,
  },
  STANDING_ROOM: {
    label: "Almost Full",
    sublabel: "High Density · Limited space",
    dot: "bg-orange-500",
    bg: "bg-orange-50",
    text: "text-orange-800",
    border: "border-orange-200",
    bar: "bg-orange-500",
    barPct: 75,
  },
  VERY_CROWDED: {
    label: "Overcrowded",
    sublabel: "Capacity Full · No standing",
    dot: "bg-rose-500",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    bar: "bg-rose-500",
    barPct: 100,
  },
};

export const KioskDisplayView: React.FC<KioskDisplayViewProps> = ({
  data,
  onExit,
  selectedAgency,
}) => {
  const { T_total_sec, T_outbound_sec, T_dwell_sec, T_inbound_sec, occupancy_band } = data.inbound;
  const activeRoute = selectedAgency?.routes[0];
  const routeCode = activeRoute?.code || "S26";
  const originName = activeRoute?.origin || "Ashok Pillar";
  const destName = activeRoute?.destination || "Valasaravakkam";
  const agencyName = selectedAgency?.shortName || "MTC Chennai";

  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(new Date().toLocaleTimeString("en-US", { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const density = DENSITY_CONFIG[occupancy_band] || DENSITY_CONFIG.SEATS_AVAILABLE;
  const leg = data.vehicle.leg;

  return (
    <div className="min-h-screen bg-transparent text-slate-900 font-sans p-4 sm:p-6 lg:p-8 flex flex-col justify-between select-none max-w-7xl mx-auto space-y-6">
      
      {/* ── Top Kiosk Header Bar ────────────────────────────────────────── */}
      <header className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200 shadow-sm px-6 py-4 flex items-center justify-between gap-4">
        {/* Brand & Terminal Station */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/yara_animated_logo.svg" alt="Yara" className="h-11 w-auto object-contain" />
            <span className="px-2 py-0.5 rounded-md bg-[#f7a501] text-slate-950 text-[10px] font-black tracking-wider">
              KIOSK
            </span>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div className="hidden sm:flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#b17816]">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 leading-tight">{originName} Terminal</h1>
              <p className="text-xs font-semibold text-slate-500">{agencyName} • Platform 2</p>
            </div>
          </div>
        </div>

        {/* Right Status & Exit Button */}
        <div className="flex items-center gap-3">
          {/* Live Clock */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
            <Clock className="w-4 h-4 text-[#f7a501]" />
            <span className="font-mono text-sm font-black text-slate-900">{timeStr || "12:00:00"}</span>
          </div>

          {/* Connection Beacon */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>LIVE FEED</span>
          </div>

          {/* Exit Button */}
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-extrabold shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit Kiosk</span>
          </button>
        </div>
      </header>

      {/* ── Main Kiosk Content Grid ────────────────────────────────────── */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1">
        
        {/* ── Left 7 Cols: Giant Live Arrival Countdown Card ─────────── */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 sm:p-8 flex flex-col justify-between space-y-6">
          
          {/* Card Top: Route Info & Status */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-[#f7a501] text-slate-950 flex items-center justify-center font-black text-xl shadow-sm shrink-0">
                {routeCode}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-black uppercase">
                    Next Approaching Bus
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    GTFS Block: {data.vehicle.block_id}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 leading-tight">
                  To {destName}
                </h2>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-800 border border-blue-200 inline-flex items-center gap-1.5 shadow-2xs">
                <Activity className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                {leg === "outbound" ? "Completing Route A" : leg === "dwell" ? "Terminal Halt" : "Inbound Leg"}
              </span>
            </div>
          </div>

          {/* Center: Giant Sunlight-Readable Countdown Timer */}
          <div className="bg-slate-50/80 rounded-3xl border border-slate-200/80 p-6 sm:p-8 text-center space-y-2 flex flex-col items-center justify-center">
            <span className="text-xs font-black text-slate-400 tracking-widest uppercase">
              ESTIMATED ARRIVAL AT THIS STOP
            </span>
            <div className="text-7xl sm:text-8xl lg:text-9xl font-black font-mono tracking-tight text-slate-900 leading-none my-2 drop-shadow-xs">
              {formatMMSS(T_total_sec)}
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-slate-600">
              <Clock className="w-4 h-4 text-[#f7a501]" />
              <span>
                {Math.ceil(T_total_sec / 60)} min {T_total_sec % 60} sec remaining
              </span>
            </div>
          </div>

          {/* Compound ETA Breakdown Strip */}
          <div className="grid grid-cols-3 gap-2 text-center border-t border-slate-100 pt-4">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Outbound Leg</span>
              <span className="text-sm font-black text-slate-800 font-mono">{formatMMSS(T_outbound_sec)}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Terminal Halt</span>
              <span className="text-sm font-black text-slate-800 font-mono">{formatMMSS(T_dwell_sec)}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Inbound Leg</span>
              <span className="text-sm font-black text-slate-800 font-mono">{formatMMSS(T_inbound_sec)}</span>
            </div>
          </div>

          {/* Live Passenger Density Bar */}
          <div className={`p-4 rounded-2xl border ${density.bg} ${density.border} space-y-2`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${density.dot}`} />
                <span className={`text-sm font-extrabold ${density.text}`}>
                  Passenger Density: {density.label}
                </span>
              </div>
              <span className={`text-xs font-bold ${density.text} opacity-80`}>
                {density.sublabel}
              </span>
            </div>
            
            <div className="h-2 rounded-full bg-black/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${density.bar}`}
                style={{ width: `${density.barPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
              <span>Empty</span>
              <span>Seated Capacity (40)</span>
              <span>Standing Limit (55)</span>
            </div>
          </div>
        </div>

        {/* ── Right 5 Cols: Station Departures Board ──────────────────── */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between space-y-4">
          
          {/* Departures Board Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#f7a501]/20 text-[#b17816] flex items-center justify-center">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Station Departures</h3>
                <p className="text-xs text-slate-400 font-medium">{originName} Terminal</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
              Live Updates
            </span>
          </div>

          {/* Departures List */}
          <div className="space-y-3 flex-1 overflow-y-auto pr-0.5" style={{ maxHeight: "420px" }}>
            
            {/* 1. Live Approaching Vehicle (Hero Highlight) */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border-2 border-[#f7a501] ring-2 ring-amber-200/50 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-[#f7a501] text-slate-950 font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
                  {routeCode}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-slate-900 text-sm truncate">To {destName}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[#f7a501] text-slate-950 shrink-0">
                      LIVE
                    </span>
                  </div>
                  <span className="text-xs text-[#b17816] font-bold block mt-0.5">
                    Live Block Chained ({density.label})
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xl font-black font-mono text-[#b17816] block leading-tight">
                  {formatMMSS(T_total_sec)}
                </span>
                <span className="text-[10px] font-extrabold text-emerald-600">Approaching</span>
              </div>
            </div>

            {/* 2. Other Scheduled Departures */}
            <div className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition-colors flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shrink-0">
                  21G
                </span>
                <div className="min-w-0">
                  <span className="font-extrabold text-slate-800 text-sm block truncate">To Broadway Terminus</span>
                  <span className="text-xs text-slate-400 font-semibold block">Via Guindy Kathipara • Bay 3</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-base font-black font-mono text-slate-700 block">18:30</span>
                <span className="text-[10px] font-bold text-slate-400">On Schedule</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition-colors flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shrink-0">
                  570
                </span>
                <div className="min-w-0">
                  <span className="font-extrabold text-slate-800 text-sm block truncate">To Siruseri IT Park</span>
                  <span className="text-xs text-slate-400 font-semibold block">Via OMR Express • Bay 1</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-base font-black font-mono text-slate-700 block">25:00</span>
                <span className="text-[10px] font-bold text-slate-400">On Schedule</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition-colors flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shrink-0">
                  101
                </span>
                <div className="min-w-0">
                  <span className="font-extrabold text-slate-800 text-sm block truncate">To Thiruvottiyur B.T.</span>
                  <span className="text-xs text-slate-400 font-semibold block">Via Central Station • Bay 4</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-base font-black font-mono text-slate-700 block">32:00</span>
                <span className="text-[10px] font-bold text-slate-400">On Schedule</span>
              </div>
            </div>

          </div>

          {/* Passenger Notice Callout */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3 text-xs text-slate-600 font-semibold">
            <Sparkles className="w-4 h-4 text-[#f7a501] shrink-0" />
            <span>Digital Smart Pass NFC valid on all Deluxe & MTC Express routes.</span>
          </div>

        </div>
      </main>

      {/* ── Bottom Information Ticker Bar ───────────────────────────────── */}
      <footer className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 px-5 py-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 font-bold">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Real-Time Kalman Sensor Fusion Active • Sub-2s Continuous ETA Engine</span>
        </div>
        <div className="text-slate-400 text-[11px]">
          Smart India Hackathon 2026 • Yara Public Transit Intelligence Platform
        </div>
      </footer>

    </div>
  );
};

