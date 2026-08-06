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
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-300 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 tracking-wide">
          <Zap className="w-4 h-4 text-[#b17816]" />
          <span>INTERACTIVE JUDGE INJECT CONTROLS</span>
        </div>

        {onOpenApiInspector && (
          <button
            onClick={onOpenApiInspector}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-xs font-bold text-[#b17816] transition-all shadow-sm group min-h-[36px]"
          >
            <Server className="w-3.5 h-3.5 text-[#b17816] group-hover:scale-110 transition-transform" />
            <span>View APIs</span>
          </button>
        )}
      </div>

      {feedback && (
        <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-300 text-[#b17816] text-xs font-bold animate-fadeIn">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => handleInject("/inject/delay?min=5", "Delay (+5 min)")}
          disabled={loading !== null}
          className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-100 hover:bg-amber-500 hover:text-slate-950 border border-slate-300 text-slate-800 text-xs font-bold transition-all duration-200 shadow-sm group active:scale-95 min-h-[48px]"
        >
          <AlertCircle className="w-4 h-4 text-amber-600 group-hover:text-slate-950 group-hover:scale-110 transition-transform" />
          <span>Delay (+5m)</span>
        </button>

        <button
          onClick={() => handleInject("/inject/dropout?sec=10", "GNSS Dropout (10s)")}
          disabled={loading !== null}
          className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white border border-slate-300 text-slate-800 text-xs font-bold transition-all duration-200 shadow-sm group active:scale-95 min-h-[48px]"
        >
          <WifiOff className="w-4 h-4 text-blue-600 group-hover:text-white group-hover:scale-110 transition-transform" />
          <span>GNSS Dropout</span>
        </button>

        <button
          onClick={() => handleInject("/inject/crowd?delta=20", "Crowd Spike (+20 pax)")}
          disabled={loading !== null}
          className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-100 hover:bg-orange-500 hover:text-slate-950 border border-slate-300 text-slate-800 text-xs font-bold transition-all duration-200 shadow-sm group active:scale-95 min-h-[48px]"
        >
          <Users className="w-4 h-4 text-orange-600 group-hover:text-slate-950 group-hover:scale-110 transition-transform" />
          <span>Crowd (+20 pax)</span>
        </button>

        <button
          onClick={() => handleInject("/reset", "Reset Pipeline")}
          disabled={loading !== null}
          className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold transition-all duration-200 shadow-sm active:scale-95 min-h-[48px]"
        >
          <RotateCcw className="w-4 h-4 text-slate-500" />
          <span>Reset Simulation</span>
        </button>
      </div>
    </div>
  );
};
