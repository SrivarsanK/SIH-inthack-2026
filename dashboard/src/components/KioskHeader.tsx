import React from "react";
import { Clock, Bus, Monitor, Tv, LayoutGrid, MapPin, Terminal, ChevronDown } from "lucide-react";
import type { TransitAgency } from "../lib/agencies";
import { SearchAutocomplete } from "./SearchAutocomplete";

interface KioskHeaderProps {
  isConnected: boolean;
  viewMode: "command" | "kiosk";
  setViewMode: (mode: "command" | "kiosk") => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  selectedAgency: TransitAgency;
  onOpenAgencySelector: () => void;
  onSelectLocation?: (location: { name: string; lat: number; lon: number }) => void;
}

export const KioskHeader: React.FC<KioskHeaderProps> = ({
  isConnected,
  viewMode,
  setViewMode,
  activeTab = "radar",
  setActiveTab,
  selectedAgency,
  onOpenAgencySelector,
  onSelectLocation
}) => {
  const [timeStr, setTimeStr] = React.useState<string>("");

  React.useEffect(() => {
    const updateTime = () => {
      setTimeStr(new Date().toLocaleTimeString("en-US", { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full bg-white/90 backdrop-blur-xl border-b border-slate-300/80 px-4 sm:px-6 py-3 flex flex-col lg:flex-row items-center justify-between gap-3 sm:gap-4 shadow-sm z-30">
      {/* Brand Identity & Agency Provider Picker */}
      <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#f7a501] border border-amber-400/60 flex items-center justify-center text-slate-950 font-black shadow-md shrink-0">
            <Bus className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Yara</h1>
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-[#f7a501]/20 text-[#b17816] border border-[#f7a501]/50 rounded-md">
                SIH 2026
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">Predictive Transit Engine</p>
          </div>
        </div>

        {/* PostHog Style Light Agency Switcher Button */}
        <button
          onClick={onOpenAgencySelector}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-800 transition-all shadow-sm active:scale-95 min-h-[44px] group shrink-0"
        >
          <span className="text-base">{selectedAgency.logo}</span>
          <span className="group-hover:text-[#b17816] transition-colors">{selectedAgency.shortName}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>

      {/* Photon Autocomplete Search Input */}
      {onSelectLocation && (
        <div className="w-full lg:w-auto flex-1 max-w-md">
          <SearchAutocomplete onSelectLocation={onSelectLocation} />
        </div>
      )}

      {/* Center Navigation Tabs */}
      <div className="w-full lg:w-auto flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar">
        <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300/80 shadow-inner max-w-full overflow-x-auto">
          <button
            onClick={() => setActiveTab && setActiveTab("radar")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all min-h-[40px] whitespace-nowrap ${
              activeTab === "radar"
                ? "bg-[#f7a501] text-slate-950 font-black shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Fleet Radar</span>
          </button>

          <button
            onClick={() => setActiveTab && setActiveTab("route")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all min-h-[40px] whitespace-nowrap ${
              activeTab === "route"
                ? "bg-[#f7a501] text-slate-950 font-black shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Trip Route</span>
          </button>

          <button
            onClick={() => setActiveTab && setActiveTab("controls")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all min-h-[40px] whitespace-nowrap ${
              activeTab === "controls"
                ? "bg-[#f7a501] text-slate-950 font-black shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Judge Controls</span>
          </button>
        </nav>

        {/* Right Controls: View Mode & Time */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300">
            <button
              onClick={() => setViewMode("command")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-all min-h-[40px] ${
                viewMode === "command"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Command</span>
            </button>
            <button
              onClick={() => setViewMode("kiosk")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-all min-h-[40px] ${
                viewMode === "kiosk"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kiosk</span>
            </button>
          </div>

          <div className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs shadow-sm">
            <Clock className="w-3.5 h-3.5 text-[#b17816]" />
            <span className="font-mono text-slate-900 font-bold">{timeStr || "19:40:00"}</span>
          </div>

          <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border font-bold text-[11px] transition-all duration-300 min-h-[40px] ${
            isConnected 
              ? "bg-emerald-50 text-emerald-700 border-emerald-300" 
              : "bg-amber-50 text-amber-800 border-amber-300"
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-ping" : "bg-amber-500"}`} />
            <span>{isConnected ? "LIVE" : "SIM"}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
