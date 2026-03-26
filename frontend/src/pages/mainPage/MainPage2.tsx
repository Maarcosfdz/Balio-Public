import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
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
// Reveal hook — adds .visible when element enters viewport
// ══════════════════════════════════════════════════════════════
function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, visible };
}

// ══════════════════════════════════════════════════════════════
// Feature data — Unify section tabs
// ══════════════════════════════════════════════════════════════
const UNIFY_FEATURES = [
  {
    num: "01",
    id: "analysis",
    label: "Análisis",
    icon: BarChart2,
    accentClass: "text-sky-400",
    bgClass: "from-sky-600/30 to-sky-950/80",
    ringColor: "ring-sky-400",
    dotColor: "bg-sky-400",
    title: "Visualiza tus hábitos financieros",
    desc: "Gráficas interactivas de ingresos y gastos por categoría, mes a mes. Detecta tendencias y toma mejores decisiones con datos reales de tu dinero.",
    points: [
      "Barras de ingresos vs gastos mensuales",
      "Donut de distribución de gastos",
      "Comparativa de los últimos 4 meses",
    ],
    route: ROUTES.ANALYSIS,
  },
  {
    num: "02",
    id: "accounts",
    label: "Cuentas",
    icon: Wallet,
    accentClass: "text-emerald-400",
    bgClass: "from-emerald-600/30 to-emerald-950/80",
    ringColor: "ring-emerald-400",
    dotColor: "bg-emerald-400",
    title: "Todas tus cuentas en un lugar",
    desc: "Gestiona efectivo, cuentas bancarias y más desde un único panel. Consulta el balance total consolidado y sigue cada movimiento en tiempo real.",
    points: [
      "Múltiples tipos de cuenta",
      "Balance total consolidado al instante",
      "Historial de movimientos por cuenta",
    ],
    route: ROUTES.ACCOUNTS,
  },
  {
    num: "03",
    id: "transactions",
    label: "Transacciones",
    icon: ArrowLeftRight,
    accentClass: "text-violet-400",
    bgClass: "from-violet-600/30 to-violet-950/80",
    ringColor: "ring-violet-400",
    dotColor: "bg-violet-400",
    title: "Registra cada movimiento",
    desc: "Añade ingresos y gastos con categorías e iconos personalizados. Filtra, busca y entiende exactamente en qué va tu dinero cada mes.",
    points: [
      "Categorías e iconos personalizables",
      "Búsqueda y filtros avanzados",
      "Transacciones programadas y recurrentes",
    ],
    route: ROUTES.TRANSACTIONS,
  },
  {
    num: "04",
    id: "goals",
    label: "Metas",
    icon: Target,
    accentClass: "text-amber-400",
    bgClass: "from-amber-600/30 to-amber-950/80",
    ringColor: "ring-amber-400",
    dotColor: "bg-amber-400",
    title: "Persigue tus objetivos de ahorro",
    desc: "Define metas financieras y sigue tu progreso visualmente. Desde un viaje hasta un fondo de emergencia, cada objetivo queda registrado y activo.",
    points: [
      "Barra de progreso visual en tiempo real",
      "Fecha objetivo configurable",
      "Múltiples metas activas simultáneas",
    ],
    route: ROUTES.GOALS,
  },
  {
    num: "05",
    id: "budgets",
    label: "Presupuestos",
    icon: ChartPie,
    accentClass: "text-rose-400",
    bgClass: "from-rose-600/30 to-rose-950/80",
    ringColor: "ring-rose-400",
    dotColor: "bg-rose-400",
    title: "Gasta con intención y control",
    desc: "Asigna límites de gasto por categoría y visualiza cuánto te queda. Alertas visuales cuando te acercas al límite para no pasarte nunca.",
    points: [
      "Límite configurable por categoría",
      "Barra de progreso de gasto del mes",
      "Alerta visual de sobrepaso",
    ],
    route: ROUTES.BUDGETS,
  },
] as const;

