import React from "react";
import { Users, AlertTriangle } from "lucide-react";

interface OccupancyBadgeProps {
  band: "SEATS_AVAILABLE" | "MODERATE" | "STANDING_ROOM" | "VERY_CROWDED";
}

const BAND_CONFIG = {
  SEATS_AVAILABLE: {
    label: "Seats Available",
    subtext: "Plenty of room onboard (<40 pax)",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    dotColor: "bg-emerald-400",
    emoji: "🟢"
  },
  MODERATE: {
    label: "Moderate Crowd",
    subtext: "Seating mostly filled (40–48 pax)",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    dotColor: "bg-amber-400",
    emoji: "🟡"
  },
  STANDING_ROOM: {
    label: "Standing Room Only",
    subtext: "Seats filled, standing area active (48–55 pax)",
    badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    dotColor: "bg-orange-400",
    emoji: "🟠"
  },
  VERY_CROWDED: {
    label: "Very Crowded",
    subtext: "Near maximum capacity (>55 pax)",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    dotColor: "bg-rose-400",
    emoji: "🔴"
  }
};

export const OccupancyBadge: React.FC<OccupancyBadgeProps> = ({ band }) => {
  const config = BAND_CONFIG[band] || BAND_CONFIG.SEATS_AVAILABLE;

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-2xl flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-300">
          <Users className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <span className="text-xs text-slate-400 block font-medium">PASSENGER OCCUPANCY DENSITY</span>
          <span className="text-sm font-semibold text-slate-200 block">{config.subtext}</span>
        </div>
      </div>

      <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-medium text-xs shadow-lg ${config.badgeColor}`}>
        <span className={`w-2 h-2 rounded-full ${config.dotColor} animate-pulse`} />
        <span>{config.emoji} {config.label}</span>
      </div>
    </div>
  );
};
