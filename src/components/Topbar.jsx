import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useHealth } from "../hooks/useHealth";

export default function Topbar() {
  const { data: health, loading } = useHealth();
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const statusColor =
    !health || !health.model_loaded
      ? "bg-rose-500"
      : health.status === "healthy"
      ? "bg-emerald-500"
      : "bg-amber-500";

  return (
    <header className="h-16 border-b border-slate-800/80 flex items-center justify-between px-4 md:px-6 lg:px-8 bg-slate-950/80 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="md:hidden rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300"
        >
          Menu
        </button>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Network Intrusion Detection
          </p>
          <p className="font-semibold text-lg">NIDS Monitor</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex flex-col items-end text-xs text-slate-400">
          <span className="font-mono">
            {time.toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
          <span className="text-slate-500">
            {time.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "2-digit",
            })}
          </span>
        </div>

        <motion.div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/80"
          animate={{ opacity: loading ? 0.7 : 1 }}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${statusColor} shadow-glow`}
          />
          <div className="text-xs leading-tight">
            <p className="font-semibold">
              {loading ? "Checking health…" : "Model Status"}
            </p>
            <p className="text-slate-400">
              {health
                ? `${health.status || "unknown"} • ${
                    health.uptime ?? "0 seconds"
                  }`
                : "No response from API"}
            </p>
          </div>
        </motion.div>
      </div>
    </header>
  );
}