// ══════════════════════════════════════════════════════════════
// Snippet mini-illustration per feature
// ══════════════════════════════════════════════════════════════
function SnippetIllustration({ id }: { id: string }) {
  if (id === "analysis")
    return (
      <div className="mt-2 flex items-end gap-1 h-20">
        {[30, 55, 38, 70, 48, 62, 75].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-sky-400/65"
            style={{ height: `${h * 0.36}px` }}
          />
        ))}
      </div>
    );

  if (id === "accounts")
    return (
      <div className="mt-3 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-emerald-400/45 shrink-0" />
            <div className="flex-1 h-1.5 rounded bg-white/15" />
            <div className="w-7 h-1.5 rounded bg-emerald-400/55" />
          </div>
        ))}
      </div>
    );

  if (id === "transactions")
    return (
      <div className="mt-3 space-y-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-lg bg-violet-400/30 shrink-0" />
            <div className="flex-1 h-1.5 rounded bg-white/15" />
            <div
              className={`w-5 h-1.5 rounded ${
                i % 2 === 0 ? "bg-emerald-400/65" : "bg-rose-400/55"
              }`}
            />
          </div>
        ))}
      </div>
    );

  if (id === "goals")
    return (
      <div className="mt-3 space-y-3">
        {[72, 45, 88].map((pct, i) => (
          <div key={i} className="space-y-1">
            <div className="h-1.5 w-14 rounded bg-white/20" />
            <div className="h-1.5 w-full rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-amber-400/75"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );

  if (id === "budgets")
    return (
      <div className="mt-3 space-y-2.5">
        {[58, 87, 32].map((pct, i) => (
          <div key={i} className="space-y-1">
            <div className="h-1.5 w-12 rounded bg-white/20" />
            <div className="h-1.5 w-full rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${
                  pct > 80 ? "bg-rose-400/85" : "bg-rose-400/55"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );

  return null;
}

// ══════════════════════════════════════════════════════════════
// Hero phone mockup (replace inner content with screenshot)
// ══════════════════════════════════════════════════════════════
function HeroMockup() {
  return (
    <div className="relative mx-auto w-fit">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-16 -left-16 h-56 w-56 rounded-full bg-sky-500/20 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-emerald-500/18 blur-[70px]" />

      {/* ── Phone frame ── */}
      <div className="m2-phone">
        <div className="m2-phone-notch" />

        {/*
         * TODO: Replace this entire <div className="m2-phone-screen"> block with:
         * <img src="/images/app-screenshot.png" alt="Balio dashboard" className="w-full h-full object-cover" />
         */}
        <div className="m2-phone-screen">
          {/* Status bar */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <span className="text-[9px] font-semibold text-slate-400">9:41</span>
            <div className="flex items-center gap-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              <div className="h-1.5 w-3.5 rounded bg-slate-300" />
            </div>
          </div>

          {/* Greeting */}
          <div className="px-4 pt-1 pb-2">
            <p className="text-[9px] text-slate-400">Bienvenido de nuevo 👋</p>
            <p className="text-sm font-black leading-tight">
              <span className="bg-gradient-to-r from-sky-500 to-emerald-500 bg-clip-text text-transparent">
                Marcos
              </span>
            </p>
          </div>

          {/* Balance card */}
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

          {/* Mini bar chart */}
          <div className="mx-3 mb-2.5 rounded-xl bg-slate-100 p-2.5">
            <p className="text-[8px] font-semibold text-slate-500 mb-1.5">Últimos 4 meses</p>
            <div className="flex items-end gap-1 h-10">
              {[
                { i: 30, e: 22 },
                { i: 48, e: 35 },
                { i: 36, e: 28 },
                { i: 62, e: 40 },
                { i: 45, e: 30 },
                { i: 68, e: 45 },
              ].map((bar, i) => (
                <div key={i} className="flex-1 flex items-end gap-0.5">
                  <div
                    className="flex-1 rounded-t"
                    style={{
                      height: `${bar.i * 0.58}%`,
                      background:
                        i === 5
                          ? "linear-gradient(to top, #0891b2, #22d3ee)"
                          : "#e2e8f0",
                    }}
                  />
                  <div
                    className="flex-1 rounded-t"
                    style={{
                      height: `${bar.e * 0.58}%`,
                      background:
                        i === 5
                          ? "linear-gradient(to top, #16a34a, #4ade80)"
                          : "#f1f5f9",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Recent transactions */}
          <div className="mx-3">
            <p className="text-[8px] font-semibold text-slate-400 mb-1.5">Recientes</p>
            {[
              { name: "Supermercado", amt: "-€42", bg: "bg-emerald-100", pos: false },
              { name: "Nómina", amt: "+€1.200", bg: "bg-sky-100", pos: true },
              { name: "Netflix", amt: "-€15", bg: "bg-violet-100", pos: false },
            ].map((tx, i) => (
              <div key={i} className="flex items-center gap-1.5 mb-1.5">
                <div className={`w-5 h-5 rounded-lg ${tx.bg} shrink-0`} />
                <span className="flex-1 text-[8px] text-slate-600 font-medium truncate">
                  {tx.name}
                </span>
                <span
                  className={`text-[8px] font-bold ${
                    tx.pos ? "text-emerald-600" : "text-slate-600"
                  }`}
                >
                  {tx.amt}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Floating stat cards ── */}
      <div className="m2-float-card m2-float-card--tl">
        <div className="flex items-center gap-1.5">
          <div className="h-6 w-6 rounded-full bg-emerald-400/15 flex items-center justify-center shrink-0">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
          </div>
          <div>
            <p className="text-[9px] text-slate-400 leading-none">Ahorro este mes</p>
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
            <p className="text-xs font-black text-sky-600">68% alcanzado</p>
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
  const [activeTab, setActiveTab] = useState<string>("analysis");
  const [manualTab, setManualTab] = useState(false);
  const snippetRef = useRef<HTMLDivElement>(null);

  // Auto-rotate tabs every 3.5 s unless user has clicked
  useEffect(() => {
    if (manualTab) return;
    const ids = UNIFY_FEATURES.map((f) => f.id);
    const timer = setInterval(() => {
      setActiveTab((prev) => {
        const idx = ids.indexOf(prev as (typeof ids)[number]);
        return ids[(idx + 1) % ids.length];
      });
    }, 3500);
    return () => clearInterval(timer);
  }, [manualTab]);

  // Scroll snippet into center when tab changes
  useEffect(() => {
    const track = snippetRef.current;
    if (!track) return;
    const idx = UNIFY_FEATURES.findIndex((f) => f.id === activeTab);
    const card = track.children[idx] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeTab]);

  const activeFeature =
    UNIFY_FEATURES.find((f) => f.id === activeTab) ?? UNIFY_FEATURES[0];

  // Section reveal hooks
  const heroR    = useReveal();
  const unifyR   = useReveal();
  const feat1R   = useReveal();
  const feat2R   = useReveal();
  const feat3R   = useReveal();
  const aboutR   = useReveal();

  function handleTabClick(id: string) {
    setActiveTab(id);
    setManualTab(true);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />

      {/* ╔══════════════════════════════════════════════════════╗
          ║  HERO                                                ║
          ╚══════════════════════════════════════════════════════╝ */}
      <section className="relative overflow-hidden bg-slate-950">
        {/* Grid dot pattern */}
        <div className="m2-grid-pattern pointer-events-none absolute inset-0 opacity-40" />
        {/* Animated glow blobs */}
        <div className="m2-hero-glow" />

        <div
          ref={heroR.ref}
          className={`relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:px-8 lg:py-28 m2-reveal ${heroR.visible ? "visible" : ""}`}
        >
          {/* ── Left: copy ── */}
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300 uppercase tracking-widest m2-reveal-d1">
              <Sparkles className="h-3 w-3 text-sky-400" />
              Personal Finance Manager
            </span>

            <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-white lg:text-6xl m2-reveal-d2">
              <span className="block text-2xl font-light text-slate-400 mb-2 lg:text-3xl">
                Toma el control de
              </span>
              <span className="block bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
                tus finanzas
              </span>
              <span className="block">con claridad.</span>
            </h1>

            <p className="max-w-lg text-base leading-relaxed text-slate-400 lg:text-lg m2-reveal-d3">
              Registra, analiza y optimiza tu dinero desde un único lugar.
              Cuentas, transacciones, presupuestos y metas — todo conectado.
            </p>

            <div className="flex flex-wrap items-center gap-3 m2-reveal-d3">
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

            <div className="flex items-center gap-2.5 text-sm text-slate-500 m2-reveal-d4">
              <div className="flex -space-x-2">
                {["bg-sky-400", "bg-emerald-400", "bg-violet-400"].map((c, i) => (
                  <div
                    key={i}
                    className={`h-7 w-7 rounded-full border-2 border-slate-950 ${c}`}
                  />
                ))}
              </div>
              <span>Pensado para estudiantes y profesionales</span>
            </div>
          </div>

          {/* ── Right: phone mockup ──
            TODO: replace <HeroMockup /> with:
            <img
              src="/images/hero-3d-render.png"
              alt="Balio app"
              className="w-64 drop-shadow-2xl lg:w-72 mx-auto"
            />
          ── */}
          <div className="flex justify-center lg:justify-end m2-reveal-d2">
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* ╔══════════════════════════════════════════════════════╗
          ║  MARQUEE TICKER                                      ║
          ╚══════════════════════════════════════════════════════╝ */}
      <div className="border-y border-slate-200 bg-white py-3">
        <div className="m2-ticker-wrap">
          <div className="m2-ticker-track select-none">
            {[...Array(2)].map((_, rep) => (
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
                    className="mx-5 text-sm font-medium text-slate-400 inline-flex items-center gap-2"
                  >
                    <span className="text-sky-400 text-base">·</span>
                    {item}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ╔══════════════════════════════════════════════════════╗
          ║  UNIFY — "Todo en un solo lugar"                     ║
          ╚══════════════════════════════════════════════════════╝ */}
      <section className="overflow-hidden bg-slate-50 py-24">
        <div
          ref={unifyR.ref}
          className={`mx-auto max-w-7xl px-6 lg:px-8 m2-reveal ${unifyR.visible ? "visible" : ""}`}
        >
          {/* Heading */}
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-black tracking-tight text-slate-900 lg:text-5xl">
              Todo unificado.{" "}
              <span className="bg-gradient-to-r from-sky-500 to-emerald-500 bg-clip-text text-transparent">
                Todo claro.
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-500">
              Cinco módulos interconectados para que tengas una visión completa
              de tu salud financiera, todo desde un solo lugar.
            </p>
          </div>

          {/* ── Snippet cards — horizontal scroll ── */}
          <div
            ref={snippetRef}
            className="m2-snippet-track flex gap-3 pb-4 mb-10"
          >
            {UNIFY_FEATURES.map((f) => (
              <button
                key={f.id}
                onClick={() => handleTabClick(f.id)}
                className={`m2-snippet-card shrink-0 w-36 h-52 rounded-2xl border border-white/5 bg-slate-900 overflow-hidden relative ${
                  activeTab === f.id
                    ? `ring-2 ${f.ringColor} scale-[1.05] opacity-100`
                    : "opacity-50 hover:opacity-75"
                }`}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-b ${f.bgClass}`}
                />
                <div className="relative p-3 h-full flex flex-col">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <f.icon className={`h-3.5 w-3.5 ${f.accentClass}`} />
                    <span className={`text-[11px] font-bold ${f.accentClass}`}>
                      {f.label}
                    </span>
                  </div>
                  <span className="text-[9px] text-white/30 font-mono mb-1">
                    {f.num}
                  </span>
                  <SnippetIllustration id={f.id} />
                </div>
              </button>
            ))}
          </div>

          {/* ── Tabs + content panel ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
            {/* Tab buttons */}
            <div className="flex flex-row gap-1.5 overflow-x-auto lg:flex-col lg:overflow-visible">
              {UNIFY_FEATURES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleTabClick(f.id)}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-left transition-all duration-200 ${
                    activeTab === f.id
                      ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                      : "text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-40 shrink-0 w-5">
                    {f.num}
                  </span>
                  <f.icon
                    className={`h-4 w-4 shrink-0 ${
                      activeTab === f.id ? f.accentClass : ""
                    }`}
                  />
                  <span className="text-sm font-semibold">{f.label}</span>
                </button>
              ))}
            </div>

            {/* Content panel */}
            <div
              key={activeFeature.id}
              className="m2-tab-panel rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
            >
              <div className="flex items-start gap-4 mb-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                  <activeFeature.icon
                    className={`h-5 w-5 ${activeFeature.accentClass}`}
                  />
                </div>
                <div>
                  <p className="font-mono text-xs text-slate-400">
                    {activeFeature.num}
                  </p>
                  <h3 className="text-xl font-black text-slate-900">
                    {activeFeature.title}
                  </h3>
                </div>
              </div>

              <p className="mb-6 text-base leading-relaxed text-slate-600">
                {activeFeature.desc}
              </p>

              <ul className="space-y-2.5 mb-6">
                {activeFeature.points.map((pt) => (
                  <li
                    key={pt}
                    className="flex items-center gap-2.5 text-sm text-slate-700"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <Check className="h-3 w-3 text-emerald-600" />
                    </span>
                    {pt}
                  </li>
                ))}
              </ul>

              <Link
                to={ROUTES.SIGNUP}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 transition hover:text-sky-700"
              >
                Explorar {activeFeature.label.toLowerCase()}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ╔══════════════════════════════════════════════════════╗
          ║  FEATURE 1 — Análisis                                ║
          ╚══════════════════════════════════════════════════════╝ */}
      <section className="bg-white py-24">
        <div
          ref={feat1R.ref}
          className={`mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-6 lg:grid-cols-2 lg:px-8 m2-reveal ${feat1R.visible ? "visible" : ""}`}
        >
          {/* Text */}
          <div className="flex flex-col gap-5">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600 ring-1 ring-sky-200">
              <BarChart2 className="h-3 w-3" /> Análisis
            </span>
            <h2 className="text-4xl font-black tracking-tight text-slate-900 lg:text-5xl">
              Datos que{" "}
              <span className="bg-gradient-to-r from-sky-500 to-cyan-400 bg-clip-text text-transparent">
                lo revelan todo.
              </span>
            </h2>
            <p className="max-w-md text-base leading-relaxed text-slate-600">
              Más allá de los números. Con Balio ves dónde va cada euro, qué
              meses gastas más y en qué categorías concentras tu dinero.
            </p>

            <ul className="space-y-3">
              {[
                "Gráfica de ingresos vs gastos mensual",
                "Distribución de gastos por categoría",
                "Filtros por fecha y cuenta",
                "Comparativa entre períodos",
              ].map((pt) => (
                <li
                  key={pt}
                  className="m2-stagger-item flex items-center gap-2.5 text-sm text-slate-700"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100">
                    <Check className="h-3 w-3 text-sky-600" />
                  </span>
                  {pt}
                </li>
              ))}
            </ul>

            <Link to={ROUTES.SIGNUP} className="btn-register mt-2 w-fit">
              <span className="btn-register-text">Ver análisis en acción</span>
            </Link>
          </div>

          {/* Visual
            TODO: replace this block with:
            <img
              src="/images/analysis-screenshot.png"
              alt="Pantalla de análisis de Balio"
              className="w-full rounded-[1.75rem] shadow-2xl"
            />
          */}
          <div className="m2-feature-visual bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="p-6">
              <p className="mb-4 text-xs font-semibold text-slate-400">
                Ingresos vs Gastos — últimos 4 meses
              </p>
              <div className="flex items-end gap-2 h-36 mb-4">
                {[
                  { income: 88, expense: 58, label: "Ene" },
                  { income: 78, expense: 68, label: "Feb" },
                  { income: 100, expense: 52, label: "Mar" },
                  { income: 92, expense: 62, label: "Abr" },
                ].map((bar) => (
                  <div
                    key={bar.label}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div className="w-full flex items-end gap-1 h-28">
                      <div
                        className="flex-1 rounded-t-lg bg-gradient-to-t from-sky-600 to-sky-400"
                        style={{ height: `${bar.income}%` }}
                      />
                      <div
                        className="flex-1 rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400"
                        style={{ height: `${bar.expense}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500">{bar.label}</span>
                  </div>
                ))}
              </div>

              <div className="mb-4 flex gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sky-400" /> Ingresos
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Gastos
                </span>
              </div>

              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-[10px] font-semibold text-slate-400 mb-2">
                  Gastos del mes por categoría
                </p>
                <div className="flex gap-1 items-end h-12">
                  {[
                    { label: "Alim.", h: 65, color: "bg-sky-400/70" },
                    { label: "Ocio", h: 38, color: "bg-violet-400/70" },
                    { label: "Trans.", h: 28, color: "bg-emerald-400/70" },
                    { label: "Hogar", h: 50, color: "bg-amber-400/70" },
                    { label: "Otros", h: 20, color: "bg-slate-400/70" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      <div
                        className={`w-full rounded-t ${s.color}`}
                        style={{ height: `${s.h}%` }}
                      />
                      <span className="text-[8px] text-slate-500">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ╔══════════════════════════════════════════════════════╗
          ║  FEATURE 2 — Presupuestos & Metas  (dark)           ║
          ╚══════════════════════════════════════════════════════╝ */}
      <section className="bg-slate-950 py-24">
        <div
          ref={feat2R.ref}
          className={`mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-6 lg:grid-cols-2 lg:px-8 m2-reveal ${feat2R.visible ? "visible" : ""}`}
        >
          {/* Visual — left on desktop
            TODO: replace with:
            <img
              src="/images/budgets-screenshot.png"
              alt="Pantalla de presupuestos"
              className="w-full rounded-[1.75rem] shadow-2xl order-2 lg:order-1"
            />
          */}
          <div className="m2-feature-visual order-2 bg-gradient-to-br from-slate-800 to-slate-900 lg:order-1">
            <div className="p-6 space-y-4">
              <p className="text-xs font-semibold text-slate-400">
                Presupuesto mensual
              </p>
              {[
                { name: "Alimentación", pct: 72, color: "bg-sky-400" },
                { name: "Ocio", pct: 88, color: "bg-rose-400" },
                { name: "Transporte", pct: 40, color: "bg-emerald-400" },
                { name: "Hogar", pct: 54, color: "bg-violet-400" },
              ].map((b) => (
                <div key={b.name}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-medium text-slate-300">{b.name}</span>
                    <span
                      className={
                        b.pct > 80
                          ? "font-bold text-rose-400"
                          : "text-slate-400"
                      }
                    >
                      {b.pct}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${b.color}`}
                      style={{ width: `${b.pct}%` }}
                    />
                  </div>
                </div>
              ))}

              <div className="border-t border-white/10 pt-4">
                <p className="mb-2 text-xs font-semibold text-slate-400">
                  Metas activas
                </p>
                {[
                  { name: "Viaje a Japón", pct: 68 },
                  { name: "Fondo de emergencia", pct: 45 },
                ].map((g) => (
                  <div key={g.name} className="mb-2 flex items-center gap-2">
                    <Target className="h-3 w-3 shrink-0 text-amber-400" />
                    <span className="flex-1 text-[11px] text-slate-300">
                      {g.name}
                    </span>
                    <span className="text-[11px] font-bold text-amber-400">
                      {g.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="flex flex-col gap-5 order-1 lg:order-2">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300 ring-1 ring-white/10">
              <ChartPie className="h-3 w-3 text-rose-400" /> Presupuestos &amp;
              Metas
            </span>
            <h2 className="text-4xl font-black tracking-tight text-white lg:text-5xl">
              Gasta con{" "}
              <span className="bg-gradient-to-r from-rose-400 to-amber-400 bg-clip-text text-transparent">
                intención.
              </span>
            </h2>
            <p className="max-w-md text-base leading-relaxed text-slate-400">
              Pon límites a tu gasto por categoría y persigue tus metas de
              ahorro con barras de progreso visuales. Tú decides cuánto, cuándo
              y en qué.
            </p>

            <ul className="space-y-3">
              {[
                "Presupuestos por categoría con alertas visuales",
                "Barra de progreso en tiempo real",
                "Metas con fecha objetivo y seguimiento",
                "Múltiples objetivos activos",
              ].map((pt) => (
                <li
                  key={pt}
                  className="m2-stagger-item flex items-center gap-2.5 text-sm text-slate-300"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <Check className="h-3 w-3 text-emerald-400" />
                  </span>
                  {pt}
                </li>
              ))}
            </ul>

            <Link to={ROUTES.SIGNUP} className="btn-register mt-2 w-fit">
              <span className="btn-register-text">Crear mi presupuesto</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ╔══════════════════════════════════════════════════════╗
          ║  FEATURE 3 — Cuentas & Transacciones (light)        ║
          ╚══════════════════════════════════════════════════════╝ */}
      <section className="bg-slate-50 py-24">
        <div
          ref={feat3R.ref}
          className={`mx-auto max-w-7xl px-6 lg:px-8 m2-reveal ${feat3R.visible ? "visible" : ""}`}
        >
          <div className="mb-12 max-w-xl">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-600 ring-1 ring-violet-200 mb-4">
              <ArrowLeftRight className="h-3 w-3" /> Cuentas y Transacciones
            </span>
            <h2 className="text-4xl font-black tracking-tight text-slate-900">
              Tu dinero,{" "}
              <span className="bg-gradient-to-r from-violet-500 to-sky-500 bg-clip-text text-transparent">
                cada movimiento.
              </span>
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1 — Cuentas */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:-translate-y-1 transition-transform duration-300">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="mb-2 text-lg font-black text-slate-900">
                Múltiples cuentas
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Efectivo, banco, ahorro. Todas agrupadas con su balance
                actualizado. Nunca pierdas la visión global.
              </p>
            </div>

            {/* Card 2 — Transacciones */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:-translate-y-1 transition-transform duration-300">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                <ArrowLeftRight className="h-5 w-5 text-violet-600" />
              </div>
              <h3 className="mb-2 text-lg font-black text-slate-900">
                Registro completo
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Ingresos y gastos con categorías personalizadas. Filtros, búsqueda
                y toda la historia de tus movimientos.
              </p>
            </div>

            {/* Card 3 — Programadas */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:-translate-y-1 transition-transform duration-300">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
                <TrendingUp className="h-5 w-5 text-sky-600" />
              </div>
              <h3 className="mb-2 text-lg font-black text-slate-900">
                Automáticamente
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Programa transacciones recurrentes — suscripciones, nóminas —
                y deja que Balio las registre por ti.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ╔══════════════════════════════════════════════════════╗
          ║  ABOUT — condensed                                   ║
          ╚══════════════════════════════════════════════════════╝ */}
      <section className="border-t border-slate-200 bg-white py-24">
        <div
          ref={aboutR.ref}
          className={`mx-auto max-w-7xl px-6 lg:px-8 m2-reveal ${aboutR.visible ? "visible" : ""}`}
        >
          <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            {/* Text */}
            <div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-500 mb-5">
                <GraduationCap className="h-3 w-3" /> Proyecto académico
              </span>
              <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-4 lg:text-5xl">
                Hecho con{" "}
                <span className="bg-gradient-to-r from-sky-500 to-emerald-500 bg-clip-text text-transparent">
                  propósito.
                </span>
              </h2>
              <p className="max-w-lg text-base leading-relaxed text-slate-600 mb-6">
                Balio nació como un proyecto de fin de grado con el objetivo de
                crear una aplicación de finanzas personales completa, segura y
                moderna. Cada módulo está pensado para que cualquier persona
                pueda entender y controlar su dinero.
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
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

            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Módulos",
                  value: "5",
                  sub: "interconectados",
                  from: "from-sky-50",
                  to: "to-cyan-50",
                  accent: "text-sky-600",
                },
                {
                  label: "Seguridad",
                  value: "JWT",
                  sub: "refresh token",
                  from: "from-emerald-50",
                  to: "to-green-50",
                  accent: "text-emerald-600",
                },
                {
                  label: "Frontend",
                  value: "React",
                  sub: "TypeScript · Vite",
                  from: "from-violet-50",
                  to: "to-purple-50",
                  accent: "text-violet-600",
                },
                {
                  label: "Backend",
                  value: "Spring",
                  sub: "Boot · PostgreSQL",
                  from: "from-amber-50",
                  to: "to-orange-50",
                  accent: "text-amber-600",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`rounded-2xl bg-gradient-to-br ${s.from} ${s.to} border border-slate-100 p-5`}
                >
                  <p className="mb-1 text-xs font-medium text-slate-400">
                    {s.label}
                  </p>
                  <p className={`text-2xl font-black ${s.accent}`}>{s.value}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ╔══════════════════════════════════════════════════════╗
          ║  CTA                                                 ║
          ╚══════════════════════════════════════════════════════╝ */}
      <section className="relative overflow-hidden bg-slate-950 py-24 text-center">
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
            Únete y empieza a entender tus finanzas en minutos. Sin tarjeta de
            crédito.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to={ROUTES.SIGNUP} className="btn-register">
              <span className="btn-register-text">Crear cuenta gratis</span>
            </Link>
            <Link
              to={ROUTES.LOGIN}
              className="btn-login-hover !border-white/20 !text-white/70 hover:!border-white/40 hover:!text-white"
            >
              Ya tengo cuenta{" "}
              <ArrowRight className="arrow-icon h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
