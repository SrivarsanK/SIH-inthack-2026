import React, { useState, useEffect } from "react";
import { Clock, Bus, Radio, Monitor, Tv, Navigation, LayoutGrid, MapPin, Terminal } from "lucide-react";

interface KioskHeaderProps {
  isConnected: boolean;
  viewMode: "command" | "kiosk";
  setViewMode: (mode: "command" | "kiosk") => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const KioskHeader: React.FC<KioskHeaderProps> = ({
  isConnected,
  viewMode,
  setViewMode,
  activeTab = "radar",
  setActiveTab
}) => {
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(new Date().toLocaleTimeString("en-US", { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl z-30">
      {/* Brand Identity & Route Badges */}
      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 border border-blue-400/40 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Bus className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white tracking-tight">TransitSense</h1>
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-md">
                SIH 2026
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Predictive Transit Engine</p>
          </div>
        </div>

        {/* Route Pills */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800">
          <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-md shadow-sm border border-blue-400 flex items-center gap-1">
            <Navigation className="w-3 h-3" />
            101
          </span>
          <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-800 text-slate-400 rounded-md">
            16C
          </span>
          <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-800 text-slate-400 rounded-md">
            24E
          </span>
        </div>
      </div>

      {/* Center Navigation Tabs (Intuitive & Simple) */}
      <nav className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800/80 shadow-inner">
        <button
          onClick={() => setActiveTab && setActiveTab("radar")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === "radar"
              ? "bg-blue-600 text-white shadow-lg"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Fleet Radar</span>
        </button>

        <button
          onClick={() => setActiveTab && setActiveTab("route")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === "route"
              ? "bg-blue-600 text-white shadow-lg"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Trip Route</span>
        </button>

        <button
          onClick={() => setActiveTab && setActiveTab("controls")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === "controls"
              ? "bg-blue-600 text-white shadow-lg"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Judge Controls</span>
        </button>
      </nav>

      {/* Right Controls: Mode & Time */}
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode("command")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              viewMode === "command"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Command</span>
          </button>
          <button
            onClick={() => setViewMode("kiosk")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              viewMode === "kiosk"
                ? "bg-amber-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Kiosk</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-mono text-slate-200 font-bold">{timeStr || "19:40:00"}</span>
        </div>

        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-bold text-[11px] transition-all duration-300 ${
          isConnected 
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
        }`}>
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`} />
          <span>{isConnected ? "LIVE" : "SIMULATION"}</span>
        </div>
      </div>
    </header>
  );
};
