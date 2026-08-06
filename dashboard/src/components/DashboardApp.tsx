import React, { useState } from "react";
import { useTransitStream } from "../lib/useTransitStream";
import { ChaloHomeView } from "./ChaloHomeView";
import { KioskDisplayView } from "./KioskDisplayView";
import { AgencySelector } from "./AgencySelector";
import { AGENCY_PRESETS } from "../lib/agencies";
import type { TransitAgency } from "../lib/agencies";

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
    <div className="min-h-screen bg-[#FAF9F6] font-sans antialiased text-slate-900">
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
        onSwitchToKiosk={() => setViewMode("kiosk")}
      />
    </div>
  );
};
