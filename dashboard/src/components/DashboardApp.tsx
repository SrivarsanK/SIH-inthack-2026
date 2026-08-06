import React from "react";
import { useTransitStream } from "../lib/useTransitStream";
import { KioskHeader } from "./KioskHeader";
import { LiveMap } from "./LiveMap";
import { ETACountdown } from "./ETACountdown";
import { OccupancyBadge } from "./OccupancyBadge";
import { InjectPanel } from "./InjectPanel";
import { EventLog } from "./EventLog";

export const DashboardApp: React.FC = () => {
  const { data, isConnected } = useTransitStream();

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col selection:bg-blue-600 selection:text-white">
      <KioskHeader isConnected={isConnected} />

      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1700px] w-full mx-auto">
        {/* Left Column: Interactive Map (7 cols) */}
        <section className="lg:col-span-7 h-[650px] lg:h-auto min-h-[500px] flex flex-col">
          <LiveMap data={data} />
        </section>

        {/* Right Column: Information & Controls (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-5 justify-between">
          <ETACountdown data={data} />
          <OccupancyBadge band={data.inbound.occupancy_band} />
          <InjectPanel />
          <EventLog events={data.event_log} />
        </section>
      </main>
    </div>
  );
};
