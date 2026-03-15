import { useEffect, useState } from "react";
import { useStats } from "../hooks/useStats";
import { fetchModelInfo } from "../services/api";
import StatCard from "../components/StatCard";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const ATTACK_COLORS = {
  dos: "#f97316",
  probe: "#22c55e",
  r2l: "#6366f1",
  u2r: "#e11d48",
};

export default function Dashboard() {
  const { data: stats, loading: statsLoading } = useStats();
  const [modelInfo, setModelInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetchModelInfo();
      if (!cancelled) setModelInfo(res.data);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = stats?.total_predictions ?? 0;
  const attacks = stats?.attacks_detected ?? 0;
  const normal = total - attacks;
  const normalPct =
    total === 0 ? 100 : Math.round(((total - attacks) / total) * 100);

  const pieData =
    stats?.attack_breakdown && total > 0
      ? Object.entries(stats.attack_breakdown).map(([k, v]) => ({
          name: k.toUpperCase(),
          value: v,
        }))
      : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Overview
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Real-time view of your network intrusion detection system. Monitor
          traffic volume, attack surface, and model health at a glance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total packets analyzed"
          value={statsLoading ? "…" : total.toLocaleString()}
          sublabel="Aggregated from persistent backend statistics"
        />
        <StatCard
          label="Attacks detected"
          value={statsLoading ? "…" : attacks.toLocaleString()}
          sublabel={
            stats?.detection_rate
              ? `Detection rate: ${stats.detection_rate}`
              : "Detection rate updates as new predictions arrive"
          }
          tone="danger"
        />
        <StatCard
          label="Normal traffic"
          value={`${normalPct}%`}
          sublabel={
            statsLoading
              ? "Calculating baseline…"
              : `${normal.toLocaleString()} of ${total.toLocaleString()}`
          }
          tone="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-panel col-span-2 p-4 md:p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Attack surface
              </h2>
              <p className="text-xs text-slate-400">
                Breakdown of attack types observed over time
              </p>
            </div>
          </div>
          <div className="h-64">
            {pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-500">
                No attack data yet. As traffic is analyzed, attack distribution
                will appear here.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={ATTACK_COLORS[entry.name.toLowerCase()] || "#22c55e"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#020617",
                      border: "1px solid #1f2937",
                      borderRadius: "0.75rem",
                      fontSize: "0.75rem",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            {Object.entries(ATTACK_COLORS).map(([key, color]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="uppercase tracking-[0.16em] text-slate-400">
                  {key}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-4 md:p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Model details
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Version</span>
              <span className="font-mono text-slate-100">
                {modelInfo?.version || "…"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Model type</span>
              <span className="font-mono text-slate-100">
                {modelInfo?.model_type || "…"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Feature count</span>
              <span className="font-mono text-slate-100">
                {modelInfo?.features ?? 41}
              </span>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-slate-400 mb-1.5">Attack types</p>
            <div className="flex flex-wrap gap-1.5">
              {(modelInfo?.attack_types || []).map((type) => (
                <span
                  key={type}
                  className="px-2 py-0.5 rounded-full border border-slate-700/80 text-[0.7rem] uppercase tracking-[0.16em] text-slate-300"
                >
                  {type}
                </span>
              ))}
              {(!modelInfo || (modelInfo.attack_types || []).length === 0) && (
                <span className="text-xs text-slate-500">
                  Awaiting response from API…
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

