import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

const navItems = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/detection", label: "Live Detection", icon: "🛰️" },
  { to: "/logs", label: "Logs & History", icon: "📜" },
  { to: "/alerts", label: "Alerts", icon: "⚠️" },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col w-60 bg-slate-950/90 border-r border-slate-800/80 px-4 py-6 gap-8">
      <div className="flex items-center gap-2 px-2">
        <motion.div
          className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/60 flex items-center justify-center shadow-glow"
          initial={{ rotate: -10, scale: 0.9 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="h-5 w-5 rounded-full border border-emerald-400/70 shadow-glow" />
        </motion.div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Realtime
          </p>
          <p className="font-semibold text-emerald-400">NIDS Monitor</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 text-sm">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              [
                "flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors",
                isActive
                  ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-300 shadow-glow"
                  : "border-transparent text-slate-300 hover:bg-slate-900/80 hover:border-slate-700",
              ].join(" ")
            }
          >
            <span className="text-lg" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto text-xs text-slate-500 px-2">
        <p className="font-mono">
          API: <span className="text-emerald-400">http://localhost:8000</span>
        </p>
        <p className="mt-1">Status and threats update in real-time.</p>
      </div>
    </aside>
  );
}

