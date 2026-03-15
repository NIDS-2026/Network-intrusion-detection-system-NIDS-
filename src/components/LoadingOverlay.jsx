export default function LoadingOverlay({ label = "Analyzing traffic…" }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-2xl z-10">
      <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-slate-900/90 border border-slate-700/80">
        <span className="relative flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
        </span>
        <span className="text-xs text-slate-200">{label}</span>
      </div>
    </div>
  );
}

