export default function StatCard({ label, value, sublabel, tone = "neutral" }) {
  const toneClasses =
    tone === "danger"
      ? "border-rose-500/60 bg-rose-500/5"
      : tone === "success"
      ? "border-emerald-500/60 bg-emerald-500/5"
      : "border-slate-700/80 bg-slate-900/60";

  return (
    <div
      className={`glass-panel ${toneClasses} flex flex-col gap-1.5 px-4 py-3`}
    >
      <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      {sublabel && (
        <div className="text-xs text-slate-400 truncate">{sublabel}</div>
      )}
    </div>
  );
}

