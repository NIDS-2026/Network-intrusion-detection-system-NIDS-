import { useMemo, useState } from "react";
import { useHistoryStore } from "../hooks/HistoryContext";
import StatusPill from "../components/StatusPill";

export default function Logs() {
  const { entries, clear } = useHistoryStore();
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    if (filter === "attack") {
      return entries.filter((e) => e.is_attack);
    }
    if (filter === "normal") {
      return entries.filter((e) => !e.is_attack);
    }
    return entries;
  }, [entries, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Logs & History
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            All predictions made via this frontend during the current session.
            Use filters to quickly inspect attack traffic versus benign flows.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <FilterChip
            label="All"
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <FilterChip
            label="Attacks"
            active={filter === "attack"}
            onClick={() => setFilter("attack")}
          />
          <FilterChip
            label="Normal"
            active={filter === "normal"}
            onClick={() => setFilter("normal")}
          />
          <button
            type="button"
            onClick={clear}
            className="ml-2 rounded-lg border border-slate-700/80 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-900/80"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="glass-panel p-4 md:p-5">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500">
            No predictions recorded yet. Run live detection to populate the
            history table.
          </p>
        ) : (
          <div className="max-h-[480px] overflow-auto scrollbar-thin">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-950/90 text-slate-400">
                <tr className="border-b border-slate-800">
                  <th className="py-2 pr-3 text-left font-medium">Timestamp</th>
                  <th className="py-2 pr-3 text-left font-medium">Type</th>
                  <th className="py-2 pr-3 text-left font-medium">
                    Prediction
                  </th>
                  <th className="py-2 pr-3 text-left font-medium">
                    Confidence
                  </th>
                  <th className="py-2 pr-3 text-left font-medium">Threat</th>
                  <th className="py-2 pr-3 text-left font-medium">
                    Key features
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-slate-900/80 last:border-0 hover:bg-slate-900/60"
                  >
                    <td className="py-1.5 pr-3 align-top whitespace-nowrap text-slate-400">
                      {new Date(entry.timestamp).toLocaleTimeString()}{" "}
                      <span className="text-slate-500">
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 align-top text-slate-300">
                      {entry.type === "batch"
                        ? `Batch #${(entry.index ?? 0) + 1}`
                        : "Single"}
                    </td>
                    <td className="py-1.5 pr-3 align-top">
                      <StatusPill
                        isAttack={entry.is_attack}
                        threatLevel={entry.threat_level}
                      />
                    </td>
                    <td className="py-1.5 pr-3 align-top">
                      <span className="font-mono">
                        {(entry.confidence * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 align-top text-slate-300">
                      {entry.attack_type}
                    </td>
                    <td className="py-1.5 pr-3 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        {entry.top_features &&
                          Object.entries(entry.top_features).map(([k, v]) => (
                            <span
                              key={k}
                              className="px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700/80 font-mono text-[0.7rem] text-slate-200"
                            >
                              {k}: {String(v)}
                            </span>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 border text-xs ${
        active
          ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-300 shadow-glow"
          : "border-slate-700/80 bg-slate-950/80 text-slate-300 hover:bg-slate-900/80"
      }`}
    >
      {label}
    </button>
  );
}

