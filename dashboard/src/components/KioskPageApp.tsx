import React from "react";
import { useTransitStream } from "../lib/useTransitStream";
import { KioskDisplayView } from "./KioskDisplayView";
import { AGENCY_PRESETS } from "../lib/agencies";

export const KioskPageApp: React.FC = () => {
  const { data, isConnected } = useTransitStream();

  return (
    <KioskDisplayView
      data={data}
      selectedAgency={AGENCY_PRESETS[0]}
      onExit={() => {
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
      }}
    />
  );
};
