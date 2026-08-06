import React from "react";
import { AGENCY_PRESETS } from "../lib/agencies";
import type { TransitAgency } from "../lib/agencies";
import { Check, Bus } from "lucide-react";

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
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Invisible backdrop overlay to close dropdown when clicking outside */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Sleek Dropdown Menu Anchored Directly Under Bengaluru Button */}
      <div className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
        
        {/* Dropdown Header Label */}
        <div className="px-3 pt-2 pb-1 flex items-center justify-between border-b border-slate-100">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
            Select Transit Provider
          </span>
          <span className="text-[10px] font-bold text-[#b17816] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
            {AGENCY_PRESETS.length} Networks
          </span>
        </div>

        {/* Agency Dropdown List Options */}
        <div className="space-y-1 max-h-72 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {AGENCY_PRESETS.map((agency) => {
            const isSelected = agency.id === selectedAgency.id;

            return (
              <button
                key={agency.id}
                onClick={() => {
                  onSelectAgency(agency);
                  onClose();
                }}
                className={`w-full p-2.5 rounded-xl text-left transition-all duration-150 flex items-center justify-between group ${
                  isSelected
                    ? "bg-amber-50/90 border border-[#f7a501] shadow-2xs"
                    : "hover:bg-slate-50 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    isSelected ? "bg-[#f7a501] text-slate-950 shadow-xs" : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                  }`}>
                    <Bus className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold text-xs truncate ${isSelected ? "text-slate-900" : "text-slate-700 group-hover:text-slate-900"}`}>
                        {agency.city}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        ({agency.shortName})
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-500 truncate block font-medium">
                      {agency.dataStatus}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-[#f7a501] text-slate-950 flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

      </div>
    </>
  );
};
