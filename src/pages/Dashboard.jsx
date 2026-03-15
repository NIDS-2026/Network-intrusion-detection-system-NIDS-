import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

const ATTACK_COLORS = {
  dos: "#f97316",
  probe: "#22c55e",
  r2l: "#6366f1",
  u2r: "#e11d48",
};

const TRAFFIC_COLORS = {
  normal: "#22c55e",
  attack: "#ef4444",
};

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function computeRiskLevel(attackRatio) {
  if (attackRatio >= 0.4) return "Critical";
  if (attackRatio >= 0.25) return "High";
  if (attackRatio >= 0.1) return "Medium";
  if (attackRatio >= 0.03) return "Low";
  return "Very Low";
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [liveMode, setLiveMode] = useState(true);
  const [sessionStart] = useState(() => Date.now());
  const [totalPackets, setTotalPackets] = useState(0);
  const [totalAttacks, setTotalAttacks] = useState(0);
  const [activityFeed, setActivityFeed] = useState([]);
  const [trafficSeries, setTrafficSeries] = useState([]);
  const [attackDist, setAttackDist] = useState({
    dos: 0,
    probe: 0,
    r2l: 0,
    u2r: 0,
  });
  const [latencyMs, setLatencyMs] = useState(8);
  const [rps, setRps] = useState(1.2);
  const [apiHealthy, setApiHealthy] = useState(true);
  const [alertPreview, setAlertPreview] = useState([]);
  const [suspiciousFeatures] = useState([
    { key: "serror_rate", label: "SYN Error Rate", score: 0.8 },
    { key: "count", label: "Host Connection Count", score: 0.7 },
    { key: "src_bytes", label: "Source Bytes Anomaly", score: 0.64 },
    { key: "diff_srv_rate", label: "Different Service Rate", score: 0.58 },
  ]);

  useEffect(() => {
    if (!liveMode) return;

    let packetsInCurrentSecond = 0;
    let lastTickSecond = Math.floor(Date.now() / 1000);

    const interval = setInterval(() => {
      const now = Date.now();
      const sec = Math.floor(now / 1000);

      const burst = Math.random() < 0.15 ? 5 : 1;
      for (let i = 0; i < burst; i++) {
        const isAttack = Math.random() < 0.12;
        const type = isAttack
          ? randomChoice(["dos", "probe", "r2l", "u2r"])
          : "normal";
        const proto = randomChoice(["tcp", "udp", "icmp"]);

        const entry = {
          id: `${now}-${Math.random().toString(16).slice(2)}`,
          ts: now,
          proto,
          type,
          isAttack,
        };

        setActivityFeed((prev) => {
          const next = [entry, ...prev];
          if (next.length > 50) next.pop();
          return next;
        });

        setTotalPackets((p) => p + 1);
        if (isAttack) {
          setTotalAttacks((a) => a + 1);
          setAttackDist((prev) => ({
            ...prev,
            [type]: prev[type] + 1,
          }));
          setAlertPreview((prev) => {
            const alert = {
              id: entry.id,
              ts: now,
              label: type.toUpperCase(),
              proto,
              description:
                type === "dos"
                  ? "High SYN error rate and connection flood detected."
                  : type === "probe"
                  ? "Host scanning behavior across multiple services."
                  : type === "r2l"
                  ? "Repeated failed logins from remote host."
                  : "Privilege escalation patterns from normal user.",
            };
            const next = [alert, ...prev];
            if (next.length > 5) next.pop();
            return next;
          });
        }

        packetsInCurrentSecond += 1;
      }

      if (sec !== lastTickSecond) {
        lastTickSecond = sec;
        setTrafficSeries((prev) => {
          const next = [
            ...prev,
            {
              ts: now,
              label: formatTime(now),
              value: packetsInCurrentSecond,
            },
          ];
          if (next.length > 60) next.shift();
          return next;
        });
        packetsInCurrentSecond = 0;

        setLatencyMs((prev) =>
          Math.max(4, Math.min(25, prev + (Math.random() - 0.5) * 4))
        );
        setRps((prev) =>
          Math.max(0.5, Math.min(20, prev + (Math.random() - 0.5) * 1.5))
        );
        setApiHealthy(Math.random() > 0.03);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [liveMode]);

  const attackRatio = useMemo(
    () => (totalPackets === 0 ? 0 : totalAttacks / totalPackets),
    [totalPackets, totalAttacks]
  );
  const riskLevel = computeRiskLevel(attackRatio);
  const sessionDurationSec = Math.floor((Date.now() - sessionStart) / 1000);

  const donutData = useMemo(() => {
    const normal = totalPackets - totalAttacks;
    return [
      {
        name: "Normal",
        value: normal < 0 ? 0 : normal,
        color: TRAFFIC_COLORS.normal,
      },
      { name: "Attack", value: totalAttacks, color: TRAFFIC_COLORS.attack },
    ];
  }, [totalPackets, totalAttacks]);

  const attackBarData = useMemo(
    () =>
      Object.entries(attackDist).map(([k, v]) => ({
        type: k.toUpperCase(),
        count: v,
      })),
    [attackDist]
  );

  const riskColor =
    riskLevel === "Critical"
      ? "bg-rose-500/10 border-rose-500/70 text-rose-300"
      : riskLevel === "High"
      ? "bg-orange-500/10 border-orange-500/70 text-orange-300"
      : riskLevel === "Medium"
      ? "bg-amber-500/10 border-amber-500/70 text-amber-200"
      : "bg-emerald-500/10 border-emerald-500/70 text-emerald-300";

  const apiDot = apiHealthy ? "bg-emerald-400" : "bg-rose-400";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Security Operations Overview
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Real-time visibility into network activity, intrusion patterns, and
            system health. Designed for continuous monitoring in a SOC
            environment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLiveMode((v) => !v)}
            className={`relative inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              liveMode
                ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-300 shadow-glow"
                : "border-slate-600 bg-slate-900 text-slate-300"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                liveMode ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
              }`}
            />
            Live mode {liveMode ? "ON" : "OFF"}
          </button>

          <div
            className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] ${riskColor}`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                riskLevel === "Critical"
                  ? "bg-rose-400"
                  : riskLevel === "High"
                  ? "bg-orange-400"
                  : riskLevel === "Medium"
                  ? "bg-amber-300"
                  : "bg-emerald-400"
              }`}
            />
            Risk {riskLevel}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Packets observed"
          value={totalPackets}
          sublabel="Across this monitoring session"
          tone="neutral"
          onClick={() => navigate("/logs")}
        />
        <MetricCard
          label="Attacks detected"
          value={totalAttacks}
          sublabel={`${(attackRatio * 100).toFixed(1)}% of traffic`}
          tone="danger"
          onClick={() => navigate("/alerts")}
        />
        <MetricCard
          label="Normal traffic"
          value={totalPackets - totalAttacks}
          sublabel={
            totalPackets === 0
              ? "No traffic yet"
              : `${((1 - attackRatio) * 100).toFixed(1)}% of traffic`
          }
          tone="success"
          onClick={() => navigate("/logs")}
        />
        <SessionCard
          durationSec={sessionDurationSec}
          totalPackets={totalPackets}
          totalAttacks={totalAttacks}
          onClick={() => navigate("/logs")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-panel lg:col-span-2 p-4 md:p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Traffic over time
              </h2>
              <p className="text-xs text-slate-500">
                Packets per second, updated continuously while live mode is
                enabled.
              </p>
            </div>
          </div>
          <div className="h-56">
            {trafficSeries.length === 0 ? (
              <EmptyState label="Waiting for live traffic…" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trafficSeries}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickMargin={4}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    allowDecimals={false}
                  />
                  <ReTooltip
                    contentStyle={{
                      backgroundColor: "#020617",
                      border: "1px solid #1f2937",
                      borderRadius: "0.75rem",
                      fontSize: "0.75rem",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass-panel p-4 md:p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Alert preview
              </h2>
              <p className="text-xs text-slate-500">
                Latest high‑risk detections from the live stream.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/alerts")}
              className="text-[0.7rem] text-emerald-400 hover:text-emerald-300"
            >
              View all
            </button>
          </div>

          {alertPreview.length === 0 ? (
            <EmptyState label="No alerts yet in this session." />
          ) : (
            <ul className="space-y-2 text-xs">
              {alertPreview.slice(0, 5).map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-500/5 px-3 py-2 cursor-pointer hover:border-rose-400 hover:bg-rose-500/10 transition-colors"
                  onClick={() => navigate("/alerts")}
                >
                  <div>
                    <p className="font-mono text-rose-300">{a.label}</p>
                    <p className="text-[0.7rem] text-slate-300">
                      {a.description}
                    </p>
                    <p className="text-[0.6rem] text-slate-500 mt-1">
                      {formatTime(a.ts)} • {a.proto.toUpperCase()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <div className="glass-panel xl:col-span-2 p-4 md:p-5 flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Traffic composition
              </h2>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                    >
                      {donutData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend
                      verticalAlign="bottom"
                      height={32}
                      wrapperStyle={{ fontSize: "0.7rem", color: "#9ca3af" }}
                    />
                    <ReTooltip
                      formatter={(value, name) => [
                        value.toLocaleString(),
                        name,
                      ]}
                      contentStyle={{
                        backgroundColor: "#020617",
                        border: "1px solid "#1f2937",
                        borderRadius: "0.75rem",
                        fontSize: "0.75rem",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Attack distribution
              </h2>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attackBarData}>
                    <XAxis
                      dataKey="type"
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      allowDecimals={false}
                    />
                    <ReTooltip
                      contentStyle={{
                        backgroundColor: "#020617",
                        border: "1px solid #1f2937",
                        borderRadius: "0.75rem",
                        fontSize: "0.75rem",
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {attackBarData.map((entry) => (
                        <Cell
                          key={entry.type}
                          fill={
                            ATTACK_COLORS[entry.type.toLowerCase()] || "#e5e7eb"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 md:p-5 flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Top suspicious feature signals
          </h2>
          <p className="text-[0.7rem] text-slate-500 mb-1">
            Features contributing most frequently to recent attack
            classifications.
          </p>
          <div className="space-y-2">
            {suspiciousFeatures.map((feat) => (
              <div key={feat.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">{feat.label}</span>
                  <span className="font-mono text-slate-400">
                    {(feat.score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${feat.score * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 xl:col-span-1">
          <div className="glass-panel p-4 md:p-5 flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              System performance
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Model latency</span>
                <span className="font-mono text-slate-100">
                  {latencyMs.toFixed(1)} ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Requests / second</span>
                <span className="font-mono text-slate-100">
                  {rps.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">API status</span>
                <span className="inline-flex items-center gap-1 font-mono">
                  <span
                    className={`h-2 w-2 rounded-full ${apiDot} shadow-glow`}
                  />
                  <span className={apiHealthy ? "text-emerald-300" : "text-rose-300"}>
                    {apiHealthy ? "Healthy" : "Degraded"}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-4 md:p-5 flex flex-col gap-3 max-h-64">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Live activity
              </h2>
              <span className="text-[0.65rem] text-slate-500">
                Last {activityFeed.length} packets
              </span>
            </div>
            <div className="space-y-1 text-[0.7rem] overflow-auto scrollbar-thin">
              <AnimatePresence initial={false}>
                {activityFeed.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="font-mono text-slate-500 w-18">
                      {formatTime(p.ts)}
                    </span>
                    <span className="uppercase text-slate-400">
                      {p.proto}
                    </span>
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 border ${
                        p.isAttack
                          ? "border-rose-500/70 bg-rose-500/10 text-rose-300"
                          : "border-emerald-500/70 bg-emerald-500/10 text-emerald-300"
                      }`}
                    >
                      {p.isAttack ? "Attack" : "Normal"}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {activityFeed.length === 0 && (
                <EmptyState label="Waiting for first packet…" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sublabel, tone, onClick }) {
  const toneClasses =
    tone === "danger"
      ? "border-rose-500/60 bg-rose-500/5 hover:bg-rose-500/10"
      : tone === "success"
      ? "border-emerald-500/60 bg-emerald-500/5 hover:bg-emerald-500/10"
      : "border-slate-700/80 bg-slate-900/60 hover:bg-slate-900";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`glass-panel ${toneClasses} flex flex-col gap-1.5 px-4 py-3 text-left transition-colors`}
    >
      <span className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <motion.span
        key={value}
        initial={{ opacity: 0.6, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="text-xl md:text-2xl font-semibold"
      >
        {value.toLocaleString()}
      </motion.span>
      {sublabel && (
        <span className="text-[0.7rem] text-slate-400">{sublabel}</span>
      )}
    </button>
  );
}

function SessionCard({ durationSec, totalPackets, totalAttacks, onClick }) {
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-panel border-slate-700/80 bg-slate-900/60 hover:bg-slate-900 flex flex-col gap-1.5 px-4 py-3 text-left transition-colors"
    >
      <span className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-400">
        Session summary
      </span>
      <span className="text-lg font-semibold">
        {mins}m {secs.toString().padStart(2, "0")}s
      </span>
      <span className="text-[0.7rem] text-slate-400">
        {totalPackets.toLocaleString()} packets •{" "}
        <span className="text-rose-300">
          {totalAttacks.toLocaleString()} attacks
        </span>
      </span>
    </button>
  );
}

function EmptyState({ label }) {
  return (
    <div className="h-full flex items-center justify-center text-xs text-slate-500">
      {label}
    </div>
  );
}

