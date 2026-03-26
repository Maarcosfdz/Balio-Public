import { Link } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";
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
} from "lucide-react";
import { ROUTES } from "@/config/routes";
import Footer from "@/components/layout/footer";
import PublicHeader from "@/components/layout/PublicHeader";
import "@/styles/pages/main2.css";

// ══════════════════════════════════════════════════════════════
// Reveal hook
// ══════════════════════════════════════════════════════════════
function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.1 },
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
    label: "Análisis",
    icon: BarChart2,
    accent: "text-sky-400",
    glowColor: "rgba(56, 189, 248, 0.18)",
    title: "Visualiza tus hábitos financieros",
    desc: "Gráficas interactivas de ingresos y gastos por categoría, mes a mes. Detecta tendencias y toma mejores decisiones con datos reales.",
    points: [
      "Barras de ingresos vs gastos mensuales",
      "Donut de distribución por categoría",
      "Comparativa de los últimos 4 meses",
    ],
  },
  {
    num: "02",
    id: "accounts",
    label: "Cuentas",
    icon: Wallet,
    accent: "text-emerald-400",
    glowColor: "rgba(52, 211, 153, 0.18)",
    title: "Todas tus cuentas en un lugar",
    desc: "Gestiona efectivo, bancos y más desde un único panel. Consulta el balance total consolidado y sigue cada movimiento en tiempo real.",
    points: [
      "Múltiples tipos de cuenta",
      "Balance total consolidado",
      "Historial de movimientos por cuenta",
    ],
  },
  {
    num: "03",
    id: "transactions",
    label: "Transacciones",
    icon: ArrowLeftRight,
    accent: "text-violet-400",
    glowColor: "rgba(167, 139, 250, 0.18)",
    title: "Registra cada movimiento",
    desc: "Añade ingresos y gastos con categorías e iconos personalizados. Filtra, busca y entiende exactamente en qué va tu dinero cada mes.",
    points: [
      "Categorías e iconos personalizables",
      "Búsqueda y filtros avanzados",
      "Transacciones programadas y recurrentes",
    ],
  },
  {
    num: "04",
    id: "goals",
    label: "Metas",
    icon: Target,
    accent: "text-amber-400",
    glowColor: "rgba(251, 191, 36, 0.18)",
    title: "Persigue tus objetivos de ahorro",
    desc: "Define metas financieras y sigue tu progreso visualmente. Desde un viaje hasta un fondo de emergencia, cada objetivo activo.",
    points: [
      "Barra de progreso visual en tiempo real",
      "Fecha objetivo configurable",
      "Múltiples metas activas simultáneas",
    ],
  },
  {
    num: "05",
    id: "budgets",
    label: "Presupuestos",
    icon: ChartPie,
    accent: "text-rose-400",
    glowColor: "rgba(251, 113, 133, 0.18)",
    title: "Gasta con intención y control",
    desc: "Asigna límites de gasto por categoría y visualiza cuánto te queda. Alertas visuales cuando te acercas al límite.",
    points: [
      "Límite configurable por categoría",
      "Barra de progreso de gasto del mes",
      "Alerta visual de sobrepaso",
    ],
  },
] as const;

const FEATURE_COUNT = FEATURES.length;

