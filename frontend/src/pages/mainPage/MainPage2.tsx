import { Link } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BarChart2,
  Check,
  ChartPie,
  ArrowLeftRight,
  Target,
  Wallet,
  TrendingUp,
  Sparkles,
  Github,
  GraduationCap,
  Linkedin,
  Lock,
} from "lucide-react";
import { ROUTES } from "@/config/routes";
import slice1Video from "@/assets/slice1.mp4";
import dashboardImg from "@/assets/dashboard.png";
import Footer from "@/components/layout/footer";
import PublicHeader from "@/components/layout/PublicHeader";
import { gradientButtonClass, gradientButtonIconClass } from "@/components/ui/gradient-button";
import "@/styles/pages/main2.css";

// ══════════════════════════════════════════════════════════════
// Reveal hook — triggers CSS transition when element enters viewport
// ══════════════════════════════════════════════════════════════
function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
}

// ══════════════════════════════════════════════════════════════
// Feature data
// ══════════════════════════════════════════════════════════════
const FEATURES = [
  {
    num: "01",
    id: "analysis",
    icon: BarChart2,
    accent: "text-sky-400",
    glowColor: "rgba(56, 189, 248, 0.18)",
    gradient: "from-sky-500/10 to-cyan-500/10",
    iconBg: "bg-sky-500/10",
    border: "border-sky-500/20",
  },
  {
    num: "02",
    id: "accounts",
    icon: Wallet,
    accent: "text-emerald-400",
    glowColor: "rgba(52, 211, 153, 0.18)",
    gradient: "from-emerald-500/10 to-teal-500/10",
    iconBg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    num: "03",
    id: "transactions",
    icon: ArrowLeftRight,
    accent: "text-violet-400",
    glowColor: "rgba(167, 139, 250, 0.18)",
    gradient: "from-violet-500/10 to-purple-500/10",
    iconBg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
  {
    num: "04",
    id: "goals",
    icon: Target,
    accent: "text-amber-400",
    glowColor: "rgba(251, 191, 36, 0.18)",
    gradient: "from-amber-500/10 to-orange-500/10",
    iconBg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    num: "05",
    id: "budgets",
    icon: ChartPie,
    accent: "text-rose-400",
    glowColor: "rgba(251, 113, 133, 0.18)",
    gradient: "from-rose-500/10 to-pink-500/10",
    iconBg: "bg-rose-500/10",
    border: "border-rose-500/20",
  },
] as const;

const FEATURE_COUNT = FEATURES.length;

// ══════════════════════════════════════════════════════════════
// Zoom grid items — 3D fly-through section
// Center items have wider ranges (appear first, stay longest)
// Outer items have narrower ranges (appear later, briefer)
// ══════════════════════════════════════════════════════════════
const ZOOM_ITEMS: {
  id: string;
  labelKey: string | null;
  icon: (typeof BarChart2) | null;
  rs: number;
  re: number;
  gridRow: string;
  gridCol: string;
  isCenter?: boolean;
}[] = [
  // Top row
  { id: "z1", labelKey: "ticker1", icon: null, rs: 0.28, re: 0.60, gridRow: "1", gridCol: "1" },
  { id: "z2", labelKey: "ticker3", icon: null, rs: 0.15, re: 0.47, gridRow: "1", gridCol: "2" },
  { id: "z3", labelKey: "ticker5", icon: null, rs: 0.35, re: 0.67, gridRow: "1", gridCol: "3" },
  { id: "z4", labelKey: "ticker7", icon: null, rs: 0.22, re: 0.54, gridRow: "1", gridCol: "4" },
  // Middle sides
  { id: "z5", labelKey: "analysis.label", icon: BarChart2, rs: 0.20, re: 0.56, gridRow: "2", gridCol: "1" },
  { id: "z6", labelKey: "transactions.label", icon: ArrowLeftRight, rs: 0.30, re: 0.66, gridRow: "2", gridCol: "4" },
  { id: "z7", labelKey: "accounts.label", icon: Wallet, rs: 0.25, re: 0.61, gridRow: "3", gridCol: "1" },
  { id: "z8", labelKey: "goals.label", icon: Target, rs: 0.18, re: 0.54, gridRow: "3", gridCol: "4" },
  // Bottom row
  { id: "z9", labelKey: "ticker2", icon: null, rs: 0.32, re: 0.64, gridRow: "4", gridCol: "1" },
  { id: "z10", labelKey: "ticker4", icon: null, rs: 0.16, re: 0.48, gridRow: "4", gridCol: "2" },
  { id: "z11", labelKey: "ticker6", icon: null, rs: 0.38, re: 0.70, gridRow: "4", gridCol: "3" },
  { id: "z12", labelKey: "budgets.label", icon: ChartPie, rs: 0.24, re: 0.56, gridRow: "4", gridCol: "4" },
  // Center (2×2 span) — widest range, visible almost the entire scroll
  { id: "zcenter", labelKey: null, icon: null, rs: 0.05, re: 0.95, gridRow: "2 / span 2", gridCol: "2 / span 2", isCenter: true },
];

function computeZoomItem(progress: number, rs: number, re: number) {
  const mid = (rs + re) / 2;
  const half = (re - rs) / 2;
  if (half === 0) return { z: -1000, opacity: 0, blur: 8 };
  const t = (progress - mid) / half;
  const clamped = Math.max(-1.5, Math.min(1.5, t));
  const z = clamped * 800;
  const absT = Math.abs(clamped);
  const opacity = absT >= 1 ? 0 : Math.max(0, 1 - absT * 1.3);
  const blur = Math.min(8, absT * 6);
  return { z, opacity, blur };
}

// ══════════════════════════════════════════════════════════════
// Browser mockup frame
// ══════════════════════════════════════════════════════════════
function BrowserFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`m2-monitor ${className ?? ""}`}>
      <div className="m2-monitor-toolbar">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="m2-monitor-address">
          <Lock className="h-2.5 w-2.5 opacity-50" />
          <span>balio.app</span>
        </div>
      </div>
      <div className="m2-monitor-screen">{children}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Wave text — each word bounces continuously
