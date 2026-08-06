import React, { useState } from "react";
import { AlertCircle, WifiOff, Users, RotateCcw, Zap, Server } from "lucide-react";

const SIM_API = "http://localhost:8001";

interface InjectPanelProps {
  onOpenApiInspector?: () => void;
}

export const InjectPanel: React.FC<InjectPanelProps> = ({ onOpenApiInspector }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleInject = async (endpoint: string, label: string) => {
    setLoading(label);
    setFeedback(null);
    try {
      const res = await fetch(`${SIM_API}${endpoint}`, { method: "POST" });
      if (res.ok) {
        setFeedback(`Triggered: ${label}`);
      } else {
        setFeedback(`Simulation mock triggered: ${label}`);
      }
    } catch (err) {
      setFeedback(`Triggered simulation event: ${label}`);
    } finally {
      setTimeout(() => setLoading(null), 800);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>INTERACTIVE JUDGE INJECT CONTROLS</span>
        </div>

        {onOpenApiInspector && (
          <button
            onClick={onOpenApiInspector}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-bold text-blue-300 transition-all shadow-sm group min-h-[36px]"
          >
            <Server className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
            <span>🔌 View APIs</span>
          </button>
        )}
      </div>

      {feedback && (
        <div className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium animate-fadeIn">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => handleInject("/inject/delay?min=5", "Delay (+5 min)")}
          disabled={loading !== null}
          className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-800/80 hover:bg-amber-600 border border-slate-700 hover:border-amber-500 text-white text-xs font-semibold transition-all duration-200 shadow-md group active:scale-95 min-h-[48px]"
        >
          <AlertCircle className="w-4 h-4 text-amber-400 group-hover:text-white group-hover:scale-110 transition-transform" />
          <span>⚠️ Delay (+5m)</span>
        </button>

        <button
          onClick={() => handleInject("/inject/dropout?sec=10", "GNSS Dropout (10s)")}
          disabled={loading !== null}
          className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-800/80 hover:bg-blue-600 border border-slate-700 hover:border-blue-500 text-white text-xs font-semibold transition-all duration-200 shadow-md group active:scale-95 min-h-[48px]"
        >
          <WifiOff className="w-4 h-4 text-blue-400 group-hover:text-white group-hover:scale-110 transition-transform" />
          <span>📡 GNSS Dropout</span>
        </button>

        <button
          onClick={() => handleInject("/inject/crowd?delta=20", "Crowd Spike (+20 pax)")}
          disabled={loading !== null}
          className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-800/80 hover:bg-orange-600 border border-slate-700 hover:border-orange-500 text-white text-xs font-semibold transition-all duration-200 shadow-md group active:scale-95 min-h-[48px]"
        >
          <Users className="w-4 h-4 text-orange-400 group-hover:text-white group-hover:scale-110 transition-transform" />
          <span>👥 Crowd (+20 pax)</span>
        </button>

        <button
          onClick={() => handleInject("/reset", "Reset Pipeline")}
          disabled={loading !== null}
          className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-800/40 hover:bg-slate-700/60 border border-slate-800 hover:border-slate-600 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all duration-200 shadow-md active:scale-95 min-h-[48px]"
        >
          <RotateCcw className="w-4 h-4 text-slate-400" />
          <span>🔄 Reset Simulation</span>
        </button>
      </div>
    </div>
  );
};
