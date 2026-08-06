import React, { useState } from "react";
import { useTransitStream } from "../lib/useTransitStream";
import { ChaloHomeView } from "./ChaloHomeView";
import { KioskDisplayView } from "./KioskDisplayView";
import { AgencySelector } from "./AgencySelector";
import { AGENCY_PRESETS } from "../lib/agencies";
import type { TransitAgency } from "../lib/agencies";
import { ExternalLink, ShieldCheck, Smartphone } from "lucide-react";

export const DashboardApp: React.FC = () => {
  const { data, isConnected } = useTransitStream();
  const [viewMode, setViewMode] = useState<"home" | "kiosk">("home");
  const [selectedAgency, setSelectedAgency] = useState<TransitAgency>(AGENCY_PRESETS[0]);
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState<boolean>(false);

  if (viewMode === "kiosk") {
    return (
      <KioskDisplayView
        data={data}
        isConnected={isConnected}
        selectedAgency={selectedAgency}
        onSwitchToHome={() => setViewMode("home")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#eeefe9] font-sans antialiased text-slate-900 selection:bg-amber-200">
      {/* Top Header Bar for Desktop Viewports */}
      <div className="hidden md:flex items-center justify-between px-6 py-2.5 bg-slate-900 text-white border-b border-slate-800 text-xs shadow-md">
        <div className="flex items-center gap-3 font-bold">
          <span className="flex items-center gap-1.5 text-[#f7a501]">
            <Smartphone className="w-4 h-4" />
            TransitSense Mobile View
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 font-medium">
            Live simulated public transit intelligence ({selectedAgency.city})
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode("kiosk")}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors border border-slate-700"
          >
            Switch to Kiosk Display
          </button>
          <a
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#f7a501] text-slate-950 font-extrabold hover:bg-amber-400 transition-colors shadow-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Judge Admin Panel
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
        </div>
      </div>

      {/* Main Container: Centered App Shell on Desktop (max-w-[480px]), Full-width on Mobile */}
      <div className="max-w-[480px] w-full mx-auto min-h-screen bg-[#FAF9F6] shadow-2xl md:border-x border-slate-200/80 flex flex-col relative">
        <AgencySelector
          selectedAgency={selectedAgency}
          onSelectAgency={setSelectedAgency}
          isOpen={isAgencyModalOpen}
          onClose={() => setIsAgencyModalOpen(false)}
        />

        <ChaloHomeView
          data={data}
          isConnected={isConnected}
          selectedAgency={selectedAgency}
          onOpenAgencySelector={() => setIsAgencyModalOpen(true)}
        />
      </div>
    </div>
  );
};