// ══════════════════════════════════════════════════════════════
function WaveText({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={`m2-wave-text ${className ?? ""}`}>
      {words.map((word, wi) => (
        <span key={wi} style={{ animationDelay: `${wi * 0.12}s` }}>
          {word}
          {wi < words.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════
// Mini sidebar shared by all desktop screens
// ══════════════════════════════════════════════════════════════
function ScreenSidebar({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="m2-screen-sidebar">
      <div className="w-5 h-5 rounded bg-gradient-to-br from-sky-400 to-emerald-400 mb-2 shrink-0" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`m2-screen-sidebar-item ${i === activeIndex ? "active" : ""}`}
        />
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Desktop feature screens (rendered inside BrowserFrame)
// ══════════════════════════════════════════════════════════════
function FeatureScreen({ id }: { id: string }) {
  const sidebarIdx =
    id === "analysis" ? 0
    : id === "accounts" ? 1
    : id === "transactions" ? 2
    : id === "goals" ? 3
    : 4;

  if (id === "analysis")
    return (
      <div className="flex h-full">
        <ScreenSidebar activeIndex={sidebarIdx} />
        <div className="flex-1 bg-slate-50 p-3 overflow-hidden">
          <p className="text-[10px] font-black text-slate-800 mb-2">Analysis</p>
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {[
              { label: "Income", value: "€1,200", color: "text-emerald-600" },
              { label: "Expenses", value: "€680", color: "text-red-500" },
              { label: "Balance", value: "€520", color: "text-sky-600" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-lg p-1.5 border border-slate-100">
                <p className="text-[6px] text-slate-400">{kpi.label}</p>
                <p className={`text-[9px] font-black ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            <div className="col-span-3 bg-white rounded-lg p-2 border border-slate-100">
              <p className="text-[6px] text-slate-400 mb-1">Income vs Expenses</p>
              <div className="flex items-end gap-0.5 h-12">
                {[
                  { i: 72, e: 48 }, { i: 88, e: 62 },
                  { i: 68, e: 52 }, { i: 96, e: 58 },
                  { i: 80, e: 55 },
                ].map((b, idx) => (
                  <div key={idx} className="flex-1 flex items-end gap-px">
                    <div className="flex-1 rounded-t bg-sky-400" style={{ height: `${b.i}%` }} />
                    <div className="flex-1 rounded-t bg-emerald-400/70" style={{ height: `${b.e}%` }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-2 bg-white rounded-lg p-2 border border-slate-100 flex flex-col items-center justify-center">
              <p className="text-[6px] text-slate-400 mb-1">By category</p>
              <div className="w-10 h-10 rounded-full border-[5px] border-sky-400 border-t-violet-400 border-r-emerald-400" />
            </div>
          </div>
        </div>
      </div>
    );

  if (id === "accounts")
    return (
      <div className="flex h-full">
        <ScreenSidebar activeIndex={sidebarIdx} />
        <div className="flex-1 bg-slate-50 p-3 overflow-hidden">
          <p className="text-[10px] font-black text-slate-800 mb-2">Accounts</p>
          <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 mb-2">
            <p className="text-[7px] text-white/70">Net Worth</p>
            <p className="text-base font-black text-white leading-tight">€2,840.50</p>
            <div className="mt-1.5 flex gap-1.5">
              <div className="flex-1 rounded-lg bg-white/20 px-1.5 py-0.5">
                <p className="text-[6px] text-white/70">Assets</p>
                <p className="text-[9px] font-bold text-white">€3,340</p>
              </div>
              <div className="flex-1 rounded-lg bg-white/20 px-1.5 py-0.5">
                <p className="text-[6px] text-white/70">Liabilities</p>
                <p className="text-[9px] font-bold text-white">-€500</p>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            {[
              { name: "BBVA", type: "Bank", amt: "€1,800", bg: "bg-sky-100" },
              { name: "Cash", type: "Manual", amt: "€540", bg: "bg-emerald-100" },
              { name: "Savings", type: "Bank", amt: "€500", bg: "bg-amber-100" },
            ].map((a) => (
              <div key={a.name} className="flex items-center gap-2 rounded-lg bg-white p-1.5 border border-slate-100">
                <div className={`w-6 h-6 rounded-lg ${a.bg} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] font-bold text-slate-700 truncate">{a.name}</p>
                  <p className="text-[6px] text-slate-400">{a.type}</p>
                </div>
                <p className="text-[8px] font-black text-slate-700">{a.amt}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

  if (id === "transactions")
    return (
      <div className="flex h-full">
        <ScreenSidebar activeIndex={sidebarIdx} />
        <div className="flex-1 bg-slate-50 p-3 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-slate-800">Transactions</p>
            <div className="flex gap-0.5">
              {["All", "Income", "Expense"].map((f, i) => (
                <span key={f} className={`text-[6px] font-semibold px-1.5 py-0.5 rounded-full ${
                  i === 0 ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-400"
                }`}>{f}</span>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-100 divide-y divide-slate-50">
            {[
              { name: "Groceries", cat: "Food", amt: "-€42.30", bg: "bg-emerald-100", neg: true },
              { name: "Salary March", cat: "Salary", amt: "+€1,200", bg: "bg-sky-100", neg: false },
              { name: "Netflix", cat: "Leisure", amt: "-€15.99", bg: "bg-violet-100", neg: true },
              { name: "Gas", cat: "Transport", amt: "-€55.00", bg: "bg-amber-100", neg: true },
              { name: "Freelance", cat: "Extra", amt: "+€320", bg: "bg-cyan-100", neg: false },
            ].map((tx) => (
              <div key={tx.name} className="flex items-center gap-2 px-2 py-1.5">
                <div className={`w-5 h-5 rounded-lg ${tx.bg} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[7px] font-bold text-slate-700 truncate">{tx.name}</p>
                  <p className="text-[6px] text-slate-400">{tx.cat}</p>
                </div>
                <p className={`text-[7px] font-black shrink-0 ${tx.neg ? "text-slate-600" : "text-emerald-600"}`}>
                  {tx.amt}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

  if (id === "goals")
    return (
      <div className="flex h-full">
        <ScreenSidebar activeIndex={sidebarIdx} />
        <div className="flex-1 bg-slate-50 p-3 overflow-hidden">
          <p className="text-[10px] font-black text-slate-800 mb-2">Goals</p>
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {[
              { label: "Total Saved", value: "€5,610", accent: "text-emerald-600" },
              { label: "Active", value: "3", accent: "text-sky-600" },
              { label: "Completed", value: "2", accent: "text-amber-600" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-lg p-1.5 border border-slate-100 text-center">
                <p className="text-[6px] text-slate-400">{s.label}</p>
                <p className={`text-[9px] font-black ${s.accent}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            {[
              { name: "Japan Trip", pct: 68, color: "bg-amber-400", target: "€3,000" },
              { name: "Emergency Fund", pct: 45, color: "bg-sky-400", target: "€5,000" },
              { name: "New MacBook", pct: 88, color: "bg-emerald-400", target: "€1,500" },
            ].map((g) => (
              <div key={g.name} className="rounded-lg bg-white p-2 border border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[7px] font-bold text-slate-700">{g.name}</p>
                  <span className="text-[7px] font-black text-amber-500">{g.pct}%</span>
                </div>
                <div className="h-1 w-full rounded-full bg-slate-200">
                  <div className={`h-full rounded-full ${g.color}`} style={{ width: `${g.pct}%` }} />
                </div>
                <p className="text-[6px] text-slate-400 mt-0.5 text-right">{g.target}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

  // budgets
  return (
    <div className="flex h-full">
      <ScreenSidebar activeIndex={sidebarIdx} />
      <div className="flex-1 bg-slate-50 p-3 overflow-hidden">
        <p className="text-[10px] font-black text-slate-800 mb-2">Budgets</p>
        <div className="space-y-1.5">
          {[
            { name: "Food", spent: "€216", limit: "€300", pct: 72, color: "bg-sky-400" },
            { name: "Leisure", spent: "€176", limit: "€200", pct: 88, color: "bg-rose-400", over: true },
            { name: "Transport", spent: "€41", limit: "€100", pct: 41, color: "bg-emerald-400" },
            { name: "Housing", spent: "€165", limit: "€300", pct: 55, color: "bg-violet-400" },
          ].map((b) => (
            <div key={b.name} className="rounded-lg bg-white p-2 border border-slate-100">
              <div className="flex justify-between items-center mb-1">
                <p className="text-[7px] font-bold text-slate-700">{b.name}</p>
                <p className={`text-[7px] font-black ${b.over ? "text-rose-500" : "text-slate-500"}`}>
                  {b.spent} / {b.limit}
                </p>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-200">
                <div className={`h-full rounded-full ${b.color}`} style={{ width: `${b.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT — Sticky-slices architecture
//
// Each section is a full-screen sticky slice that covers the
// previous one as the user scrolls, creating curtain-like
// transitions. Sections with scroll-driven animations use an
// outer wrapper with extra height + inner sticky viewport.
//
// Slice order (z-index ascending):
//   1. Hero (sticky)
//   2. Zoom Grid (250vh, scroll-driven 3D)
//   3. Feature Showcase (500vh, scroll-driven steps)
//   4. About (sticky)
//   5. CTA (sticky, layered orb reveal)
// ══════════════════════════════════════════════════════════════
export default function MainPage2() {
  const { t } = useTranslation();

  // ── Refs ──────────────────────────────────────────────────
  const zoomSectionRef = useRef<HTMLDivElement>(null);
  const zoomItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const featureIntroRef = useRef<HTMLDivElement>(null);
  const featureNameRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const loopFadeActiveRef = useRef(false);

  // ── State ─────────────────────────────────────────────────
  const [activeIdx, setActiveIdx] = useState(0);

  // ── Unified scroll handler ────────────────────────────────
  const handleScroll = useCallback(() => {
    // Zoom grid: direct DOM manipulation for performance
    const zoomEl = zoomSectionRef.current;
    if (zoomEl) {
      const rect = zoomEl.getBoundingClientRect();
      const scrollable = zoomEl.offsetHeight - window.innerHeight;
      if (scrollable > 0) {
        const p = Math.max(0, Math.min(1, -rect.top / scrollable));
        ZOOM_ITEMS.forEach((item, i) => {
          const el = zoomItemRefs.current[i];
          if (!el) return;
          const { z, opacity, blur } = computeZoomItem(p, item.rs, item.re);
          el.style.transform = `translateZ(${z}px)`;
          el.style.opacity = String(opacity);
          el.style.filter = blur > 0.5 ? `blur(${blur}px)` : "none";
        });
      }
    }

    // Feature intro: scroll-driven name reveal (direct DOM for performance)
    const fiEl = featureIntroRef.current;
    if (fiEl) {
      const rect = fiEl.getBoundingClientRect();
      const scrollable = fiEl.offsetHeight - window.innerHeight;
      if (scrollable > 0) {
        const p = Math.max(0, Math.min(1, -rect.top / scrollable));
        const total = FEATURES.length;
        FEATURES.forEach((_, i) => {
          const el = featureNameRefs.current[i];
          if (!el) return;
          const band = 1 / total;
          const start = i * band;
          const end = start + band;
          if (p <= start || p >= end) {
            el.style.opacity = "0";
            el.style.transform = p < start ? "translateY(70px)" : "translateY(-70px)";
          } else {
            const local = (p - start) / band;
            if (local < 0.25) {
              const t = local / 0.25;
              el.style.opacity = String(t);
              el.style.transform = `translateY(${(1 - t) * 70}px)`;
            } else if (local > 0.75) {
              const t = (local - 0.75) / 0.25;
              el.style.opacity = String(1 - t);
              el.style.transform = `translateY(${-t * 70}px)`;
            } else {
              el.style.opacity = "1";
              el.style.transform = "translateY(0)";
            }
          }
        });
      }
    }

    // Feature showcase: state update for active step
    const featEl = scrollRef.current;
    if (featEl) {
      const rect = featEl.getBoundingClientRect();
      const scrollable = featEl.offsetHeight - window.innerHeight;
      if (scrollable > 0) {
        const p = Math.max(0, Math.min(1, -rect.top / scrollable));
        const idx = Math.min(
          FEATURE_COUNT - 1,
          Math.floor(p * FEATURE_COUNT),
        );
        setActiveIdx(idx);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // ── Seamless video loop: fade overlay to white just before end,
  //    restart manually on `ended`, then fade back in ────────────
  useEffect(() => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay) return;

    const FADE_MS = 550;
    const FADE_BEFORE = 1.5; // seconds before end to start fading

    overlay.style.transition = `opacity ${FADE_MS}ms ease-in-out`;

    const startFade = () => {
      if (loopFadeActiveRef.current) return;
      loopFadeActiveRef.current = true;
      overlay.style.opacity = "1";
    };

    const onTimeUpdate = () => {
      const remaining = video.duration - video.currentTime;
      if (!isNaN(remaining) && remaining > 0 && remaining <= FADE_BEFORE) {
        startFade();
      }
    };

    const onEnded = () => {
      video.currentTime = 0;
      video.play().catch(() => {});
      // Brief pause at full white, then fade back in
      setTimeout(() => {
        overlay.style.opacity = "0.55";
        // Re-arm once the fade-in transition finishes
        setTimeout(() => { loopFadeActiveRef.current = false; }, FADE_MS + 50);
      }, 80);
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  const scrollToStep = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const totalScrollable = el.offsetHeight - window.innerHeight;
    const stepSize = totalScrollable / FEATURE_COUNT;
    const target = el.offsetTop + stepSize * index + stepSize * 0.15;
    window.scrollTo({ top: target, behavior: "smooth" });
  }, []);

  const feat = FEATURES[activeIdx];

  // ── Reveal hooks ──────────────────────────────────────────
  const heroR = useReveal();
  const aboutR = useReveal();
  const ctaR = useReveal();

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader sticky={false} />

      {/* All slices in a single relative container —
          each sticky section covers the previous one */}
      <div className="relative">

        {/* ═══════════════════════════════════════════════════════
            SLICE 1 — HERO  (sticky, dark)
            Stagger in: badge → title → subtitle → CTAs → trust → mockup
            ═══════════════════════════════════════════════════════ */}
        <section className="sticky top-0 z-[1] min-h-screen overflow-hidden bg-gradient-to-br from-sky-50/70 via-white to-emerald-50/60 flex items-center relative">
          {/* Video background */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src={slice1Video} type="video/mp4" />
          </video>
          {/* Overlay — opacity controlled directly via DOM ref for zero-lag transitions */}
          <div
            ref={overlayRef}
            className="absolute inset-0 bg-white"
            style={{ opacity: 0.55 }}
          />
          <div className="m2-grid-pattern pointer-events-none absolute inset-0 opacity-30" />
          <div className="m2-hero-glow-light" />

          <div
            ref={heroR.ref}
            className={`relative z-10 mx-auto w-full max-w-screen-2xl grid grid-cols-1 items-center gap-10 px-6 pt-10 pb-20 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16 lg:px-14 m2-reveal ${heroR.visible ? "visible" : ""}`}
          >
            {/* LEFT — copy */}
            <div className="flex flex-col gap-6">
              <span className="m2-stagger m2-sd1 inline-flex w-fit items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-sky-600">
                <Sparkles className="h-3 w-3 text-sky-500" />
                {t("landing.badge")}
              </span>

              <h1 className="m2-stagger m2-sd2 text-6xl font-black leading-[1.02] tracking-tight text-slate-900 lg:text-7xl">
                <span className="mb-3 block text-2xl font-light text-slate-500 lg:text-3xl">
                  {t("landing.heroLine1")}
                </span>
                <span className="block">
                  <WaveText text={t("landing.heroHighlight")} className="m2-gradient-words" />
                </span>
                <span className="block text-slate-800">
                  <WaveText text={t("landing.heroLine2")} />
                </span>
              </h1>

              <p className="m2-stagger m2-sd4 max-w-xl text-lg leading-relaxed text-slate-900 lg:text-xl">
                {t("landing.heroSub")}
              </p>

              <div className="m2-stagger m2-sd5 flex flex-wrap items-center gap-3">
                <Link to={ROUTES.SIGNUP} className="btn-register">
                  <span className="btn-register-text">{t("landing.heroCta")}</span>
                </Link>
                <Link
                  to={ROUTES.LOGIN}
                  className={gradientButtonClass({
                    iconVariant: "other",
                    className: "!text-white hover:!text-white",
                  })}
                >
                  {t("landing.heroLogin")}
                  <ArrowRight className={gradientButtonIconClass("h-4 w-4")} />
                </Link>
              </div>

              <div className="m2-stagger m2-sd6 flex items-center gap-2.5 text-sm text-slate-400">
                <div className="flex -space-x-2">
                  {["bg-sky-400", "bg-emerald-400", "bg-violet-400"].map((c, i) => (
                    <div key={i} className={`h-7 w-7 rounded-full border-2 border-white ${c}`} />
                  ))}
                </div>
                <span>{t("landing.heroTrust")}</span>
              </div>
            </div>

            {/* RIGHT — dashboard browser mock */}
            <div className="m2-stagger m2-sd3 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-none">
                <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-sky-400/20 blur-[90px]" />
                <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-emerald-400/15 blur-[80px]" />
                <BrowserFrame className="m2-hero-monitor m2-monitor--white">
                  <img src={dashboardImg} alt="Balio Dashboard" className="w-full block" />
                </BrowserFrame>
                <div className="m2-float-card m2-float-card--tl">
                  <div className="flex items-center gap-1.5">
                    <div className="h-6 w-6 rounded-full bg-emerald-400/15 flex items-center justify-center shrink-0">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 leading-none">Savings</p>
                      <p className="text-xs font-black text-emerald-600">+12.4%</p>
                    </div>
                  </div>
                </div>
                <div className="m2-float-card m2-float-card--br">
                  <div className="flex items-center gap-1.5">
                    <div className="h-6 w-6 rounded-full bg-sky-400/15 flex items-center justify-center shrink-0">
                      <Target className="h-3 w-3 text-sky-500" />
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 leading-none">Goal</p>
                      <p className="text-xs font-black text-sky-600">68%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            SLICE 2 — ZOOM GRID (3D fly-through)
            250vh outer gives 150vh of scroll for the animation.
            Items zoom from behind → through screen → past viewer.
            Center items appear first (inside → outside).
            ═══════════════════════════════════════════════════════ */}
        <div ref={zoomSectionRef} className="relative z-[2]" style={{ height: "250vh" }}>
          <div className="m2-zoom-sticky sticky top-0 h-screen bg-gradient-to-br from-sky-50/60 via-white to-emerald-50/40 overflow-hidden">
            <div className="m2-grid-pattern pointer-events-none absolute inset-0 opacity-50" />
            <div className="m2-zoom-grid mx-auto px-6">
              {ZOOM_ITEMS.map((item, i) => (
                <div
                  key={item.id}
                  ref={(el) => { zoomItemRefs.current[i] = el; }}
                  className={`m2-zoom-item ${item.isCenter ? "m2-zoom-center" : ""}`}
                  style={{
                    gridRow: item.gridRow,
                    gridColumn: item.gridCol,
                    opacity: 0,
                  }}
                >
                  {item.isCenter ? (
                    <div className="text-center">
                      <h2 className="text-3xl font-black text-slate-900 lg:text-5xl">
                        {t("landing.featuresTitle")}{" "}
                        <span className="bg-gradient-to-r from-sky-500 to-emerald-500 bg-clip-text text-transparent">
                          {t("landing.featuresHighlight")}
                        </span>
                      </h2>
                      <p className="mt-3 text-sm text-slate-500 lg:text-base">
                        {t("landing.featuresSub")}
                      </p>
                    </div>
                  ) : (
                    <>
                      {item.icon && <item.icon className="h-5 w-5 text-slate-400" />}
                      <span className="text-xs font-medium text-slate-500 text-center leading-tight">
                        {t(`landing.${item.labelKey}`)}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            SLICE 3 — FEATURE NAMES  (scroll-driven, one name at a time)
            Each feature label appears as you scroll and exits as you scroll.
            500vh gives one full viewport of scroll per feature.
            ═══════════════════════════════════════════════════════ */}
        <div ref={featureIntroRef} className="relative z-[3]" style={{ height: `${FEATURES.length * 100}vh` }}>
          <div className="sticky top-0 h-screen bg-white flex flex-col items-center justify-center overflow-hidden">
            <div className="m2-grid-pattern pointer-events-none absolute inset-0 opacity-35" />

            {/* All 5 names layered absolutely — scroll-driven opacity+translate */}
            <div className="relative flex h-56 w-full items-center justify-center">
              {FEATURES.map((feat, i) => (
                <div
                  key={feat.id}
                  ref={(el) => { featureNameRefs.current[i] = el; }}
                  className="absolute inset-x-0 flex flex-col items-center gap-4"
                  style={{ opacity: 0, transform: "translateY(70px)" }}
                >
                  {/* Icon */}
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${feat.iconBg}`}>
                    <feat.icon className={`h-8 w-8 ${feat.accent}`} />
                  </div>
                  {/* Feature number */}
                  <p className="font-mono text-sm font-semibold text-slate-300">{feat.num}</p>
                  {/* Big label */}
                  <p className={`text-6xl font-black tracking-tight lg:text-8xl ${feat.accent}`}>
                    {t(`landing.${feat.id}.label`)}
                  </p>
                  {/* Short description */}
                  <p className="max-w-sm text-center text-base text-slate-400">
                    {t(`landing.${feat.id}.desc`).split(".")[0]}.
                  </p>
                </div>
              ))}
            </div>

            {/* Scroll hint dots */}
            <div className="absolute bottom-8 flex gap-2">
              {FEATURES.map((_, i) => (
                <div key={i} className="h-1.5 w-1.5 rounded-full bg-slate-200" />
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            SLICE 4 — FEATURE SHOWCASE (scroll-driven, 5 steps)
            Smooth parallax-style transitions between features.
            Text slides from left, screen from right.
            ═══════════════════════════════════════════════════════ */}
        <div
          ref={scrollRef}
          className="relative z-[4]"
          style={{ height: `${FEATURE_COUNT * 100}vh` }}
        >
          <div className="sticky top-0 h-screen bg-white flex items-center overflow-hidden">
            <div
              className="m2-step-glow top-[15%] left-[5%]"
              style={{ backgroundColor: feat.glowColor }}
            />
            <div
              className="m2-step-glow bottom-[10%] right-[10%]"
              style={{ backgroundColor: feat.glowColor }}
            />
            <div className="m2-grid-pattern pointer-events-none absolute inset-0 opacity-40" />

            <div className="relative mx-auto w-full max-w-7xl px-6 lg:px-8">
              {/* Content grid: larger gap, bigger text column */}
              <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
                {/* LEFT — text */}
                <div key={feat.id} className="m2-step-content-enter order-2 lg:order-1">
                  <div className="mb-5 flex items-center gap-3">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${feat.iconBg} ring-1 ${feat.border}`}>
                      <feat.icon className={`h-6 w-6 ${feat.accent}`} />
                    </div>
                    <div>
                      <p className="font-mono text-xs text-slate-400">{feat.num}</p>
                      <h3 className="text-2xl font-black text-slate-900 lg:text-3xl">
                        {t(`landing.${feat.id}.title`)}
                      </h3>
                    </div>
                  </div>

                  <p className="mb-7 max-w-md text-base leading-relaxed text-slate-500 lg:text-lg">
                    {t(`landing.${feat.id}.desc`)}
                  </p>

                  <ul className="mb-7 space-y-3">
                    {(["p1", "p2", "p3"] as const).map((pk) => (
                      <li key={pk} className="flex items-center gap-3 text-sm text-slate-700 lg:text-base">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                          <Check className="h-3 w-3 text-emerald-600" />
                        </span>
                        {t(`landing.${feat.id}.${pk}`)}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={ROUTES.SIGNUP}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-500 transition hover:text-sky-600"
                  >
                    {t("landing.explore")} {t(`landing.${feat.id}.label`).toLowerCase()}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* RIGHT — desktop mockup */}
                <div className="flex justify-center order-1 lg:order-2">
                  <BrowserFrame className="m2-showcase-monitor m2-monitor--white shadow-[0_30px_80px_-15px_rgba(15,23,42,0.12)]">
                    <div key={feat.id} className="m2-step-screen-enter h-full">
                      <FeatureScreen id={feat.id} />
                    </div>
                  </BrowserFrame>
                </div>
              </div>

              {/* PROGRESS indicator */}
              <div className="mt-10 flex justify-center lg:mt-14">
                <div className="m2-progress" style={{ maxWidth: "640px", width: "100%" }}>
                  <div className="m2-progress-line">
                    <div
                      className="m2-progress-line-fill"
                      style={{ width: `${(activeIdx / (FEATURE_COUNT - 1)) * 100}%` }}
                    />
                  </div>
                  {FEATURES.map((f, i) => (
                    <button
                      key={f.id}
                      onClick={() => scrollToStep(i)}
                      className={`m2-progress-step ${i !== activeIdx ? "dimmed" : ""}`}
                    >
                      <div
                        className={`m2-progress-dot ${
                          i < activeIdx ? "done" : i === activeIdx ? "active" : ""
                        }`}
                      />
                      <span className="font-mono text-[10px] text-slate-400">{f.num}</span>
                      <span
                        className={`text-[12px] font-semibold transition-colors ${
                          i === activeIdx ? "text-slate-900" : "text-slate-400"
                        }`}
                      >
                        {t(`landing.${f.id}.label`)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            SLICE 4 — ABOUT  (sticky, light)
            Slides up over the dark feature showcase.
            ═══════════════════════════════════════════════════════ */}
        <section className="sticky top-0 z-[5] min-h-screen bg-white flex items-center m2-about-section">
          <div
            ref={aboutR.ref}
            className={`mx-auto max-w-7xl px-6 py-16 lg:px-8 m2-reveal ${aboutR.visible ? "visible" : ""}`}
          >
            <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <span className="m2-stagger m2-sd1 mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
                  <GraduationCap className="h-3 w-3" /> {t("landing.aboutBadge")}
                </span>
                {/* Wave animation — always bouncing */}
                <h2 className="mb-4 text-4xl font-black tracking-tight text-slate-900 lg:text-5xl">
                  <WaveText text="Built with" className="text-slate-900" />{" "}
                  <WaveText text="purpose." className="text-sky-500" />
                </h2>
                <p className="m2-stagger m2-sd3 mb-6 max-w-lg text-base leading-relaxed text-slate-600">
                  {t("landing.aboutDesc")}
                </p>
                <div className="m2-stagger m2-sd4 mb-8 flex flex-wrap gap-2">
                  {["React 19", "TypeScript", "Spring Boot", "PostgreSQL", "JWT", "Docker Compose", "Vite", "i18next"].map((tech) => (
                    <span key={tech} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      {tech}
                    </span>
                  ))}
                </div>
                {/* 3D skewed social buttons */}
                <div className="m2-stagger m2-sd5 flex gap-10 pt-4">
                  <a
                    href="https://www.linkedin.com/in/marcos-romay-82b16036a/"
                    target="_blank"
                    rel="noreferrer"
                    className="m2-social-3d m2-social-3d--linkedin"
                  >
                    <Linkedin className="h-4 w-4 text-sky-600" />
                    LinkedIn
                  </a>
                  <a
                    href="https://github.com/Maarcosfdz"
                    target="_blank"
                    rel="noreferrer"
                    className="m2-social-3d m2-social-3d--github"
                  >
                    <Github className="h-4 w-4 text-emerald-700" />
                    GitHub
                  </a>
                </div>
              </div>

              {/* Stats grid — fan-out from cluster on scroll reveal */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { labelKey: "aboutModules", value: "5", subKey: "aboutModulesSub", from: "from-sky-50", to: "to-cyan-50", accent: "text-sky-600" },
                  { labelKey: "aboutSecurity", value: "JWT", subKey: "aboutSecuritySub", from: "from-emerald-50", to: "to-green-50", accent: "text-emerald-600" },
                  { labelKey: "aboutFrontend", value: "React", subKey: "aboutFrontendSub", from: "from-violet-50", to: "to-purple-50", accent: "text-violet-600" },
                  { labelKey: "aboutBackend", value: "Spring", subKey: "aboutBackendSub", from: "from-amber-50", to: "to-orange-50", accent: "text-amber-600" },
                ].map((s) => (
                  <div
                    key={s.labelKey}
                    className={`m2-stat-card m2-fancy-card rounded-2xl bg-gradient-to-br ${s.from} ${s.to} border border-slate-100 p-5`}
                  >
                    {/* Hover shine */}
                    <div className="m2-card-shine" />
                    {/* Hover grid lines */}
                    <div className="m2-card-lines">
                      <div className="m2-card-line m2-card-line-1" />
                      <div className="m2-card-line m2-card-line-2" />
                    </div>
                    {/* Hover tiles */}
                    <div className="m2-card-tiles">
                      <div className="m2-tile m2-tile-1" />
                      <div className="m2-tile m2-tile-2" />
                      <div className="m2-tile m2-tile-3" />
                      <div className="m2-tile m2-tile-4" />
                    </div>
                    <p className="relative z-10 mb-1 text-xs font-medium text-slate-400">{t(`landing.${s.labelKey}`)}</p>
                    <p className={`relative z-10 text-2xl font-black ${s.accent}`}>{s.value}</p>
                    <p className="relative z-10 mt-0.5 text-xs text-slate-500">{t(`landing.${s.subKey}`)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            SLICE 5 — CTA  (sticky, dark, layered orb reveal)
            Slides up over the about section. Decorative orbs
            scale from 0 → 1 for a depth/unfolding effect.
            ═══════════════════════════════════════════════════════ */}
        <section
          ref={ctaR.ref}
          className={`sticky top-0 z-[6] min-h-screen bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center overflow-hidden ${ctaR.visible ? "m2-cta-visible" : ""}`}
        >
          {/* Grid pattern + subtle white overlay dots */}
          <div className="m2-grid-pattern pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.25) 1px, transparent 1px)" }} />

          <div className={`relative mx-auto max-w-2xl px-6 text-center m2-reveal ${ctaR.visible ? "visible" : ""}`}>
            <h2 className="m2-stagger m2-sd1 mb-4 text-5xl font-black tracking-tight text-white lg:text-6xl">
              <span className="block">
                <WaveText text={t("landing.ctaLine1")} className="text-white" />
              </span>
              <span className="block mt-2">
                <WaveText text={t("landing.ctaHighlight")} className="text-white/85" />
              </span>
              <span className="block mt-2">
                <WaveText text={t("landing.ctaLine2")} className="text-white" />
              </span>
            </h2>
            <p className="m2-stagger m2-sd2 mb-10 text-white/75 text-lg">{t("landing.ctaSub")}</p>
            <div className="m2-stagger m2-sd3 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to={ROUTES.SIGNUP}
                className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-sky-600 shadow-lg transition hover:shadow-xl hover:scale-[1.03]"
              >
                {t("landing.ctaCta")}
              </Link>
              <Link
                to={ROUTES.LOGIN}
                className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                {t("landing.ctaLogin")} →
              </Link>
            </div>
          </div>
        </section>

      </div>

      <Footer />
    </div>
  );
}
