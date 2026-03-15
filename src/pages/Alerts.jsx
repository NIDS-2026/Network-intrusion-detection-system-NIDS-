import { useMemo } from "react";
import { useStats } from "../hooks/useStats";
import { useHistoryStore } from "../hooks/HistoryContext";
import StatusPill from "../components/StatusPill";

export default function Alerts() {
  const { entries } = useHistoryStore();
  const { data: stats } = useStats(8000);

  const recentAttacks = useMemo(
    () => entries.filter((e) => e.is_attack).slice(0, 10),
    [entries]
  );

  const critical = recentAttacks.filter(
    (e) => (e.threat_level || "").toLowerCase() === "critical"
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Alerts
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Real-time view of recently detected intrusions. This panel combines
          live session data with backend statistics for a control-room feel.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-panel p-4 md:p-5 space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Recent intrusions
              </h2>
              <p className="text-xs text-slate-400">
                Last 10 attack predictions from this session.
              </p>
            </div>
            <div className="text-xs text-slate-400">
              <span className="font-mono text-emerald-300">
                {recentAttacks.length}
              </span>{" "}
              in memory
            </div>
          </div>

          {recentAttacks.length === 0 ? (
            <p className="text-sm text-slate-500">
              No attacks detected in this session yet. As you classify traffic,
              intrusions will appear here automatically.
            </p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-auto scrollbar-thin">
              {recentAttacks.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-500/5 px-3 py-2.5"
                >
                  <div className="space-y-1">
                    <StatusPill
                      isAttack
                      threatLevel={alert.threat_level || "Critical"}
                    />
                    <p className="text-xs text-slate-300">
                      {alert.attack_type}
                    </p>
                    <p className="text-[0.7rem] text-slate-400">
                      {alert.recommendation}
                    </p>
                    {alert.top_features && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {Object.entries(alert.top_features).map(([k, v]) => (
                          <span
                            key={k}
                            className="px-2 py-0.5 rounded-full bg-slate-950/80 border border-slate-800/80 font-mono text-[0.7rem] text-slate-200"
                          >
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-[0.7rem] text-slate-400 whitespace-nowrap">
                    <div>
                      {new Date(alert.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </div>
                    <div className="text-slate-500">
                      {new Date(alert.timestamp).toLocaleDateString()}
                    </div>
                    <div className="mt-1 font-mono text-rose-300">
                      {(alert.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="glass-panel p-4 md:p-5 space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Threat summary
            </h2>
            <dl className="space-y-1 text-xs">
              <Row
                label="Total predictions"
                value={stats?.total_predictions?.toLocaleString() ?? "0"}
              />
              <Row
                label="Attacks detected"
                value={stats?.attacks_detected?.toLocaleString() ?? "0"}
              />
              <Row
                label="Detection rate"
                value={stats?.detection_rate ?? "0%"}
              />
            </dl>
          </div>

          <div className="glass-panel p-4 md:p-5 space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Critical queue
            </h2>
            {critical.length === 0 ? (
              <p className="text-xs text-slate-500">
                No critical alerts in this session.
              </p>
            ) : (
              <ul className="space-y-2 text-xs">
                {critical.slice(0, 5).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start justify-between gap-2 rounded-lg bg-rose-500/10 border border-rose-500/50 px-3 py-2"
                  >
                    <div>
                      <p className="font-mono text-rose-200">
                        {a.prediction.toUpperCase()}
                      </p>
                      <p className="text-[0.7rem] text-slate-300">
                        {a.attack_type}
                      </p>
                    </div>
                    <div className="text-right text-[0.7rem] text-slate-400">
                      {(a.confidence * 100).toFixed(1)}%
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-mono text-slate-100">{value}</dd>
    </div>
  );
}

