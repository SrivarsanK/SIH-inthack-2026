import React from "react";
import { Users } from "lucide-react";

interface OccupancyBadgeProps {
  band: "SEATS_AVAILABLE" | "MODERATE" | "STANDING_ROOM" | "VERY_CROWDED";
}

const BAND_CONFIG = {
  SEATS_AVAILABLE: {
    label: "Seats Available",
    subtext: "Plenty of room onboard (<40 pax)",
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-300",
    dotColor: "bg-emerald-500",
  },
  MODERATE: {
    label: "Moderate Crowd",
    subtext: "Seating mostly filled (40–48 pax)",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-300",
    dotColor: "bg-amber-500",
  },
  STANDING_ROOM: {
    label: "Standing Room Only",
    subtext: "Seats filled, standing area active (48–55 pax)",
    badgeColor: "bg-orange-50 text-orange-800 border-orange-300",
    dotColor: "bg-orange-500",
  },
  VERY_CROWDED: {
    label: "Very Crowded",
    subtext: "Near maximum capacity (>55 pax)",
    badgeColor: "bg-rose-50 text-rose-800 border-rose-300",
    dotColor: "bg-rose-500",
  },
};

export const OccupancyBadge: React.FC<OccupancyBadgeProps> = ({ band }) => {
  const config = BAND_CONFIG[band] || BAND_CONFIG.SEATS_AVAILABLE;

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-300 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
          <Users className="w-5 h-5 text-[#b17816]" />
        </div>
        <div>
          <span className="text-xs text-slate-500 block font-bold uppercase">PASSENGER OCCUPANCY DENSITY</span>
          <span className="text-sm font-bold text-slate-900 block">{config.subtext}</span>
        </div>
      </div>

      <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-bold text-xs shadow-sm ${config.badgeColor}`}>
        <span>{config.label}</span>
      </div>
    </div>
  );
};
