import React from "react";
import { AGENCY_PRESETS } from "../lib/agencies";
import type { TransitAgency } from "../lib/agencies";
import { Building2, Check, MapPin, Radio, Bus, Train, Navigation, X } from "lucide-react";

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
    <div className="fixed inset-0 z-[9999] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-slate-300 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-6 text-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-center text-[#b17816]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Select Transit Provider Network</h2>
              <p className="text-xs text-slate-500 font-medium">Real-time & GTFS-RT agency feeds integrated in TransitSense</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
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
                    ? "bg-amber-50 border-[#f7a501] shadow-md ring-2 ring-[#f7a501]/30"
                    : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#f7a501] text-slate-950 flex items-center justify-center text-sm shrink-0 font-bold">
                      <Bus className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-sm block group-hover:text-[#b17816] transition-colors">
                        {agency.shortName}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {agency.city}, {agency.state}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-[#f7a501] text-slate-950 flex items-center justify-center text-xs shadow-sm font-bold">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold">
                    {agency.providerType}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-700 font-bold">
                    <Radio className="w-3 h-3 animate-pulse text-emerald-600" />
                    {agency.dataStatus}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-2 text-center text-xs text-slate-500 font-medium">
          Integrated with GTFS Static, GTFS-RT APIs & Chalo Network Standards
        </div>
      </div>
    </div>
  );
};
