import React from "react";
import { Terminal } from "lucide-react";

interface EventLogProps {
  events: Array<{
    ts: string;
    event: string;
    T_total_before_sec: number;
    T_total_after_sec: number;
    delta_sec: number;
  }>;
}

export const EventLog: React.FC<EventLogProps> = ({ events }) => {
  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-300 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <Terminal className="w-4 h-4 text-emerald-600" />
          <span>CONNECTED PIPELINE EVENT LOG</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">Cause & Effect Stream</span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-48 space-y-2 pr-1 custom-scrollbar">
        {events.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500 font-mono">
            Waiting for pipeline events...
          </div>
        ) : (
          events.slice().reverse().map((e, i) => {
            const isNegative = e.delta_sec < 0;
            const deltaMinutes = Math.round(e.delta_sec / 60);

            return (
              <div
                key={i}
                className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono transition-all hover:border-slate-300"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-slate-500 shrink-0">{e.ts}</span>
                  <span className="text-slate-800 truncate font-semibold">{e.event}</span>
                </div>

                {e.delta_sec !== 0 && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      isNegative
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-rose-100 text-rose-800 border border-rose-300"
                    }`}
                  >
                    {isNegative ? "" : "+"}{deltaMinutes}m
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
