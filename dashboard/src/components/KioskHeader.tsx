import React, { useState, useEffect } from "react";
import { Activity, Clock, Bus, Radio, Monitor, Tv, Navigation } from "lucide-react";

interface KioskHeaderProps {
  isConnected: boolean;
  viewMode: "command" | "kiosk";
  setViewMode: (mode: "command" | "kiosk") => void;
}

export const KioskHeader: React.FC<KioskHeaderProps> = ({ isConnected, viewMode, setViewMode }) => {
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
    <header className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-3.5 flex items-center justify-between shadow-2xl z-30">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
          <Bus className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">TransitSense</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-md">
              SIH 2026
            </span>

            {/* Route Pill Badges from Margdarshak UI */}
            <div className="hidden md:flex items-center gap-1.5 ml-2">
              <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-md shadow-sm border border-blue-400 flex items-center gap-1">
                <Navigation className="w-3 h-3" />
                101
              </span>
              <span className="px-2 py-0.5 text-xs font-semibold bg-slate-800 text-slate-300 rounded-md border border-slate-700">
                16C
              </span>
              <span className="px-2 py-0.5 text-xs font-semibold bg-slate-800 text-slate-300 rounded-md border border-slate-700">
                24E
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400">Live Continuous Public Transit Intelligence Platform</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        {/* Mode Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode("command")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "command"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Command Center</span>
          </button>
          <button
            onClick={() => setViewMode("kiosk")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "kiosk"
                ? "bg-amber-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Stop Kiosk View</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-300">
          <Clock className="w-4 h-4 text-blue-400" />
          <span className="font-mono text-slate-200 font-medium">{timeStr || "19:40:00"}</span>
        </div>

        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-medium text-xs transition-all duration-300 ${
          isConnected 
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10" 
            : "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/10"
        }`}>
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`} />
          <Radio className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{isConnected ? "LIVE STREAM" : "SIMULATED PIPELINE"}</span>
        </div>
      </div>
    </header>
  );
};
