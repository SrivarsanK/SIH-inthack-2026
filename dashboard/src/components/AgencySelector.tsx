import React from "react";
import { AGENCY_PRESETS } from "../lib/agencies";
import type { TransitAgency } from "../lib/agencies";
import { Building2, Check, MapPin, Radio, ShieldAlert } from "lucide-react";

interface AgencySelectorProps {
  selectedAgency: TransitAgency;
  onSelectAgency: (agency: TransitAgency) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const AgencySelector: React.FC<AgencySelectorProps> = ({
  selectedAgency,
  onSelectAgency,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Select Transit Provider Network</h2>
              <p className="text-xs text-slate-400">Real-time & GTFS-RT agency feeds integrated in TransitSense</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-all"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
          {AGENCY_PRESETS.map((agency) => {
            const isSelected = agency.id === selectedAgency.id;

            return (
              <button
                key={agency.id}
                onClick={() => {
                  onSelectAgency(agency);
                  onClose();
                }}
                className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between space-y-3 group ${
                  isSelected
                    ? "bg-blue-600/15 border-blue-500/50 shadow-lg shadow-blue-500/10"
                    : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{agency.logo}</span>
                    <div>
                      <span className="font-bold text-white text-sm block group-hover:text-blue-300 transition-colors">
                        {agency.shortName}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {agency.city}, {agency.state}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shadow-md">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                    {agency.providerType}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <Radio className="w-3 h-3 animate-pulse" />
                    {agency.dataStatus}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-2 text-center text-xs text-slate-500">
          Integrated with GTFS Static, GTFS-RT APIs & Chalo Network Standards
        </div>
      </div>
    </div>
  );
};
