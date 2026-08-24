import React from "react";
import {
  Bus,
  Clock,
  ShieldCheck,
  Zap,
  Activity,
  Radio,
  Tv,
  Terminal,
  MapPin,
  Users,
  Navigation,
  ArrowRight,
  Sparkles,
  Layers,
  Cpu,
  Database,
  ExternalLink,
  ChevronRight,
  Compass,
  CheckCircle2,
  TrendingDown,
  Gauge
} from "lucide-react";
import type { TransitSnapshot } from "../lib/useTransitStream";
import type { TransitAgency } from "../lib/agencies";

interface ProjectLandingHomeProps {
  data: TransitSnapshot;
  isConnected: boolean;
  onNavigateTab: (tab: "home" | "track" | "routes" | "search") => void;
  selectedAgency?: TransitAgency;
}

function formatMMSS(sec: number): string {
  if (sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const DENSITY_BADGE: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  SEATS_AVAILABLE: { label: "Seats Available", bg: "bg-emerald-50 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" },
  MODERATE:        { label: "Standing Room",   bg: "bg-amber-50 text-amber-800 border-amber-200",     dot: "bg-amber-400" },
  STANDING_ROOM:   { label: "Almost Full",     bg: "bg-orange-50 text-orange-800 border-orange-200",  dot: "bg-orange-500" },
  VERY_CROWDED:    { label: "Overcrowded",     bg: "bg-rose-50 text-rose-800 border-rose-200",        dot: "bg-rose-500" },
};

export const ProjectLandingHome: React.FC<ProjectLandingHomeProps> = ({
  data,
  isConnected,
  onNavigateTab,
  selectedAgency,
}) => {
  const { T_total_sec, T_outbound_sec, T_dwell_sec, T_inbound_sec, occupancy_band } = data.inbound;
  const activeRoute = selectedAgency?.routes[0];
  const routeCode = activeRoute?.code || "S26";
  const originName = activeRoute?.origin || "Ashok Pillar";
  const destName = activeRoute?.destination || "Valasaravakkam";
  const agencyName = selectedAgency?.shortName || "MTC Chennai";
  const density = DENSITY_BADGE[occupancy_band] || DENSITY_BADGE.SEATS_AVAILABLE;
  const leg = data.vehicle.leg;

  return (
    <div className="space-y-10 pb-16 max-w-7xl mx-auto px-4 sm:px-6 select-none animate-fadeIn">
      
      {/* ── 1. Hero Showcase Section ────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm p-8 sm:p-12 lg:p-14">
        {/* Subtle decorative background gradient glows */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Hero Left: Pitch & CTAs (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-[#b17816]" />
                Smart India Hackathon 2026
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-ping" : "bg-amber-500"}`} />
                {isConnected ? "1Hz Live Pipeline" : "Simulated Feed"}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <img src="/yara_animated_logo.svg" alt="Yara" className="h-14 sm:h-16 w-auto object-contain" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Continuous Public Transit Intelligence
              </h1>
              <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed max-w-2xl">
                Watch a bus disappear from <strong>Route A</strong> and instantly project a live, shrinking countdown on <strong>Route B</strong> before it even arrives — powered by pure-Python Kalman sensor fusion, dwell delay recovery, and WiFi passenger density sensing.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigateTab("home")}
                className="px-6 py-3.5 rounded-2xl bg-[#f7a501] hover:bg-amber-500 text-slate-950 text-sm font-black shadow-sm hover:shadow-md transition-all flex items-center gap-2 group active:scale-98"
              >
                <Compass className="w-4 h-4" />
                <span>Launch Commuter Map</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <a
                href="/kiosk"
                className="px-5 py-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-sm font-extrabold shadow-2xs hover:shadow-xs transition-all flex items-center gap-2 group"
              >
                <Tv className="w-4 h-4 text-[#b17816]" />
                <span>Stop Kiosk Screen</span>
              </a>

              <a
                href="/admin"
                className="px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-extrabold shadow-xs transition-all flex items-center gap-2 group"
              >
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>Judge Control Panel</span>
              </a>
            </div>
          </div>

          {/* Hero Right: Live Telemetry HUD Widget (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50/90 border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#f7a501] text-slate-950 flex items-center justify-center font-black text-sm shadow-2xs">
                  {routeCode}
                </div>
                <div>
                  <span className="font-black text-slate-900 text-sm block leading-tight">Active Asset: Bus #1</span>
                  <span className="text-[11px] font-mono text-slate-400 font-bold">GTFS: {data.vehicle.block_id}</span>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${density.bg} flex items-center gap-1.5`}>
                <span className={`w-2 h-2 rounded-full ${density.dot}`} />
                {density.label}
              </span>
            </div>

            {/* Giant Live ETA Countdown Preview */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center shadow-2xs">
              <span className="text-[11px] font-extrabold text-slate-400 tracking-wider uppercase block">
                Live Compound ETA Countdown
              </span>
              <div className="text-5xl sm:text-6xl font-black font-mono text-slate-900 tracking-tight my-1 drop-shadow-2xs">
                {formatMMSS(T_total_sec)}
              </div>
              <span className="text-xs font-bold text-emerald-600 block mt-1">
                T_outbound ({formatMMSS(T_outbound_sec)}) + T_dwell ({formatMMSS(T_dwell_sec)}) + T_inbound ({formatMMSS(T_inbound_sec)})
              </span>
            </div>

            {/* Micro Sensor Status Pills */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800 block text-[11px]">Kalman Filter</span>
                  <span className="text-[10px] text-slate-400 font-medium">Covariance 0.04m²</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800 block text-[11px]">WiFi MAC Probe</span>
                  <span className="text-[10px] text-slate-400 font-medium">Rolling Window</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Core Pillars Bento Grid ─────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">Four Technological Pillars</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Engineered specifically for Indian public transit challenges</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Pillar 1 */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-6 space-y-3 group">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#b17816] group-hover:scale-105 transition-transform shadow-2xs">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Compounding Block ETA</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Projects downstream arrival times across linked block trips before the bus even leaves its previous leg, automatically absorbing dwell buffer.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center text-xs font-bold text-[#b17816]">
              <span>Dynamic Dwell Recovery</span>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-6 space-y-3 group">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 group-hover:scale-105 transition-transform shadow-2xs">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Kalman Fusion Engine</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Pure-Python 4D tracker fuses GNSS coordinates with cell triangulation (R_cell = 1000 * R_gnss) for smooth dead-reckoning during dropouts.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center text-xs font-bold text-purple-700">
              <span>Zero-Jitter Trajectory</span>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-6 space-y-3 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform shadow-2xs">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Passenger Density Sensing</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Passive ESP32 WiFi probe sniffing rolling probe frames maps directly into 4 clear occupancy tiers without invading passenger privacy.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center text-xs font-bold text-emerald-700">
              <span>4 Privacy-First Bands</span>
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-6 space-y-3 group">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 group-hover:scale-105 transition-transform shadow-2xs">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Sub-2s Event Causality</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              End-to-end pipeline latency from injected traffic delays or crowd surges to visible kiosk countdown changes stays strictly under 2 seconds.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center text-xs font-bold text-rose-700">
              <span>Ultra-Low Latency SSE</span>
            </div>
          </div>

        </div>
      </section>

      {/* ── 3. Interactive Platform Portal Launchers ────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">Interactive Portals & Kiosks</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Explore all dedicated views in the Yara transit platform</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Portal 1: Commuter Map App */}
          <div
            onClick={() => onNavigateTab("home")}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#f7a501] p-6 sm:p-7 space-y-4 cursor-pointer transition-all group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#b17816] group-hover:bg-[#f7a501] group-hover:text-slate-950 transition-colors shadow-2xs">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 group-hover:text-[#b17816] transition-colors">
                Live Commuter Transit App
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
                Consumer transit map featuring live vehicle radar, nearest bus stops, walking directions, and route timelines.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-[#b17816]">
              <span>Open Passenger View</span>
              <span className="w-7 h-7 rounded-full bg-amber-50 group-hover:bg-[#f7a501] group-hover:text-slate-950 flex items-center justify-center transition-colors">➔</span>
            </div>
          </div>

          {/* Portal 2: Bus Stop Kiosk */}
          <a
            href="/kiosk"
            className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 p-6 sm:p-7 space-y-4 cursor-pointer transition-all group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-2xs">
                <Tv className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                Bus Stop Kiosk Display
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
                High-contrast, sunlight-readable digital departure board with giant countdowns, 3-leg ETA breakdown, and platform timetable.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-blue-700">
              <span>Launch Kiosk Display</span>
              <span className="w-7 h-7 rounded-full bg-blue-50 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">➔</span>
            </div>
          </a>

          {/* Portal 3: Judge Injection Panel */}
          <a
            href="/admin"
            className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-rose-300 p-6 sm:p-7 space-y-4 cursor-pointer transition-all group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 group-hover:bg-rose-600 group-hover:text-white transition-colors shadow-2xs">
                <Terminal className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 group-hover:text-rose-700 transition-colors">
                Judge Injection & Verification Panel
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
                Live demonstration cockpit to trigger artificial delay minutes, GNSS dropouts, and passenger surges with real-time causality logging.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-rose-700">
              <span>Open Admin Panel</span>
              <span className="w-7 h-7 rounded-full bg-rose-50 group-hover:bg-rose-600 group-hover:text-white flex items-center justify-center transition-colors">➔</span>
            </div>
          </a>

        </div>
      </section>

      {/* ── 4. Pipeline Architecture Flow Banner ────────────────────────────── */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#f7a501]/20 text-[#b17816] flex items-center justify-center font-black">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Live Pipeline Architecture</h3>
              <p className="text-xs text-slate-500 font-medium">MQTT Message Broker &amp; FastSSE Stream Flow</p>
            </div>
          </div>
          <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            &lt; 2.0s Latency Target
          </span>
        </div>

        {/* 4 Connected Channels Graphic */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-[#f7a501] text-slate-950 text-[10px] font-black">CH-1 :8001</span>
              <Activity className="w-3.5 h-3.5 text-amber-700" />
            </div>
            <h4 className="text-sm font-black text-slate-900">Simulator Engine</h4>
            <p className="text-[11px] text-slate-600 leading-tight font-medium">1Hz vehicle physics &amp; REST injection API</p>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-purple-200 text-purple-900 text-[10px] font-black">CH-2</span>
              <Cpu className="w-3.5 h-3.5 text-purple-700" />
            </div>
            <h4 className="text-sm font-black text-slate-900">Kalman Fusion</h4>
            <p className="text-[11px] text-slate-600 leading-tight font-medium">Covariance noise filter &amp; dead-reckoning</p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900 text-[10px] font-black">CH-3 :8002</span>
              <Radio className="w-3.5 h-3.5 text-emerald-700" />
            </div>
            <h4 className="text-sm font-black text-slate-900">ETA &amp; Density Engine</h4>
            <p className="text-[11px] text-slate-600 leading-tight font-medium">Compounding ETA &amp; live FastSSE stream</p>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-blue-200 text-blue-900 text-[10px] font-black">CH-4 :4321</span>
              <Tv className="w-3.5 h-3.5 text-blue-700" />
            </div>
            <h4 className="text-sm font-black text-slate-900">Dashboard &amp; Kiosk</h4>
            <p className="text-[11px] text-slate-600 leading-tight font-medium">React Native EventSource presentation layer</p>
          </div>

        </div>
      </section>

    </div>
  );
};
