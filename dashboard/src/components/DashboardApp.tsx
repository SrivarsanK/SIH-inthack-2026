import React, { useState } from "react";
import { useTransitStream } from "../lib/useTransitStream";
import { ChaloHomeView } from "./ChaloHomeView";
import { KioskDisplayView } from "./KioskDisplayView";
import { AGENCY_PRESETS } from "../lib/agencies";
import type { TransitAgency } from "../lib/agencies";

export const DashboardApp: React.FC = () => {
  const { data, isConnected } = useTransitStream();
  const [viewMode, setViewMode] = useState<"home" | "kiosk">("home");
  const [selectedAgency, setSelectedAgency] = useState<TransitAgency>(AGENCY_PRESETS[0]);

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
      <ChaloHomeView
        data={data}
        isConnected={isConnected}
        selectedAgency={selectedAgency}
        onSelectAgency={setSelectedAgency}
        onSwitchToKiosk={() => setViewMode("kiosk")}
      />
    </div>
  );
};