// ══════════════════════════════════════════════════════════════
// Feature phone-screen mockups
// ══════════════════════════════════════════════════════════════
function FeatureScreen({ id }: { id: string }) {
  const bar = (
    <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
      <span className="text-[9px] font-semibold text-slate-400">9:41</span>
      <div className="flex items-center gap-0.5">
        <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        <div className="h-1.5 w-3.5 rounded bg-slate-300" />
      </div>
    </div>
  );

  if (id === "analysis")
    return (
      <div className="h-full bg-white">
        {bar}
        <div className="px-3">
          <p className="text-[11px] font-black text-slate-800 mb-2">Análisis</p>
          <div className="rounded-xl bg-slate-50 p-2.5 mb-2">
            <p className="text-[8px] font-semibold text-slate-400 mb-1.5">Ingresos vs Gastos</p>
            <div className="flex items-end gap-1 h-16">
              {[
                { i: 72, e: 48 },
                { i: 88, e: 62 },
                { i: 68, e: 52 },
                { i: 96, e: 58 },
              ].map((b, idx) => (
                <div key={idx} className="flex-1 flex items-end gap-0.5">
                  <div className="flex-1 rounded-t bg-sky-400" style={{ height: `${b.i}%` }} />
                  <div className="flex-1 rounded-t bg-emerald-400/80" style={{ height: `${b.e}%` }} />
                </div>
              ))}
            </div>
            <div className="flex justify-around mt-1 text-[7px] text-slate-300">
              <span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span>
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5">
            <p className="text-[8px] font-semibold text-slate-400 mb-1.5">Gastos por categoría</p>
            {[
              { name: "Alimentación", pct: 42, color: "bg-sky-400" },
              { name: "Ocio", pct: 25, color: "bg-violet-400" },
              { name: "Transporte", pct: 18, color: "bg-emerald-400" },
              { name: "Otros", pct: 15, color: "bg-amber-400" },
            ].map((c) => (
              <div key={c.name} className="mb-1.5">
                <div className="flex justify-between text-[7px] mb-0.5">
                  <span className="text-slate-500">{c.name}</span>
                  <span className="font-bold text-slate-600">{c.pct}%</span>
                </div>
                <div className="h-1 w-full rounded-full bg-slate-200">
                  <div className={`h-full rounded-full ${c.color}`} style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

  if (id === "accounts")
    return (
      <div className="h-full bg-white">
        {bar}
        <div className="px-3">
          <p className="text-[11px] font-black text-slate-800 mb-2">Cuentas</p>
          <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3 mb-3">
            <p className="text-[8px] text-white/70">Balance total</p>
            <p className="text-xl font-black text-white leading-tight">€2.840,50</p>
          </div>
          {[
            { name: "Banco BBVA", type: "Bancaria", amt: "€1.800", bg: "bg-sky-100" },
            { name: "Efectivo", type: "Cash", amt: "€540", bg: "bg-emerald-100" },
            { name: "Ahorro", type: "Savings", amt: "€500", bg: "bg-amber-100" },
          ].map((a) => (
            <div key={a.name} className="flex items-center gap-2 mb-2 rounded-xl bg-slate-50 p-2.5">
              <div className={`w-7 h-7 rounded-lg ${a.bg} shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-slate-700 truncate">{a.name}</p>
                <p className="text-[7px] text-slate-400">{a.type}</p>
              </div>
              <p className="text-[9px] font-black text-slate-700 shrink-0">{a.amt}</p>
            </div>
          ))}
        </div>
      </div>
    );

  if (id === "transactions")
    return (
      <div className="h-full bg-white">
        {bar}
        <div className="px-3">
          <p className="text-[11px] font-black text-slate-800 mb-1">Transacciones</p>
          <div className="flex gap-1 mb-2">
            {["Todas", "Ingresos", "Gastos"].map((f, i) => (
              <span
                key={f}
                className={`text-[7px] font-semibold px-2 py-0.5 rounded-full ${
                  i === 0 ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-400"
                }`}
              >
                {f}
              </span>
            ))}
          </div>
          {[
            { name: "Supermercado", cat: "Alimentación", amt: "-€42,30", bg: "bg-emerald-100", neg: true },
            { name: "Nómina marzo", cat: "Salario", amt: "+€1.200", bg: "bg-sky-100", neg: false },
            { name: "Netflix", cat: "Ocio", amt: "-€15,99", bg: "bg-violet-100", neg: true },
            { name: "Gasolina", cat: "Transporte", amt: "-€55,00", bg: "bg-amber-100", neg: true },
            { name: "Freelance", cat: "Extra", amt: "+€320", bg: "bg-cyan-100", neg: false },
          ].map((tx) => (
            <div key={tx.name} className="flex items-center gap-2 mb-1.5">
              <div className={`w-6 h-6 rounded-lg ${tx.bg} shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-[8px] font-bold text-slate-700 truncate">{tx.name}</p>
                <p className="text-[7px] text-slate-400">{tx.cat}</p>
              </div>
              <p className={`text-[8px] font-black shrink-0 ${tx.neg ? "text-slate-600" : "text-emerald-600"}`}>
                {tx.amt}
              </p>
            </div>
          ))}
        </div>
      </div>
    );

  if (id === "goals")
    return (
      <div className="h-full bg-white">
        {bar}
        <div className="px-3">
          <p className="text-[11px] font-black text-slate-800 mb-2">Metas</p>
          {[
            { name: "Viaje a Japón", target: "€3.000", current: "€2.040", pct: 68, color: "bg-amber-400" },
            { name: "Fondo emergencia", target: "€5.000", current: "€2.250", pct: 45, color: "bg-sky-400" },
            { name: "MacBook nuevo", target: "€1.500", current: "€1.320", pct: 88, color: "bg-emerald-400" },
          ].map((g) => (
            <div key={g.name} className="rounded-xl bg-slate-50 p-2.5 mb-2">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5">
                  <Target className="h-3 w-3 text-amber-500" />
                  <p className="text-[9px] font-bold text-slate-700">{g.name}</p>
                </div>
                <span className="text-[8px] font-black text-amber-500">{g.pct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-200 mb-1">
                <div className={`h-full rounded-full ${g.color}`} style={{ width: `${g.pct}%` }} />
              </div>
              <div className="flex justify-between text-[7px] text-slate-400">
                <span>{g.current}</span>
                <span>{g.target}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  // budgets
  return (
    <div className="h-full bg-white">
      {bar}
      <div className="px-3">
        <p className="text-[11px] font-black text-slate-800 mb-2">Presupuestos</p>
        {[
          { name: "Alimentación", spent: "€216", limit: "€300", pct: 72, color: "bg-sky-400" },
          { name: "Ocio", spent: "€176", limit: "€200", pct: 88, color: "bg-rose-400", over: true },
          { name: "Transporte", spent: "€41", limit: "€100", pct: 41, color: "bg-emerald-400" },
          { name: "Hogar", spent: "€165", limit: "€300", pct: 55, color: "bg-violet-400" },
        ].map((b) => (
          <div key={b.name} className="rounded-xl bg-slate-50 p-2.5 mb-2">
            <div className="flex justify-between items-center mb-1">
              <p className="text-[9px] font-bold text-slate-700">{b.name}</p>
              <p className={`text-[8px] font-black ${b.over ? "text-rose-500" : "text-slate-500"}`}>
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
  );
}

// ══════════════════════════════════════════════════════════════
// Hero phone mockup (small, for hero section)
// ══════════════════════════════════════════════════════════════
function HeroMockup() {
  return (
    <div className="relative mx-auto w-fit">
      <div className="pointer-events-none absolute -top-16 -left-16 h-56 w-56 rounded-full bg-sky-500/20 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-emerald-500/18 blur-[70px]" />

      <div className="m2-phone">
        <div className="m2-phone-notch" />
        {/* TODO: Replace with <img src="/images/app-screenshot.png" className="w-full h-full object-cover" /> */}
        <div className="m2-phone-screen">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <span className="text-[9px] font-semibold text-slate-400">9:41</span>
            <div className="flex items-center gap-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              <div className="h-1.5 w-3.5 rounded bg-slate-300" />
            </div>
          </div>
          <div className="px-4 pt-1 pb-2">
            <p className="text-[9px] text-slate-400">Bienvenido 👋</p>
            <p className="text-sm font-black leading-tight">
              <span className="bg-gradient-to-r from-sky-500 to-emerald-500 bg-clip-text text-transparent">
                Marcos
              </span>
            </p>
          </div>
          <div className="mx-3 mb-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 p-3">
            <p className="text-[8px] text-white/70 font-medium">Balance total</p>
            <p className="text-lg font-black text-white leading-tight">€2.840,50</p>
            <div className="mt-1.5 flex gap-1.5">
              <div className="flex-1 rounded-lg bg-white/20 px-1.5 py-1">
                <p className="text-[7px] text-white/70">Ingresos</p>
                <p className="text-[10px] font-bold text-white">+€1.200</p>
              </div>
              <div className="flex-1 rounded-lg bg-white/20 px-1.5 py-1">
                <p className="text-[7px] text-white/70">Gastos</p>
                <p className="text-[10px] font-bold text-white">-€680</p>
              </div>
            </div>
          </div>
          <div className="mx-3 mb-2.5 rounded-xl bg-slate-100 p-2.5">
            <p className="text-[8px] font-semibold text-slate-500 mb-1.5">Últimos 4 meses</p>
            <div className="flex items-end gap-1 h-10">
              {[30, 48, 36, 62, 45, 68].map((h, i) => (
                <div key={i} className="flex-1 rounded-t" style={{
                  height: `${h * 0.6}%`,
                  background: i === 5 ? "linear-gradient(to top, #0891b2, #22d3ee)" : "#e2e8f0",
                }} />
              ))}
            </div>
          </div>
          <div className="mx-3">
            <p className="text-[8px] font-semibold text-slate-400 mb-1.5">Recientes</p>
            {[
              { name: "Supermercado", amt: "-€42", bg: "bg-emerald-100", pos: false },
              { name: "Nómina", amt: "+€1.200", bg: "bg-sky-100", pos: true },
              { name: "Netflix", amt: "-€15", bg: "bg-violet-100", pos: false },
            ].map((tx, i) => (
              <div key={i} className="flex items-center gap-1.5 mb-1.5">
                <div className={`w-5 h-5 rounded-lg ${tx.bg} shrink-0`} />
                <span className="flex-1 text-[8px] text-slate-600 font-medium truncate">{tx.name}</span>
                <span className={`text-[8px] font-bold ${tx.pos ? "text-emerald-600" : "text-slate-600"}`}>{tx.amt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="m2-float-card m2-float-card--tl">
        <div className="flex items-center gap-1.5">
          <div className="h-6 w-6 rounded-full bg-emerald-400/15 flex items-center justify-center shrink-0">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
          </div>
          <div>
            <p className="text-[9px] text-slate-400 leading-none">Ahorro</p>
            <p className="text-xs font-black text-emerald-600">+12,4%</p>
          </div>
        </div>
      </div>
      <div className="m2-float-card m2-float-card--br">
        <div className="flex items-center gap-1.5">
          <div className="h-6 w-6 rounded-full bg-sky-400/15 flex items-center justify-center shrink-0">
            <Target className="h-3 w-3 text-sky-500" />
          </div>
          <div>
            <p className="text-[9px] text-slate-400 leading-none">Meta viaje</p>
            <p className="text-xs font-black text-sky-600">68%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════════════
export default function MainPage2() {
  // ── Scroll-driven state ────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const totalScrollable = el.offsetHeight - window.innerHeight;
    if (totalScrollable <= 0) return;
    const progress = Math.max(0, Math.min(1, -rect.top / totalScrollable));
    const idx = Math.min(FEATURE_COUNT - 1, Math.floor(progress * FEATURE_COUNT));
    setActiveIdx(idx);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToStep = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const totalScrollable = el.offsetHeight - window.innerHeight;
    const stepSize = totalScrollable / FEATURE_COUNT;
    const target = el.offsetTop + stepSize * index + stepSize * 0.15;
    window.scrollTo({ top: target, behavior: "smooth" });
  }, []);

  const feat = FEATURES[activeIdx];

  // ── Reveal hooks ───────────────────────────────────────────
  const heroR  = useReveal();
  const aboutR = useReveal();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />

      {/* ═══════════════════════════════════════════════════════
          HERO  (full screen, dark)
          ═══════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen overflow-hidden bg-slate-950 flex items-center">
        <div className="m2-grid-pattern pointer-events-none absolute inset-0 opacity-40" />
        <div className="m2-hero-glow" />

        <div
          ref={heroR.ref}
          className={`relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:px-8 m2-reveal ${heroR.visible ? "visible" : ""}`}
        >
          {/* Left: copy */}
          <div className="flex flex-col gap-6">
            <span className="m2-reveal-d1 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-300">
              <Sparkles className="h-3 w-3 text-sky-400" />
              Personal Finance Manager
            </span>

            <h1 className="m2-reveal-d2 text-5xl font-black leading-[1.05] tracking-tight text-white lg:text-6xl">
              <span className="mb-2 block text-2xl font-light text-slate-400 lg:text-3xl">
                Toma el control de
              </span>
              <span className="block bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
                tus finanzas
              </span>
              <span className="block">con claridad.</span>
            </h1>

            <p className="m2-reveal-d3 max-w-lg text-base leading-relaxed text-slate-400 lg:text-lg">
              Registra, analiza y optimiza tu dinero desde un único lugar.
              Cuentas, transacciones, presupuestos y metas — todo conectado.
            </p>

            <div className="m2-reveal-d3 flex flex-wrap items-center gap-3">
              <Link to={ROUTES.SIGNUP} className="btn-register">
                <span className="btn-register-text">Empezar gratis</span>
              </Link>
              <Link
                to={ROUTES.LOGIN}
                className="btn-login-hover !border-white/20 !text-white/75 hover:!border-white/40 hover:!text-white"
              >
                Iniciar sesión
                <ArrowRight className="arrow-icon h-4 w-4" />
              </Link>
            </div>

            <div className="m2-reveal-d4 flex items-center gap-2.5 text-sm text-slate-500">
              <div className="flex -space-x-2">
                {["bg-sky-400", "bg-emerald-400", "bg-violet-400"].map((c, i) => (
                  <div key={i} className={`h-7 w-7 rounded-full border-2 border-slate-950 ${c}`} />
                ))}
              </div>
              <span>Pensado para estudiantes y profesionales</span>
            </div>
          </div>

          {/* Right: phone mockup
            TODO: Replace <HeroMockup /> with:
            <img src="/images/hero-3d.png" alt="Balio" className="w-64 lg:w-72 mx-auto drop-shadow-2xl" />
          */}
          <div className="m2-reveal-d2 flex justify-center lg:justify-end">
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          MARQUEE TICKER
          ═══════════════════════════════════════════════════════ */}
      <div className="border-y border-slate-200 bg-white py-3">
        <div className="m2-ticker-wrap">
          <div className="m2-ticker-track select-none">
            {[0, 1].map((rep) => (
              <span key={rep} className="inline-flex items-center">
                {[
                  "Análisis visual",
                  "Gestión de cuentas",
                  "Registro de transacciones",
                  "Metas de ahorro",
                  "Control de presupuesto",
                  "Multi-moneda",
                  "Categorías personalizadas",
                  "Transacciones programadas",
                  "Filtros avanzados",
                  "Balance en tiempo real",
                ].map((item, i) => (
                  <span
                    key={i}
                    className="mx-5 inline-flex items-center gap-2 text-sm font-medium text-slate-400"
                  >
                    <span className="text-base text-sky-400">·</span>
                    {item}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SCROLL-DRIVEN FEATURE SECTION  (5 screens)
          The outer div is 5×100vh. The inner sticky stays
          on-screen while the user scrolls, switching features.
          ═══════════════════════════════════════════════════════ */}
      <section
        ref={scrollRef}
        className="m2-scroll-outer bg-slate-950"
        style={{ height: `${FEATURE_COUNT * 100}vh` }}
      >
        <div className="m2-scroll-sticky">
          {/* Ambient glow — shifts colour per feature */}
          <div
            className="m2-step-glow top-[15%] left-[5%]"
            style={{ backgroundColor: feat.glowColor }}
          />
          <div
            className="m2-step-glow bottom-[10%] right-[10%]"
            style={{ backgroundColor: feat.glowColor }}
          />
          <div className="m2-grid-pattern pointer-events-none absolute inset-0 opacity-25" />

          <div className="relative mx-auto w-full max-w-7xl px-6 lg:px-8">
            {/* Heading */}
            <h2 className="mb-10 text-center text-3xl font-black tracking-tight text-white lg:mb-14 lg:text-5xl">
              Unifica tus{" "}
              <span className="bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">
                finanzas.
              </span>
            </h2>

            {/* Content grid: text + phone */}
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16">
              {/* LEFT — text content (re-mounts on step change) */}
              <div
                key={feat.id}
                className="m2-step-content-enter order-2 lg:order-1"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                    <feat.icon className={`h-5 w-5 ${feat.accent}`} />
                  </div>
                  <div>
                    <p className="font-mono text-xs text-white/30">{feat.num}</p>
                    <h3 className="text-xl font-black text-white lg:text-2xl">
                      {feat.title}
                    </h3>
                  </div>
                </div>

                <p className="mb-6 max-w-md text-base leading-relaxed text-slate-400">
                  {feat.desc}
                </p>

                <ul className="mb-6 space-y-2.5">
                  {feat.points.map((pt) => (
                    <li
                      key={pt}
                      className="flex items-center gap-2.5 text-sm text-slate-300"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10">
                        <Check className="h-3 w-3 text-emerald-400" />
                      </span>
                      {pt}
                    </li>
                  ))}
                </ul>

                <Link
                  to={ROUTES.SIGNUP}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-400 transition hover:text-sky-300"
                >
                  Explorar {feat.label.toLowerCase()}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* RIGHT — phone mockup with swappable screen */}
              <div className="flex justify-center order-1 lg:order-2">
                <div className="m2-showcase-phone">
                  <div className="m2-showcase-notch" />
                  {/* TODO: Replace FeatureScreen with:
                    <img src={`/images/screen-${feat.id}.png`} className="w-full h-full object-cover" />
                  */}
                  <div
                    key={feat.id}
                    className="m2-step-screen-enter m2-showcase-screen"
                  >
                    <FeatureScreen id={feat.id} />
                  </div>
                </div>
              </div>
            </div>

            {/* PROGRESS indicator — numbered steps */}
            <div className="mt-10 flex justify-center lg:mt-14">
              <div className="m2-progress">
                {/* Connecting line */}
                <div className="m2-progress-line">
                  <div
                    className="m2-progress-line-fill"
                    style={{
                      width: `${(activeIdx / (FEATURE_COUNT - 1)) * 100}%`,
                    }}
                  />
                </div>

                {FEATURES.map((f, i) => (
                  <button
                    key={f.id}
                    onClick={() => scrollToStep(i)}
                    className={`m2-progress-step ${
                      i !== activeIdx ? "dimmed" : ""
                    }`}
                  >
                    <div
                      className={`m2-progress-dot ${
                        i < activeIdx
                          ? "done"
                          : i === activeIdx
                            ? "active"
                            : ""
                      }`}
                    />
                    <span className="font-mono text-[10px] text-white/30">
                      {f.num}
                    </span>
                    <span
                      className={`text-[11px] font-semibold transition-colors ${
                        i === activeIdx ? "text-white" : "text-white/30"
                      }`}
                    >
                      {f.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          ABOUT  (full screen, light)
          ═══════════════════════════════════════════════════════ */}
      <section className="flex min-h-screen items-center border-t border-slate-200 bg-white py-24">
        <div
          ref={aboutR.ref}
          className={`mx-auto max-w-7xl px-6 lg:px-8 m2-reveal ${aboutR.visible ? "visible" : ""}`}
        >
          <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
                <GraduationCap className="h-3 w-3" /> Proyecto académico
              </span>
              <h2 className="mb-4 text-4xl font-black tracking-tight text-slate-900 lg:text-5xl">
                Hecho con{" "}
                <span className="bg-gradient-to-r from-sky-500 to-emerald-500 bg-clip-text text-transparent">
                  propósito.
                </span>
              </h2>
              <p className="mb-6 max-w-lg text-base leading-relaxed text-slate-600">
                Balio nació como un proyecto de fin de grado con el objetivo de
                crear una aplicación de finanzas personales completa, segura y
                moderna. Cada módulo está pensado para que cualquier persona
                pueda entender y controlar su dinero.
              </p>
              <div className="mb-8 flex flex-wrap gap-2">
                {[
                  "React 19",
                  "TypeScript",
                  "Spring Boot",
                  "PostgreSQL",
                  "JWT",
                  "Docker Compose",
                  "Vite",
                  "i18next",
                ].map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                  >
                    {tech}
                  </span>
                ))}
              </div>
              <div className="flex gap-3">
                <a
                  href="https://www.linkedin.com/in/marcos-romay-82b16036a/"
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
                >
                  <Linkedin className="h-4 w-4 text-sky-600" />
                  LinkedIn
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </a>
                <a
                  href="https://github.com/Maarcosfdz"
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"
                >
                  <Github className="h-4 w-4 text-emerald-700" />
                  GitHub
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Módulos", value: "5", sub: "interconectados", from: "from-sky-50", to: "to-cyan-50", accent: "text-sky-600" },
                { label: "Seguridad", value: "JWT", sub: "refresh token", from: "from-emerald-50", to: "to-green-50", accent: "text-emerald-600" },
                { label: "Frontend", value: "React", sub: "TypeScript · Vite", from: "from-violet-50", to: "to-purple-50", accent: "text-violet-600" },
                { label: "Backend", value: "Spring", sub: "Boot · PostgreSQL", from: "from-amber-50", to: "to-orange-50", accent: "text-amber-600" },
              ].map((s) => (
                <div key={s.label} className={`rounded-2xl bg-gradient-to-br ${s.from} ${s.to} border border-slate-100 p-5`}>
                  <p className="mb-1 text-xs font-medium text-slate-400">{s.label}</p>
                  <p className={`text-2xl font-black ${s.accent}`}>{s.value}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          CTA  (dark)
          ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-slate-950 py-28 text-center">
        <div className="m2-hero-glow" />
        <div className="m2-grid-pattern pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative mx-auto max-w-2xl px-6">
          <h2 className="mb-4 text-4xl font-black tracking-tight text-white lg:text-5xl">
            1 app.{" "}
            <span className="bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">
              5 herramientas.
            </span>
            <br />
            Todo lo que necesitas.
          </h2>
          <p className="mb-8 text-slate-400">
            Únete y empieza a entender tus finanzas en minutos.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to={ROUTES.SIGNUP} className="btn-register">
              <span className="btn-register-text">Crear cuenta gratis</span>
            </Link>
            <Link
              to={ROUTES.LOGIN}
              className="btn-login-hover !border-white/20 !text-white/70 hover:!border-white/40 hover:!text-white"
            >
              Ya tengo cuenta <ArrowRight className="arrow-icon h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
