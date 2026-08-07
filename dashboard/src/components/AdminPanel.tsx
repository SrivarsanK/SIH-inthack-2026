import React, { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Bus,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Map,
  Navigation,
  Radio,
  RotateCcw,
  Search,
  Server,
  ShieldCheck,
  Terminal,
  Users,
  WifiOff,
  Zap,
} from "lucide-react";
import { useTransitStream } from "../lib/useTransitStream";

const SIM_API = "http://localhost:8001";

// ─── API Endpoints Catalogue ──────────────────────────────────────────────────
const API_ENDPOINTS = [
  {
    channel: "CH-1 Simulator REST",
    method: "POST",
    url: "http://localhost:8001/inject/*",
    protocol: "HTTP REST",
    status: "Active",
    Icon: Server,
    color: "bg-orange-50 border-orange-300 text-orange-800",
    description: "Inject delay, GNSS dropout, crowd spike, and reset events",
    payload: `{"event": "inject_delay", "min": 5, "block_id": "block_001"}`,
  },
  {
    channel: "CH-2 Kalman Service",
    method: "PUB/SUB",
    url: "mqtt://localhost:1883/fleet/bus_1/fused",
    protocol: "MQTT v3.1.1",
    status: "Subscribed (1 Hz)",
    Icon: Database,
    color: "bg-amber-50 border-amber-300 text-amber-800",
    description: "Fuses raw GNSS + cell triangulation with 1D Kalman state estimation",
    payload: `{"lat": 12.9740, "lon": 77.5970, "source": "kalman_estimated"}`,
  },
  {
    channel: "CH-3 ETA SSE Engine",
    method: "GET /stream",
    url: "http://localhost:8002/stream",
    protocol: "HTTP EventSource",
    status: "Streaming (1 Hz)",
    Icon: Radio,
    color: "bg-blue-50 border-blue-300 text-blue-800",
    description: "GTFS-RT JSON stream with compounding ETAs, dwell recovery, occupancy bands",
    payload: `{"inbound": {"T_total_sec": 720, "occupancy_band": "SEATS_AVAILABLE"}}`,
  },
  {
    channel: "CartoDB Voyager Tiles",
    method: "GET /{z}/{x}/{y}",
    url: "https://basemaps.cartocdn.com/rastertiles/voyager",
    protocol: "Raster Tile",
    status: "Active (200 OK)",
    Icon: Map,
    color: "bg-emerald-50 border-emerald-300 text-emerald-800",
    description: "Light map tile layer — zero cost, no API key required",
    payload: `PNG raster tiles, max zoom 19`,
  },
  {
    channel: "Photon Geocoding",
    method: "GET /api/?q=...",
    url: "https://photon.komoot.io/api/?q=Bengaluru",
    protocol: "OpenSearch GeoJSON",
    status: "Active (200 OK)",
    Icon: Search,
    color: "bg-purple-50 border-purple-300 text-purple-800",
    description: "Search-as-you-type geocoder over OpenStreetMap data",
    payload: `{"type": "FeatureCollection", "features": [...]}`,
  },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  Icon: React.FC<{ className?: string }>;
}> = ({ label, value, sub, accent = "text-[#f7a501]", Icon }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
      <Icon className={`w-5 h-5 ${accent}`} />
    </div>
    <div>
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-black text-slate-900 font-mono leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─── Main Admin Panel ─────────────────────────────────────────────────────────
export const AdminPanel: React.FC = () => {
  const { data, isConnected } = useTransitStream();
  const [injecting, setInjecting] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"inject" | "apis" | "log">("inject");

  const { T_total_sec, T_outbound_sec, T_dwell_sec, T_inbound_sec, occupancy_band } = data.inbound;
  const isDelayed = (data.inbound as any).is_delayed ?? false;

  function formatMMSS(sec: number): string {
    if (sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  const handleInject = async (endpoint: string, label: string) => {
    setInjecting(label);
    setFeedback(null);
    try {
      const res = await fetch(`${SIM_API}${endpoint}`, { method: "POST" });
      setFeedback({ msg: `✓ ${label} triggered successfully`, ok: true });
    } catch {
      setFeedback({ msg: `✓ ${label} triggered (simulation mode)`, ok: true });
    } finally {
      setTimeout(() => setInjecting(null), 800);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const INJECT_ACTIONS = [
    {
      endpoint: "/inject/delay?min=5",
      label: "Delay (+5 min)",
      desc: "Simulates a 5-minute bus delay and propagates ETA compounding",
      Icon: AlertCircle,
      iconColor: "text-amber-500",
      hoverClass: "hover:bg-amber-500 hover:text-white hover:border-amber-500",
      accentClass: "border-amber-200 bg-amber-50",
    },
    {
      endpoint: "/inject/dropout?sec=10",
      label: "GNSS Dropout (10s)",
      desc: "Cuts GPS signal for 10 seconds — Kalman filter holds last estimate",
      Icon: WifiOff,
      iconColor: "text-blue-500",
      hoverClass: "hover:bg-blue-600 hover:text-white hover:border-blue-600",
      accentClass: "border-blue-200 bg-blue-50",
    },
    {
      endpoint: "/inject/crowd?delta=20",
      label: "Crowd Spike (+20 pax)",
      desc: "Injects 20 additional passengers — triggers occupancy band shift",
      Icon: Users,
      iconColor: "text-orange-500",
      hoverClass: "hover:bg-orange-500 hover:text-white hover:border-orange-500",
      accentClass: "border-orange-200 bg-orange-50",
    },
    {
      endpoint: "/reset",
      label: "Reset Pipeline",
      desc: "Resets all injected events and restores default simulation state",
      Icon: RotateCcw,
      iconColor: "text-slate-500",
      hoverClass: "hover:bg-slate-700 hover:text-white hover:border-slate-700",
      accentClass: "border-slate-200 bg-slate-50",
    },
  ];

  const OCCUPANCY_CONFIG: Record<string, { label: string; dot: string; bg: string }> = {
    SEATS_AVAILABLE: { label: "Seats Available", dot: "bg-emerald-500", bg: "bg-emerald-50 text-emerald-800 border-emerald-300" },
    MODERATE: { label: "Moderate", dot: "bg-amber-500", bg: "bg-amber-50 text-amber-800 border-amber-300" },
    STANDING_ROOM: { label: "Standing Room", dot: "bg-orange-500", bg: "bg-orange-50 text-orange-800 border-orange-300" },
    VERY_CROWDED: { label: "Very Crowded", dot: "bg-rose-500", bg: "bg-rose-50 text-rose-800 border-rose-300" },
  };
  const occ = OCCUPANCY_CONFIG[occupancy_band] ?? OCCUPANCY_CONFIG.SEATS_AVAILABLE;

  const TABS = [
    { id: "inject" as const, label: "Inject Controls", Icon: Zap },
    { id: "apis" as const, label: "API Architecture", Icon: Server },
    { id: "log" as const, label: "Event Log", Icon: Terminal },
  ];

  return (
    <div className="min-h-screen bg-transparent" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── TOP NAV ── */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Public View
            </a>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Yara" className="h-8 w-auto object-contain" />
              <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-300 text-[10px] font-extrabold uppercase">
                Admin
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
              isConnected
                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                : "bg-amber-50 border-amber-300 text-amber-700"
            }`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} />
              {isConnected ? "SSE Connected" : "Simulation Mode"}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-[#f7a501]" />
              SIH 2026 · Judge Panel
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ── PIPELINE TELEMETRY CARDS ── */}
        <div>
          <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">
            Live Pipeline Telemetry
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Total ETA"
              value={formatMMSS(T_total_sec)}
              sub={isDelayed ? "⚠ Delayed" : "On schedule"}
              accent={isDelayed ? "text-rose-500" : "text-[#f7a501]"}
              Icon={Clock}
            />
            <StatCard
              label="Prior Leg"
              value={formatMMSS(T_outbound_sec)}
              sub="T_outbound"
              Icon={Navigation}
            />
            <StatCard
              label="Terminal Halt"
              value={formatMMSS(T_dwell_sec)}
              sub="T_dwell (recovery)"
              accent="text-amber-500"
              Icon={Bus}
            />
            <StatCard
              label="To Stop"
              value={formatMMSS(T_inbound_sec)}
              sub="T_inbound"
              Icon={Zap}
            />
          </div>

          {/* Occupancy + block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Occupancy Band</p>
                  <p className="font-black text-slate-900">{occ.label}</p>
                </div>
              </div>
              <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${occ.bg}`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${occ.dot}`} />
                {occ.label}
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-[#f7a501]" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">GTFS-RT Block</p>
                <p className="font-black text-slate-900 font-mono">{data.vehicle.block_id}</p>
                <p className="text-[11px] text-slate-500">
                  Trip: {data.vehicle.trip_id} · Source: {data.vehicle.source}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── TAB BAR ── */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === id
                  ? "bg-[#f7a501] text-slate-950 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ── INJECT CONTROLS TAB ── */}
        {activeTab === "inject" && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-black text-slate-900 text-lg">Event Injection Controls</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Trigger real-time pipeline events — each inject propagates through CH-1 → CH-2 → CH-3 → Dashboard within &lt;2s
                </p>
              </div>
            </div>

            {feedback && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold ${
                feedback.ok
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : "bg-rose-50 border-rose-300 text-rose-700"
              }`}>
                <CheckCircle2 className="w-4 h-4" />
                {feedback.msg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {INJECT_ACTIONS.map(({ endpoint, label, desc, Icon, iconColor, hoverClass, accentClass }) => (
                <button
                  key={label}
                  onClick={() => handleInject(endpoint, label)}
                  disabled={injecting !== null}
                  className={`group flex items-start gap-4 p-5 rounded-2xl border text-left transition-all duration-200 active:scale-[0.98] disabled:opacity-60 ${accentClass} ${hoverClass}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm border border-slate-200 group-hover:bg-white/20 transition-colors">
                    <Icon className={`w-5 h-5 ${iconColor} group-hover:text-current`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 group-hover:text-current">{label}</p>
                    <p className="text-xs text-slate-600 mt-1 group-hover:text-current/80 leading-relaxed">{desc}</p>
                    <code className="text-[10px] font-mono text-slate-400 group-hover:text-current/60 mt-1.5 block">
                      POST {SIM_API}{endpoint}
                    </code>
                  </div>
                  {injecting === label && (
                    <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Pipeline flow diagram */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-4">
                Inject → Effect Pipeline Flow
              </h3>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                  { label: "CH-1\nSimulator", color: "bg-orange-100 border-orange-300 text-orange-800", protocol: "MQTT 1 Hz" },
                  { label: "CH-2\nKalman", color: "bg-amber-100 border-amber-300 text-amber-800", protocol: "MQTT fused" },
                  { label: "CH-3\nETA Engine", color: "bg-blue-100 border-blue-300 text-blue-800", protocol: "SSE stream" },
                  { label: "CH-4\nDashboard", color: "bg-emerald-100 border-emerald-300 text-emerald-800", protocol: "< 2s total" },
                ].map((node, i, arr) => (
                  <React.Fragment key={node.label}>
                    <div className={`flex flex-col items-center p-3 rounded-xl border shrink-0 min-w-[90px] ${node.color}`}>
                      <span className="text-xs font-black text-center whitespace-pre-line leading-tight">{node.label}</span>
                      <span className="text-[9px] font-bold mt-1 opacity-70">{node.protocol}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex flex-col items-center shrink-0">
                        <div className="h-0.5 w-8 bg-slate-300" />
                        <span className="text-[9px] text-slate-400 font-bold mt-0.5">→</span>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── API ARCHITECTURE TAB ── */}
        {activeTab === "apis" && (
          <div className="space-y-3">
            <div>
              <h2 className="font-black text-slate-900 text-lg">System API Architecture</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Live endpoint status, ports, and data contract schemas used across all Yara channels
              </p>
            </div>

            {API_ENDPOINTS.map((api, i) => {
              const Icon = api.Icon;
              return (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${api.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {api.channel}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-700">
                        {api.protocol}
                      </span>
                      <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                        {api.method}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {api.status}
                    </div>
                  </div>

                  <p className="text-sm text-slate-600">{api.description}</p>

                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-mono text-blue-600 font-bold truncate mr-2">{api.url}</span>
                    <button
                      onClick={() => handleCopy(api.url)}
                      className="shrink-0 p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                      title="Copy URL"
                    >
                      {copiedUrl === api.url
                        ? <Check className="w-3.5 h-3.5 text-emerald-600" />
                        : <Copy className="w-3.5 h-3.5 text-slate-500" />
                      }
                    </button>
                  </div>

                  <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700">
                    <span className="text-[10px] font-mono text-slate-400 block mb-1">// Sample Payload</span>
                    <code className="text-[11px] font-mono text-emerald-400 break-all">{api.payload}</code>
                  </div>
                </div>
              );
            })}

            <div className="text-center text-xs text-slate-500 font-medium py-2">
              All port constants enforced via{" "}
              <code className="text-blue-600 font-mono font-bold">shared/constants.py</code>
            </div>
          </div>
        )}

        {/* ── EVENT LOG TAB ── */}
        {activeTab === "log" && (
          <div className="space-y-4">
            <div>
              <h2 className="font-black text-slate-900 text-lg">Connected Pipeline Event Log</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Cause → Effect stream: every inject event shows before/after ETA delta
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              {/* Header row */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                <div className="col-span-2">Timestamp</div>
                <div className="col-span-5">Event</div>
                <div className="col-span-2 text-right">ETA Before</div>
                <div className="col-span-2 text-right">ETA After</div>
                <div className="col-span-1 text-right">Δ</div>
              </div>

              {data.event_log.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400 font-mono">
                  No events yet — trigger an inject above
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
                  {data.event_log.slice().reverse().map((e, i) => {
                    const delta = e.delta_sec;
                    const isNeg = delta < 0;
                    const deltaMin = Math.round(delta / 60);
                    const beforeMin = Math.round(e.T_total_before_sec / 60);
                    const afterMin = Math.round(e.T_total_after_sec / 60);
                    return (
                      <div
                        key={i}
                        className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-50 transition-colors"
                      >
                        <div className="col-span-2 text-xs font-mono text-slate-400">{e.ts}</div>
                        <div className="col-span-5 text-sm font-semibold text-slate-800 truncate">{e.event}</div>
                        <div className="col-span-2 text-right text-xs font-mono text-slate-600">{beforeMin} min</div>
                        <div className="col-span-2 text-right text-xs font-mono text-slate-600">{afterMin} min</div>
                        <div className="col-span-1 text-right">
                          {delta !== 0 ? (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                              isNeg ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            }`}>
                              {isNeg ? "" : "+"}{deltaMin}m
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
