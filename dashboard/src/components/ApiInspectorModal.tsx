import React, { useState } from "react";
import { Server, Radio, Database, Map, Search, CheckCircle2, AlertCircle, Copy, Check } from "lucide-react";

interface ApiInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const API_ENDPOINTS = [
  {
    channel: "CH-1 Simulator REST API",
    method: "POST",
    url: "http://localhost:8001/inject/*",
    protocol: "HTTP REST",
    status: "Active (200 OK)",
    icon: Server,
    color: "border-orange-500/40 text-orange-400 bg-orange-500/10",
    description: "Simulator event injection control endpoints (/inject/delay, /inject/dropout, /inject/crowd, /reset)",
    payload: `{"event": "inject_delay", "min": 5, "block_id": "block_001"}`
  },
  {
    channel: "CH-2 Kalman Fusion Service",
    method: "PUB/SUB",
    url: "mqtt://localhost:1883/fleet/bus_1/fused",
    protocol: "MQTT v3.1.1",
    status: "Subscribed (1Hz)",
    icon: Database,
    color: "border-amber-500/40 text-amber-400 bg-amber-500/10",
    description: "Fuses raw GNSS + cell triangulation telemetry with 1D Kalman state estimation filter",
    payload: `{"lat": 12.9740, "lon": 77.5970, "source": "kalman_estimated", "trip_id": "trip_outbound_1"}`
  },
  {
    channel: "CH-3 ETA & Density SSE Engine",
    method: "GET /stream",
    url: "http://localhost:8002/stream",
    protocol: "HTTP EventSource (SSE)",
    status: "Streaming (1Hz)",
    icon: Radio,
    color: "border-blue-500/40 text-blue-400 bg-blue-500/10",
    description: "GTFS-RT JSON stream broadcasting compounding ETAs, dwell time recovery, and occupancy bands",
    payload: `{"inbound": {"T_total_sec": 720, "occupancy_band": "SEATS_AVAILABLE"}, "vehicle": {"progress": 0.45}}`
  },
  {
    channel: "OpenFreeMap Vector Tile API",
    method: "GET /styles/dark",
    url: "https://tiles.openfreemap.org/styles/dark",
    protocol: "Vector Tile Spec",
    status: "Commercial-Free (200 OK)",
    icon: Map,
    color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
    description: "Open-source zero-cost vector map tiles using Btrfs static-file architecture (No API key needed)",
    payload: `{"version": 8, "name": "OpenFreeMap Dark", "sources": {"openfreemap": {"type": "vector"}}}`
  },
  {
    channel: "Photon Geocoding Autocomplete API",
    method: "GET /api/?q=...",
    url: "https://photon.komoot.io/api/?q=Bengaluru",
    protocol: "OpenSearch GeoJSON",
    status: "Active (200 OK)",
    icon: Search,
    color: "border-purple-500/40 text-purple-400 bg-purple-500/10",
    description: "Instant search-as-you-type autocomplete geocoder for OpenStreetMap data",
    payload: `{"type": "FeatureCollection", "features": [{"geometry": {"coordinates": [77.5946, 12.9716]}}]}`
  }
];

export const ApiInspectorModal: React.FC<ApiInspectorModalProps> = ({ isOpen, onClose }) => {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-3xl w-full shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">System API Architecture & Data Contracts</h2>
              <p className="text-xs text-slate-400">Live endpoint status, ports, and protocol schemas used by TransitSense</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-all"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 max-h-[460px] overflow-y-auto custom-scrollbar pr-1">
          {API_ENDPOINTS.map((api, i) => {
            const Icon = api.icon;

            return (
              <div key={i} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${api.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {api.channel}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-300 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                      {api.protocol}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{api.status}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300">{api.description}</p>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
                  <span className="text-blue-300 truncate mr-2">{api.url}</span>
                  <button
                    onClick={() => handleCopy(api.url)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all shrink-0"
                    title="Copy URL"
                  >
                    {copiedUrl === api.url ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60 text-[11px] font-mono text-slate-400 overflow-x-auto">
                  <span className="text-slate-500 block mb-0.5">// Sample Data Contract Payload</span>
                  <code>{api.payload}</code>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800">
          All constants & port contracts enforced via <code className="text-blue-400 font-mono">shared/constants.py</code>
        </div>
      </div>
    </div>
  );
};
