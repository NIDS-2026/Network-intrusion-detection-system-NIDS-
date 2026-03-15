export default function StatusPill({ isAttack, threatLevel }) {
  const tone = isAttack ? "attack" : "normal";
  const base =
    tone === "attack"
      ? "bg-rose-500/10 text-rose-300 border-rose-500/60"
      : "bg-emerald-500/10 text-emerald-300 border-emerald-500/60";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border font-medium ${base}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          tone === "attack" ? "bg-rose-400" : "bg-emerald-400"
        }`}
      />
      <span>{isAttack ? "Attack" : "Normal"}</span>
      {threatLevel && (
        <span className="text-[0.65rem] uppercase tracking-wide text-slate-300/80">
          • {threatLevel}
        </span>
      )}
    </span>
  );
}

