import React, { useState } from "react";
import { useTransitStream } from "../lib/useTransitStream";
import { KioskHeader } from "./KioskHeader";
import { LiveMap } from "./LiveMap";
import { ETACountdown } from "./ETACountdown";
import { OccupancyBadge } from "./OccupancyBadge";
import { InjectPanel } from "./InjectPanel";
import { EventLog } from "./EventLog";
import { TripTimeline } from "./TripTimeline";
import { KioskDisplayView } from "./KioskDisplayView";
import { AgencySelector } from "./AgencySelector";
import { ApiInspectorModal } from "./ApiInspectorModal";
import { AGENCY_PRESETS } from "../lib/agencies";
import type { TransitAgency } from "../lib/agencies";

export const DashboardApp: React.FC = () => {
  const { data, isConnected } = useTransitStream();
  const [viewMode, setViewMode] = useState<"command" | "kiosk">("command");
  const [activeTab, setActiveTab] = useState<string>("radar");
  const [selectedAgency, setSelectedAgency] = useState<TransitAgency>(AGENCY_PRESETS[0]);
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState<boolean>(false);
  const [isApiInspectorOpen, setIsApiInspectorOpen] = useState<boolean>(false);
  const [searchedLocation, setSearchedLocation] = useState<{ name: string; lat: number; lon: number } | null>(null);

  if (viewMode === "kiosk") {
    return <KioskDisplayView data={data} onExit={() => setViewMode("command")} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col selection:bg-blue-600 selection:text-white">
      <KioskHeader
        isConnected={isConnected}
        viewMode={viewMode}
        setViewMode={setViewMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedAgency={selectedAgency}
        onOpenAgencySelector={() => setIsAgencyModalOpen(true)}
        onSelectLocation={setSearchedLocation}
      />

      <AgencySelector
        selectedAgency={selectedAgency}
        onSelectAgency={setSelectedAgency}
        isOpen={isAgencyModalOpen}
        onClose={() => setIsAgencyModalOpen(false)}
      />

      <ApiInspectorModal
        isOpen={isApiInspectorOpen}
        onClose={() => setIsApiInspectorOpen(false)}
      />

      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1700px] w-full mx-auto">
        {/* Left Column: MapLibre Map or Timeline based on tab (7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          {activeTab === "route" ? (
            <div className="space-y-6">
              <TripTimeline data={data} />
              <div className="h-[400px]">
                <LiveMap data={data} selectedAgency={selectedAgency} searchedLocation={searchedLocation} />
              </div>
            </div>
          ) : (
            <div className="space-y-6 flex-1 flex flex-col">
              <div className="h-[520px] min-h-[420px] flex-1">
                <LiveMap data={data} selectedAgency={selectedAgency} searchedLocation={searchedLocation} />
              </div>
              <TripTimeline data={data} />
            </div>
          )}
        </section>

        {/* Right Column: Key Stats & Interactive Controls (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-5 justify-between">
          <ETACountdown data={data} />
          <OccupancyBadge band={data.inbound.occupancy_band} />
          <InjectPanel onOpenApiInspector={() => setIsApiInspectorOpen(true)} />
          <EventLog events={data.event_log} />
        </section>
      </main>
    </div>
  );
};
