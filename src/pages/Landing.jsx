import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

export default function Landing() {
  const navigate = useNavigate();
  const [scroll, setScroll] = useState(0);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);
  const [typed, setTyped] = useState("");
  const [cursorOn, setCursorOn] = useState(true);
  const [counters, setCounters] = useState({ p: 0, t: 0, a: 0 });
  const [activeNav, setActiveNav] = useState(0);
  const scrollRef = useRef(null);
  const ticking = useRef(false);
  const fullText = "SYSTEM ONLINE. THREAT DETECTION ACTIVE.";
  const VH = typeof window !== "undefined" ? window.innerHeight : 900;

  useEffect(() => {
    setTimeout(() => setLoaded(true), 200);
    let i = 0;
    const tw = setInterval(() => {
      if (i < fullText.length) { setTyped(fullText.slice(0, i + 1)); i++; }
      else clearInterval(tw);
    }, 45);
    const cb = setInterval(() => setCursorOn(v => !v), 530);
    const dur = 2800, start = Date.now();
    const cc = setInterval(() => {
      const p2 = Math.min((Date.now() - start) / dur, 1);
      const e = 1 - Math.pow(1 - p2, 4);
      setCounters({ p: Math.floor(e * 2847293), t: Math.floor(e * 14829), a: Math.floor(e * 98) });
      if (p2 >= 1) clearInterval(cc);
    }, 16);
    const onMouse = (e) => setMouse({ x: (e.clientX / window.innerWidth - 0.5) * 2, y: (e.clientY / window.innerHeight - 0.5) * 2 });
    const el = scrollRef.current;
    const onScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(() => { if (scrollRef.current) setScroll(scrollRef.current.scrollTop); ticking.current = false; });
        ticking.current = true;
      }
    };
    window.addEventListener("mousemove", onMouse);
    el?.addEventListener("scroll", onScroll, { passive: true });
    return () => { clearInterval(tw); clearInterval(cb); clearInterval(cc); window.removeEventListener("mousemove", onMouse); el?.removeEventListener("scroll", onScroll); };
  }, []);

  useEffect(() => {
    if (scroll < VH * 0.8) setActiveNav(0);
    else if (scroll < VH * 2.2) setActiveNav(1);
    else if (scroll < VH * 3.4) setActiveNav(2);
    else if (scroll < VH * 4.4) setActiveNav(3);
    else setActiveNav(4);
  }, [scroll, VH]);

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  const rng = (s, e) => easeOut(clamp((scroll - s) / (e - s), 0, 1));
  const window_op = (iS, iE, oS, oE) => Math.min(easeOut(clamp((scroll - iS) / (iE - iS), 0, 1)), easeOut(clamp(1 - (scroll - oS) / (oE - oS), 0, 1)));

  const hero_fade = easeOut(clamp(1 - scroll / (VH * 0.75), 0, 1));
  const s2 = window_op(VH * 0.7, VH * 1.3, VH * 2.0, VH * 2.5);
  const s2_stagger = [0, 1, 2, 3].map(i => window_op(VH * (0.7 + i * 0.14), VH * (1.4 + i * 0.14), VH * 2.0, VH * 2.5));
  const s3 = window_op(VH * 2.2, VH * 2.8, VH * 3.4, VH * 3.9);
  const s3_stagger = [0, 1, 2, 3].map(i => window_op(VH * (2.2 + i * 0.12), VH * (2.8 + i * 0.12), VH * 3.4, VH * 3.9));
  const s4 = window_op(VH * 3.5, VH * 4.1, VH * 4.8, VH * 5.2);
  const s4_stagger = [0, 1, 2].map(i => window_op(VH * (3.5 + i * 0.15), VH * (4.1 + i * 0.15), VH * 4.8, VH * 5.2));
  const s5 = rng(VH * 4.8, VH * 5.4);

  const p = clamp(scroll / (VH * 5.5), 0, 1);
  const bgDarken = clamp(0.25 + p * 0.45, 0.25, 0.75);
  const splineY = scroll * 0.06;

  // TRON COLOR PALETTE
  const T = {
    bg: "#000a0f",
    bgDeep: "#00050a",
    cyan: "#00f0ff",
    cyanDim: "#00c8d4",
    cyanGlow: "rgba(0,240,255,0.15)",
    cyanBorder: "rgba(0,240,255,0.2)",
    cyanBorderBright: "rgba(0,240,255,0.5)",
    orange: "#ff6600",
    orangeDim: "#cc4400",
    white: "#e8f4f8",
    dimText: "#4a7a8a",
    mutedText: "#2a4a5a",
    gridLine: "rgba(0,240,255,0.06)",
    cardBg: "rgba(0,20,30,0.7)",
    cardBorder: "rgba(0,240,255,0.12)",
  };

  const attacks = [
    { name: "DoS", full: "Denial of Service", color: T.cyan, icon: "◈", desc: "Flood attacks overwhelming server capacity with synthetic traffic bursts.", rate: 99.5 },
    { name: "Probe", full: "Port Scanning", color: "#00ff88", icon: "◉", desc: "Silent reconnaissance mapping network topology for vulnerability vectors.", rate: 97.2 },
    { name: "R2L", full: "Remote to Local", color: T.orange, icon: "◍", desc: "Credential exploitation granting remote operators unauthorized local access.", rate: 93.8 },
    { name: "U2R", full: "User to Root", color: "#ff0055", icon: "◎", desc: "Privilege escalation to full system root — the highest severity threat class.", rate: 89.4 },
  ];

  const steps = [
    { n: "01", title: "CAPTURE", desc: "Raw packets intercepted via deep packet inspection on live network stream", icon: "◈", color: T.cyan },
    { n: "02", title: "EXTRACT", desc: "41 statistical features per flow: bytes, flags, error rates, host patterns", icon: "◉", color: "#00ff88" },
    { n: "03", title: "CLASSIFY", desc: "Random Forest ensemble classifies flow against 5 threat categories in 4ms", icon: "◍", color: T.orange },
    { n: "04", title: "RESPOND", desc: "Instant dispatch to SOC dashboard, Slack, email or auto-firewall rule", icon: "◎", color: "#ff0055" },
  ];

  const scrollTo = (pos) => scrollRef.current?.scrollTo({ top: pos, behavior: "smooth" });

  return (
    <div ref={scrollRef} style={{ width: "100vw", height: "100vh", overflowY: "scroll", overflowX: "hidden", background: T.bgDeep }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 2px; }
        ::-webkit-scrollbar-track { background: ${T.bgDeep}; }
        ::-webkit-scrollbar-thumb { background: rgba(0,240,255,0.3); border-radius: 1px; }

        /* ── TRON GLOW KEYFRAMES ── */
        @keyframes tron-pulse {
          0%, 100% { box-shadow: 0 0 8px ${T.cyan}, 0 0 20px rgba(0,240,255,0.3); }
          50%       { box-shadow: 0 0 20px ${T.cyan}, 0 0 50px rgba(0,240,255,0.5), 0 0 80px rgba(0,240,255,0.2); }
        }
        @keyframes tron-text-glow {
          0%, 100% { text-shadow: 0 0 10px ${T.cyan}, 0 0 20px rgba(0,240,255,0.5); }
          50%       { text-shadow: 0 0 20px ${T.cyan}, 0 0 40px ${T.cyan}, 0 0 80px rgba(0,240,255,0.4); }
        }
        @keyframes grid-move {
          from { background-position: 0 0; }
          to   { background-position: 76px 76px; }
        }
        @keyframes scan-tron {
          0%   { top: -1px; opacity: 0; }
          3%   { opacity: 1; }
          97%  { opacity: 0.8; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes circuit-flow {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes particle-tron {
          0%   { transform: translateY(100vh) scale(0); opacity: 0; }
          5%   { opacity: 1; }
          90%  { opacity: 0.4; }
          100% { transform: translateY(-10vh) scale(0.5); opacity: 0; }
        }
        @keyframes border-run {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float-tron {
          0%, 100% { transform: translateY(0px); filter: drop-shadow(0 0 8px ${T.cyan}); }
          50%       { transform: translateY(-10px); filter: drop-shadow(0 0 20px ${T.cyan}); }
        }
        @keyframes data-stream {
          0%, 93%, 100% { opacity: 1; }
          95%, 98% { opacity: 0.2; }
          96% { opacity: 0.8; }
        }
        @keyframes rotate-slow {
          to { transform: rotate(360deg); }
        }
        @keyframes hexagon-spin {
          to { transform: rotate(360deg) scale(1.05); }
        }
        @keyframes counter-tron {
          0%, 100% { filter: drop-shadow(0 0 10px currentColor); }
          50%       { filter: drop-shadow(0 0 30px currentColor) drop-shadow(0 0 60px currentColor); }
        }
        @keyframes line-extend {
          from { width: 0; }
          to   { width: 100%; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── TRON BUTTON STYLES ── */
        .tron-btn-primary {
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
          clip-path: polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%);
        }
        .tron-btn-primary::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(0,240,255,0.3), transparent);
          transition: left 0.5s ease;
          transform: skewX(-20deg);
        }
        .tron-btn-primary:hover::before { left: 150%; }
        .tron-btn-primary:hover {
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 0 30px ${T.cyan}, 0 0 60px rgba(0,240,255,0.3), 0 10px 30px rgba(0,0,0,0.6) !important;
        }

        .tron-btn-ghost {
          position: relative;
          overflow: hidden;
          transition: all 0.4s ease;
          clip-path: polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%);
        }
        .tron-btn-ghost:hover {
          border-color: ${T.cyanBorderBright} !important;
          color: ${T.cyan} !important;
          background: rgba(0,240,255,0.06) !important;
          transform: translateY(-3px);
          box-shadow: 0 0 20px rgba(0,240,255,0.15) !important;
        }

        .tron-card {
          transition: all 0.5s cubic-bezier(0.16,1,0.3,1);
          transform-style: preserve-3d;
        }
        .tron-card:hover {
          transform: translateY(-10px) scale(1.02);
        }

        .nav-tron {
          transition: all 0.3s ease;
          clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
        }
        .nav-tron:hover {
          background: rgba(0,240,255,0.08) !important;
          color: ${T.cyan} !important;
        }

        .tag-tron {
          transition: all 0.3s ease;
          cursor: default;
        }
        .tag-tron:hover {
          border-color: rgba(0,240,255,0.3) !important;
          color: rgba(0,240,255,0.7) !important;
          background: rgba(0,240,255,0.05) !important;
        }
      `}</style>

      {/* ══════════════════════════════════════
          LAYER 0 — SPLINE (parallax + darkened)
      ══════════════════════════════════════ */}
      <div style={{
        position: "fixed", inset: "-10%",
        width: "120%", height: "120%",
        zIndex: 0,
        transform: `translateY(${splineY}px)`,
        willChange: "transform",
        filter: "brightness(0.75) saturate(0.5) contrast(1.1)",
      }}
        dangerouslySetInnerHTML={{ __html: `<spline-viewer url="https://prod.spline.design/dzwQu4NJivDSJ6BZ/scene.splinecode" style="width:100%;height:100%;display:block;transform:scale(1.4);transform-origin:center 38%;"></spline-viewer>` }}
      />

      {/* ══════════════════════════════════════
          LAYER 1 — TRON ATMOSPHERE
      ══════════════════════════════════════ */}

      {/* Deep dark overlay */}
      <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", background: `rgba(0,5,10,${bgDarken})`, transition: "background 0.2s linear" }} />

      {/* Tron blue tint overlay */}
      <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",  }} />

      {/* Bottom dark gradient */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: "40vh", zIndex: 1, pointerEvents: "none", background: "linear-gradient(to top, rgba(0,5,10,0.98), transparent)" }} />

      {/* TRON GRID — animated moving */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none",
        backgroundImage: `linear-gradient(${T.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${T.gridLine} 1px, transparent 1px)`,
        backgroundSize: "76px 76px",
        animation: "grid-move 8s linear infinite",
        opacity: clamp(0.3 + p * 0.5, 0.3, 0.8),
        transition: "opacity 0.5s ease",
      }} />

      {/* Grid fade mask */}
      <div style={{ position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none", background: "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, rgba(0,5,10,0.35) 100%)" }} />

      {/* Horizontal accent lines */}
      <div style={{ position: "fixed", top: "35%", left: 0, right: 0, height: "1px", zIndex: 2, pointerEvents: "none", background: `linear-gradient(90deg, transparent 0%, ${T.cyanBorder} 20%, rgba(0,240,255,0.4) 50%, ${T.cyanBorder} 80%, transparent 100%)`, opacity: clamp(hero_fade * 0.6, 0, 0.6) }} />
      <div style={{ position: "fixed", bottom: "30%", left: 0, right: 0, height: "1px", zIndex: 2, pointerEvents: "none", background: `linear-gradient(90deg, transparent 0%, ${T.cyanBorder} 20%, rgba(0,240,255,0.3) 50%, ${T.cyanBorder} 80%, transparent 100%)`, opacity: 0.3 }} />

      {/* Scan line */}
      <div style={{ position: "fixed", left: 0, right: 0, height: "2px", zIndex: 3, pointerEvents: "none", background: `linear-gradient(90deg, transparent 0%, rgba(0,240,255,0.1) 20%, rgba(0,240,255,0.6) 50%, rgba(0,240,255,0.1) 80%, transparent 100%)`, boxShadow: `0 0 10px ${T.cyan}`, animation: "scan-tron 10s ease-in-out infinite" }} />

      {/* Corner HUD decorations */}
      {[
        { style: { top: "72px", left: "32px" }, paths: ["M0 24 L0 0 L24 0", "M4 18 L4 4 L18 4"] },
        { style: { top: "72px", right: "32px" }, paths: ["M36 24 L36 0 L12 0", "M32 18 L32 4 L18 4"] },
        { style: { bottom: "32px", left: "32px" }, paths: ["M0 12 L0 36 L24 36", "M4 18 L4 32 L18 32"] },
        { style: { bottom: "32px", right: "32px" }, paths: ["M36 12 L36 36 L12 36", "M32 18 L32 32 L18 32"] },
      ].map((corner, i) => (
        <div key={i} style={{ position: "fixed", ...corner.style, zIndex: 5, pointerEvents: "none" }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d={corner.paths[0]} stroke={T.cyan} strokeWidth="1.5" opacity="0.5" />
            <path d={corner.paths[1]} stroke={T.cyan} strokeWidth="0.75" opacity="0.25" />
          </svg>
        </div>
      ))}

      {/* Side labels */}
      <div style={{ position: "fixed", left: "12px", top: "50%", transform: "translateY(-50%) rotate(-90deg)", zIndex: 5, pointerEvents: "none", fontFamily: "'Share Tech Mono', monospace", fontSize: "7px", color: "rgba(0,240,255,0.2)", letterSpacing: "4px", whiteSpace: "nowrap" }}>
        NIDS · REAL-TIME · NETWORK · MONITORING · ML · POWERED · v2.0
      </div>
      <div style={{ position: "fixed", right: "12px", top: "50%", transform: "translateY(-50%) rotate(90deg)", zIndex: 5, pointerEvents: "none", fontFamily: "'Share Tech Mono', monospace", fontSize: "7px", color: "rgba(0,240,255,0.15)", letterSpacing: "4px", whiteSpace: "nowrap" }}>
        DoS · PROBE · R2L · U2R · RANDOM · FOREST · NSL-KDD · 98%
      </div>

      {/* Floating particles */}
      <div style={{ position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none", overflow: "hidden" }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${3 + i * 4.8}%`,
            bottom: `${(i * 11) % 25}%`,
            width: `${1 + (i % 3)}px`,
            height: `${1 + (i % 3)}px`,
            borderRadius: "50%",
            background: i % 4 === 0 ? T.cyan : i % 4 === 1 ? "#00ff88" : i % 4 === 2 ? T.orange : "#ff0055",
            boxShadow: `0 0 6px currentColor`,
            animation: `particle-tron ${10 + (i % 5) * 2}s ${i * 0.6}s linear infinite`,
          }} />
        ))}
      </div>

      {/* ══════════════════════════════════════
          STICKY NAV — TRON STYLE
      ══════════════════════════════════════ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 48px",
        backdropFilter: scroll > 30 ? "blur(24px)" : "none",
        background: scroll > 30 ? "rgba(0,8,15,0.88)" : "transparent",
        borderBottom: scroll > 30 ? `1px solid ${T.cyanBorder}` : "none",
        transition: "all 0.5s ease",
        opacity: loaded ? 1 : 0,
        transform: loaded ? "translateY(0)" : "translateY(-20px)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }} onClick={() => scrollTo(0)}>
          <div style={{ width: "36px", height: "36px", background: "linear-gradient(135deg, rgba(0,240,255,0.15), rgba(0,100,150,0.3))", border: `1px solid ${T.cyanBorderBright}`, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", animation: "tron-pulse 3s ease-in-out infinite" }}>🛡️</div>
          <div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "14px", fontWeight: "900", color: T.cyan, letterSpacing: "3px", animation: "tron-text-glow 4s ease-in-out infinite" }}>NIDS</div>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "7px", color: "rgba(0,240,255,0.4)", letterSpacing: "2px" }}>MONITOR v2.0</div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ display: "flex", gap: "3px", background: "rgba(0,240,255,0.03)", border: `1px solid ${T.cyanBorder}`, borderRadius: "4px", padding: "4px" }}>
          {[["HERO", 0], ["THREATS", VH * 1.0], ["PIPELINE", VH * 2.3], ["STATS", VH * 3.6], ["DEPLOY", VH * 4.9]].map(([label, pos], i) => (
            <button key={label}
              className="nav-tron"
              onClick={() => { scrollTo(pos); setActiveNav(i); }}
              style={{
                background: activeNav === i ? "rgba(0,240,255,0.1)" : "transparent",
                border: activeNav === i ? `1px solid ${T.cyanBorderBright}` : "1px solid transparent",
                padding: "7px 18px",
                fontSize: "10px",
                fontFamily: "'Orbitron', monospace",
                color: activeNav === i ? T.cyan : "#2a5060",
                cursor: "pointer",
                fontWeight: "700",
                letterSpacing: "1px",
                transition: "all 0.3s ease",
              }}
            >{label}</button>
          ))}
        </div>

        {/* Right */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", background: "rgba(0,240,255,0.05)", border: `1px solid ${T.cyanBorder}`, borderRadius: "3px", padding: "7px 14px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: T.cyan, boxShadow: `0 0 8px ${T.cyan}`, animation: "tron-pulse 2s ease-in-out infinite" }} />
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "9px", fontWeight: "700", color: T.cyan, letterSpacing: "1.5px" }}>ONLINE</span>
          </div>
          <button onClick={() => navigate("/dashboard")}
            className="tron-btn-primary"
            style={{ background: "linear-gradient(135deg, rgba(0,240,255,0.15), rgba(0,150,200,0.2))", border: `1px solid ${T.cyanBorderBright}`, padding: "9px 24px", fontSize: "11px", fontFamily: "'Orbitron', monospace", fontWeight: "700", color: T.cyan, cursor: "pointer", letterSpacing: "2px", boxShadow: `0 0 15px rgba(0,240,255,0.25)` }}
          >ENTER ›</button>
        </div>
      </nav>

      {/* ══════════════════════════════════════
          SCROLLABLE BODY
      ══════════════════════════════════════ */}
      <div style={{ height: `${VH * 6}px`, position: "relative", zIndex: 20 }}>

        {/* ─── SECTION 1: HERO ─── */}
        <div style={{
          position: "sticky", top: 0, height: "100vh",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
          textAlign: "center", padding: "0 24px 80px",
          pointerEvents: hero_fade < 0.05 ? "none" : "auto",
        }}>
          <div style={{ opacity: hero_fade, transform: `translateY(${(1 - hero_fade) * -30}px)`, willChange: "opacity, transform" }}>

            {/* Eyebrow — Tron monospace */}
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: T.cyan, letterSpacing: "4px", marginBottom: "20px", opacity: loaded ? 0.7 : 0, transform: loaded ? "translateY(0)" : "translateY(12px)", transition: "all 1s ease 0.5s", animation: "data-stream 8s ease-in-out infinite" }}>
              {typed}<span style={{ opacity: cursorOn ? 1 : 0 }}>█</span>
            </div>

            {/* TITLE — Orbitron = pure Tron */}
            <h1 style={{
              fontFamily: "'Orbitron', monospace",
              fontWeight: "900",
              fontSize: "clamp(36px, 7.5vw, 96px)",
              lineHeight: "1.0",
              marginBottom: "18px",
              letterSpacing: "-1px",
              opacity: loaded ? 1 : 0,
              transform: loaded
                ? `translate(${mouse.x * 8}px, ${mouse.y * 4}px)`
                : "translateY(24px)",
              transition: loaded ? "transform 0.1s linear, opacity 1s ease 0.3s" : "opacity 1s ease 0.3s",
              userSelect: "none",
            }}>
              <span style={{ color: T.white, display: "block", marginBottom: "4px" }}>NETWORK</span>
              <span style={{
                display: "block",
                background: `linear-gradient(90deg, ${T.cyan} 0%, #00fff7 30%, rgba(0,240,255,0.6) 60%, ${T.cyan} 100%)`,
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "circuit-flow 4s linear infinite",
                textShadow: "none",
                filter: `drop-shadow(0 0 20px ${T.cyan})`,
                marginBottom: "4px",
              }}>INTRUSION</span>
              <span style={{ display: "block", color: "rgba(0,240,255,0.35)", fontSize: "0.38em", letterSpacing: "12px", fontWeight: "400" }}>DETECTION SYSTEM</span>
            </h1>

            {/* Tron divider line */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "center", marginBottom: "20px", opacity: loaded ? 0.6 : 0, transition: "opacity 1s ease 1s" }}>
              <div style={{ height: "1px", width: "60px", background: `linear-gradient(90deg, transparent, ${T.cyan})` }} />
              <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: T.cyan, boxShadow: `0 0 8px ${T.cyan}` }} />
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "9px", color: "rgba(0,240,255,0.5)", letterSpacing: "3px" }}>ML · v2.0 · NSL-KDD</div>
              <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: T.cyan, boxShadow: `0 0 8px ${T.cyan}` }} />
              <div style={{ height: "1px", width: "60px", background: `linear-gradient(90deg, ${T.cyan}, transparent)` }} />
            </div>

            {/* Subtitle */}
            <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "clamp(14px, 1.5vw, 17px)", color: "#4a7a8a", maxWidth: "460px", lineHeight: "1.8", marginBottom: "36px", margin: "0 auto 36px", fontWeight: "400", opacity: loaded ? 1 : 0, transition: "all 1s ease 0.8s" }}>
              AI-powered threat detection across{" "}
              <span style={{ color: "rgba(0,240,255,0.7)", fontWeight: "700" }}>41 network features</span>.
              {" "}Classifies DoS, Probe, R2L and U2R with{" "}
              <span style={{ color: T.cyan, fontWeight: "700" }}>98% accuracy</span>{" "}in{" "}
              <span style={{ color: T.cyan, fontWeight: "700" }}>4ms</span>.
            </p>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", marginBottom: "44px", opacity: loaded ? 1 : 0, transition: "all 1s ease 1s" }}>
              <button onClick={() => navigate("/dashboard")} className="tron-btn-primary"
                style={{ background: "linear-gradient(135deg, rgba(0,240,255,0.18), rgba(0,120,180,0.25))", border: `1px solid ${T.cyanBorderBright}`, padding: "15px 50px", fontSize: "13px", fontFamily: "'Orbitron', monospace", fontWeight: "700", color: T.cyan, cursor: "pointer", letterSpacing: "2px", boxShadow: `0 0 25px rgba(0,240,255,0.3), 0 15px 40px rgba(0,0,0,0.5)`, animation: "tron-pulse 3s ease-in-out infinite" }}
              >⚡ ENTER SYSTEM</button>

              <button onClick={() => scrollTo(VH * 1.0)} className="tron-btn-ghost"
                style={{ background: "rgba(0,240,255,0.03)", border: `1px solid ${T.cyanBorder}`, padding: "15px 36px", fontSize: "13px", fontFamily: "'Orbitron', monospace", fontWeight: "700", color: "#2a5060", cursor: "pointer", letterSpacing: "1.5px" }}
              >EXPLORE ↓</button>

              <button className="tron-btn-ghost"
                style={{ background: "rgba(255,102,0,0.05)", border: "1px solid rgba(255,102,0,0.25)", padding: "15px 32px", fontSize: "13px", fontFamily: "'Orbitron', monospace", fontWeight: "700", color: "rgba(255,102,0,0.7)", cursor: "pointer", letterSpacing: "1.5px", transition: "all 0.4s ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,102,0,0.1)"; e.currentTarget.style.borderColor = "rgba(255,102,0,0.5)"; e.currentTarget.style.color = T.orange; e.currentTarget.style.boxShadow = "0 0 20px rgba(255,102,0,0.2)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,102,0,0.05)"; e.currentTarget.style.borderColor = "rgba(255,102,0,0.25)"; e.currentTarget.style.color = "rgba(255,102,0,0.7)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
              >▶ DEMO</button>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: "32px", flexWrap: "wrap", justifyContent: "center", opacity: loaded ? 0.8 : 0, transition: "opacity 1.3s ease 1.2s" }}>
              {[["98%", "ACCURACY", T.cyan], ["4MS", "LATENCY", "#00ff88"], ["125K", "SAMPLES", T.orange], ["41", "FEATURES", "#ff0055"]].map(([v, l, c]) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "18px", fontWeight: "900", color: c, lineHeight: 1, filter: `drop-shadow(0 0 8px ${c})` }}>{v}</div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "8px", color: T.mutedText, letterSpacing: "2px", marginTop: "4px" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll indicator */}
          <div style={{ position: "absolute", bottom: "24px", left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", opacity: clamp(1 - scroll / 150, 0, 0.5), pointerEvents: "none" }}>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "7px", color: T.mutedText, letterSpacing: "3px" }}>SCROLL</div>
            <div style={{ width: "20px", height: "34px", border: `1px solid ${T.cyanBorder}`, display: "flex", justifyContent: "center", paddingTop: "4px" }}>
              <div style={{ width: "2px", height: "7px", background: T.cyan, animation: "scan-tron 1.8s ease-in-out infinite", boxShadow: `0 0 6px ${T.cyan}` }} />
            </div>
          </div>
        </div>

        {/* ─── SECTION 2: ATTACK VECTORS ─── */}
        <div style={{ height: `${VH * 1.5}px`, position: "relative" }}>
          <div style={{ position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "80px 48px 40px", opacity: s2, transform: `translateY(${lerp(50, 0, s2)}px)`, pointerEvents: s2 < 0.05 ? "none" : "auto" }}>

            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "9px", color: "rgba(255,0,85,0.6)", letterSpacing: "4px", marginBottom: "10px", animation: "data-stream 6s ease-in-out infinite" }}>// THREAT.CLASSIFICATION.MATRIX</div>
              <h2 style={{ fontFamily: "'Orbitron', monospace", fontWeight: "900", fontSize: "clamp(28px, 5vw, 58px)", color: T.white, marginBottom: "8px", letterSpacing: "2px" }}>
                FOUR ATTACK <span style={{ color: T.cyan, filter: `drop-shadow(0 0 15px ${T.cyan})` }}>VECTORS</span>
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "center", marginBottom: "8px" }}>
                <div style={{ height: "1px", width: "40px", background: `linear-gradient(90deg, transparent, ${T.cyanBorder})` }} />
                <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "14px", color: T.dimText, fontWeight: "500" }}>One ML engine. Four threat classes. Zero false negatives.</p>
                <div style={{ height: "1px", width: "40px", background: `linear-gradient(90deg, ${T.cyanBorder}, transparent)` }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", maxWidth: "980px", width: "100%", marginTop: "28px" }}>
              {attacks.map((a, i) => (
                <div key={a.name}
                  className="tron-card"
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-12px) scale(1.03)"; e.currentTarget.style.background = `rgba(0,20,30,0.9)`; e.currentTarget.style.borderColor = a.color; e.currentTarget.style.boxShadow = `0 0 30px ${a.color}33, 0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 ${a.color}44`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.background = T.cardBg; e.currentTarget.style.borderColor = `${a.color}22`; e.currentTarget.style.boxShadow = "none"; }}
                  style={{ background: T.cardBg, border: `1px solid ${a.color}22`, padding: "22px 16px", cursor: "pointer", backdropFilter: "blur(20px)", textAlign: "left", opacity: s2_stagger[i], transform: `translateY(${lerp(40, 0, s2_stagger[i])}px)` }}
                >
                  {/* Top row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "22px", fontWeight: "900", color: a.color, filter: `drop-shadow(0 0 8px ${a.color})` }}>{a.name}</div>
                    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "18px", color: a.color, opacity: 0.6 }}>{a.icon}</div>
                  </div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "7px", color: `${a.color}55`, letterSpacing: "2px", marginBottom: "10px", textTransform: "uppercase" }}>{a.full}</div>
                  <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "12px", color: T.dimText, lineHeight: "1.6", marginBottom: "16px", fontWeight: "500" }}>{a.desc}</p>

                  {/* Progress bar */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "7px", color: T.mutedText, letterSpacing: "1px" }}>DETECTION.RATE</span>
                      <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "11px", fontWeight: "700", color: a.color }}>{a.rate}%</span>
                    </div>
                    <div style={{ height: "2px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: s2_stagger[i] > 0.5 ? `${a.rate}%` : "0%", background: `linear-gradient(90deg, ${a.color}44, ${a.color})`, boxShadow: `0 0 8px ${a.color}`, transition: "width 1.4s cubic-bezier(0.16,1,0.3,1)" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── SECTION 3: PIPELINE ─── */}
        <div style={{ height: `${VH * 1.5}px`, position: "relative" }}>
          <div style={{ position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "80px 48px 40px", opacity: s3, transform: `translateY(${lerp(50, 0, s3)}px)`, pointerEvents: s3 < 0.05 ? "none" : "auto" }}>

            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "9px", color: "rgba(0,240,255,0.4)", letterSpacing: "4px", marginBottom: "10px" }}>// DETECTION.PIPELINE.v2</div>
              <h2 style={{ fontFamily: "'Orbitron', monospace", fontWeight: "900", fontSize: "clamp(28px, 5vw, 58px)", color: T.white, marginBottom: "8px", letterSpacing: "2px" }}>
                CLASSIFY IN <span style={{ color: T.cyan, filter: `drop-shadow(0 0 15px ${T.cyan})` }}>4 MILLISECONDS</span>
              </h2>
              <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "14px", color: T.dimText, fontWeight: "500" }}>Raw network packet to threat classification — in real time.</p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0", maxWidth: "940px", width: "100%", marginTop: "36px" }}>
              {steps.map((step, i) => (
                <div key={step.n} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <div
                    className="tron-card"
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-8px) scale(1.04)"; e.currentTarget.style.borderColor = step.color; e.currentTarget.style.boxShadow = `0 0 25px ${step.color}33`; e.currentTarget.style.background = "rgba(0,20,30,0.9)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.borderColor = `${step.color}22`; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = T.cardBg; }}
                    style={{ flex: 1, background: T.cardBg, border: `1px solid ${step.color}22`, padding: "28px 16px", backdropFilter: "blur(20px)", cursor: "default", textAlign: "center", opacity: s3_stagger[i], transform: `translateY(${lerp(35, 0, s3_stagger[i])}px)` }}
                  >
                    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "8px", color: `${step.color}44`, letterSpacing: "2px", marginBottom: "10px" }}>{step.n}</div>
                    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "24px", color: step.color, marginBottom: "10px", filter: `drop-shadow(0 0 8px ${step.color})` }}>{step.icon}</div>
                    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "12px", fontWeight: "700", color: step.color, marginBottom: "8px", letterSpacing: "1.5px" }}>{step.title}</div>
                    <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "11px", color: T.dimText, lineHeight: "1.65", fontWeight: "500" }}>{step.desc}</p>
                  </div>
                  {i < 3 && (
                    <div style={{ width: "28px", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", opacity: s3_stagger[i], flexShrink: 0 }}>
                      <div style={{ width: "20px", height: "1px", background: `rgba(0,240,255,0.2)` }} />
                      <span style={{ color: "rgba(0,240,255,0.3)", fontSize: "12px", fontFamily: "'Share Tech Mono'" }}>›</span>
                      <div style={{ width: "20px", height: "1px", background: "rgba(0,240,255,0.2)" }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Tags */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center", marginTop: "32px", opacity: s3 }}>
              {["Python", "FastAPI", "RandomForest", "scikit-learn", "React 18", "NSL-KDD", "Docker", "Vite 5"].map((tag) => (
                <span key={tag} className="tag-tron"
                  style={{ background: "rgba(0,240,255,0.03)", border: `1px solid ${T.cyanBorder}`, padding: "4px 12px", fontSize: "9px", fontFamily: "'Share Tech Mono', monospace", color: T.mutedText, letterSpacing: "1px" }}
                >{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ─── SECTION 4: LIVE STATS ─── */}
        <div style={{ height: `${VH * 1.5}px`, position: "relative" }}>
          <div style={{ position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "80px 48px 40px", opacity: s4, transform: `translateY(${lerp(50, 0, s4)}px)`, pointerEvents: s4 < 0.05 ? "none" : "auto" }}>

            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "9px", color: "rgba(0,255,136,0.4)", letterSpacing: "4px", marginBottom: "10px" }}>// LIVE.SYSTEM.METRICS</div>
              <h2 style={{ fontFamily: "'Orbitron', monospace", fontWeight: "900", fontSize: "clamp(28px, 5vw, 58px)", color: T.white, marginBottom: "8px", letterSpacing: "2px" }}>
                METRICS THAT <span style={{ color: "#00ff88", filter: "drop-shadow(0 0 15px #00ff88)" }}>MATTER</span>
              </h2>
              <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "14px", color: T.dimText, fontWeight: "500" }}>Live performance data from the detection engine.</p>
            </div>

            {/* Big counters */}
            <div style={{ display: "flex", gap: "56px", flexWrap: "wrap", justifyContent: "center", marginTop: "48px", marginBottom: "48px" }}>
              {[
                { value: counters.p.toLocaleString(), sfx: "+", label: "PACKETS.ANALYZED", color: T.cyan, idx: 0 },
                { value: counters.t.toLocaleString(), sfx: "+", label: "THREATS.BLOCKED", color: "#ff0055", idx: 1 },
                { value: counters.a.toString(), sfx: "%", label: "DETECTION.ACCURACY", color: "#00ff88", idx: 2 },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center", opacity: s4_stagger[s.idx], transform: `translateY(${lerp(30, 0, s4_stagger[s.idx])}px)` }}>
                  {/* Tron bracket decoration */}
                  <div style={{ display: "flex", gap: "4px", alignItems: "baseline", justifyContent: "center" }}>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "20px", color: `${s.color}44` }}>[</span>
                    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "clamp(36px, 6.5vw, 76px)", fontWeight: "900", color: s.color, lineHeight: "1", letterSpacing: "-2px", animation: "counter-tron 4s ease-in-out infinite" }}>
                      {s.value}{s.sfx}
                    </div>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "20px", color: `${s.color}44` }}>]</span>
                  </div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "8px", color: T.mutedText, letterSpacing: "2px", marginTop: "6px" }}>{s.label}</div>
                  {/* Underline */}
                  <div style={{ height: "1px", background: `linear-gradient(90deg, transparent, ${s.color}66, transparent)`, marginTop: "8px" }} />
                </div>
              ))}
            </div>

            {/* Feature chips */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", maxWidth: "640px", opacity: s4 }}>
              {[["⚡", "4MS INFERENCE"], ["◈", "REAL-TIME STREAM"], ["◉", "MULTI-CLASS ML"], ["▶", "SOC DASHBOARD"], ["◍", "DOCKER READY"], ["◎", "REST API"]].map(([icon, label]) => (
                <div key={label}
                  style={{ display: "flex", alignItems: "center", gap: "7px", background: "rgba(0,240,255,0.03)", border: `1px solid ${T.cyanBorder}`, padding: "8px 16px", cursor: "default", transition: "all 0.35s ease" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.07)"; e.currentTarget.style.borderColor = T.cyanBorderBright; e.currentTarget.style.boxShadow = `0 0 15px rgba(0,240,255,0.1)`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.03)"; e.currentTarget.style.borderColor = T.cyanBorder; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", color: T.cyan }}>{icon}</span>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "9px", color: T.dimText, letterSpacing: "1px" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── SECTION 5: FINAL CTA ─── */}
        <div style={{ height: `${VH * 1.0}px`, position: "relative" }}>
          <div style={{ position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "80px 48px 40px", opacity: s5, transform: `translateY(${lerp(60, 0, s5)}px)`, pointerEvents: s5 < 0.05 ? "none" : "auto" }}>

            {/* Rotating rings */}
            <div style={{ position: "absolute", width: "520px", height: "520px", borderRadius: "50%", border: `1px solid ${T.cyanBorder}`, top: "50%", left: "50%", transform: "translate(-50%,-50%)", animation: "rotate-slow 25s linear infinite", pointerEvents: "none" }}>
              <div style={{ position: "absolute", top: "10%", left: "50%", width: "8px", height: "8px", borderRadius: "50%", background: T.cyan, boxShadow: `0 0 12px ${T.cyan}`, transform: "translateX(-50%)" }} />
            </div>
            <div style={{ position: "absolute", width: "720px", height: "720px", borderRadius: "50%", border: "1px solid rgba(0,240,255,0.05)", top: "50%", left: "50%", transform: "translate(-50%,-50%)", animation: "rotate-slow 40s linear infinite reverse", pointerEvents: "none" }}>
              <div style={{ position: "absolute", bottom: "12%", right: "12%", width: "5px", height: "5px", borderRadius: "50%", background: T.orange, boxShadow: `0 0 10px ${T.orange}` }} />
            </div>

            <div style={{ position: "relative", zIndex: 2 }}>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "9px", color: "rgba(0,240,255,0.35)", letterSpacing: "4px", marginBottom: "20px" }}>// INITIALIZE.DEPLOYMENT</div>

              <h2 style={{ fontFamily: "'Orbitron', monospace", fontWeight: "900", fontSize: "clamp(32px, 7vw, 84px)", lineHeight: "1.0", marginBottom: "20px", letterSpacing: "1px" }}>
                <span style={{ color: T.white, display: "block" }}>STOP WATCHING.</span>
                <span style={{
                  display: "block",
                  background: `linear-gradient(90deg, ${T.cyan}, #00fff7, rgba(0,240,255,0.5), ${T.cyan})`,
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  animation: "circuit-flow 3s linear infinite",
                  filter: `drop-shadow(0 0 20px ${T.cyan})`,
                }}>START PROTECTING.</span>
              </h2>

              {/* Tron divider */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px", justifyContent: "center", marginBottom: "24px" }}>
                <div style={{ height: "1px", flex: 1, maxWidth: "120px", background: `linear-gradient(90deg, transparent, ${T.cyanBorder})` }} />
                <div style={{ display: "flex", gap: "6px" }}>
                  {[T.cyan, "#00ff88", T.orange, "#ff0055"].map((c, i) => <div key={i} style={{ width: "4px", height: "4px", background: c, boxShadow: `0 0 6px ${c}` }} />)}
                </div>
                <div style={{ height: "1px", flex: 1, maxWidth: "120px", background: `linear-gradient(90deg, ${T.cyanBorder}, transparent)` }} />
              </div>

              <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "16px", color: T.dimText, marginBottom: "44px", maxWidth: "400px", lineHeight: "1.8", margin: "0 auto 44px" }}>
                Access the live SOC dashboard. Monitor your network. Neutralize threats in real time.
              </p>

              <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", justifyContent: "center", marginBottom: "48px" }}>
                <button onClick={() => navigate("/dashboard")} className="tron-btn-primary"
                  style={{ background: "linear-gradient(135deg, rgba(0,240,255,0.18), rgba(0,120,180,0.25))", border: `1px solid ${T.cyanBorderBright}`, padding: "17px 60px", fontSize: "14px", fontFamily: "'Orbitron', monospace", fontWeight: "700", color: T.cyan, cursor: "pointer", letterSpacing: "2px", boxShadow: `0 0 40px rgba(0,240,255,0.4), 0 20px 50px rgba(0,0,0,0.6)`, animation: "tron-pulse 2.5s ease-in-out infinite" }}
                >⚡ LAUNCH SYSTEM</button>

                <button onClick={() => scrollTo(0)} className="tron-btn-ghost"
                  style={{ background: "rgba(0,240,255,0.02)", border: `1px solid ${T.cyanBorder}`, padding: "17px 44px", fontSize: "14px", fontFamily: "'Orbitron', monospace", fontWeight: "700", color: T.dimText, cursor: "pointer", letterSpacing: "1.5px" }}
                >↑ REBOOT</button>
              </div>

              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center", opacity: 0.2 }}>
                {["Python 3.11", "FastAPI 0.104", "scikit-learn 1.3", "React 18", "Vite 5", "Docker"].map((t) => (
                  <span key={t} style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "8px", color: T.dimText, letterSpacing: "1px" }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
