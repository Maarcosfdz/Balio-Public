import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BanknoteArrowDown,
  ChartPie,
  Code2,
  Database,
  GraduationCap,
  Github,
  Goal,
  Landmark,
  Layers,
  Linkedin,
  Server,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Footer from "@/components/layout/footer";
import PublicHeader from "@/components/layout/PublicHeader";
import { ROUTES } from "@/config/routes";
import { gradientButtonClass, gradientButtonIconClass } from "@/components/ui/gradient-button";
import "@/styles/pages/about.css";

// ── Scroll-reveal hook ──────────────────────────────────────────
function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── Static data ─────────────────────────────────────────────────
const FRONTEND_STACK = ["React 19", "TypeScript", "Vite", "Tailwind CSS", "i18next", "React Router"];
const BACKEND_STACK  = ["Spring Boot", "Java", "JWT", "Refresh Tokens", "REST API"];
const INFRA_STACK    = ["PostgreSQL", "Docker Compose", "JPA / Hibernate"];

const STAT_CARDS = [
  { value: "5", labelKey: "about.stats.modules",   floatClass: "ab-float-1", accent: "text-sky-400",    bg: "bg-sky-500/10",     border: "border-sky-500/25" },
  { value: "JWT", labelKey: "about.stats.auth",    floatClass: "ab-float-2", accent: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  { value: "SPA", labelKey: "about.stats.stack",   floatClass: "ab-float-3", accent: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/25" },
  { value: "3",   labelKey: "about.stats.i18n",    floatClass: "ab-float-4", accent: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/25" },
] as const;

const ARCH_CARDS = [
  {
    icon: Code2,
    titleKey: "about.architecture.fe.title",
    points: ["about.architecture.fe.p1", "about.architecture.fe.p2", "about.architecture.fe.p3"] as const,
    accent: "text-sky-400",
    iconBg: "bg-sky-500/10",
    border: "border-sky-500/20",
    hoverBorder: "hover:border-sky-400/40",
  },
  {
    icon: Server,
    titleKey: "about.architecture.api.title",
    points: ["about.architecture.api.p1", "about.architecture.api.p2", "about.architecture.api.p3"] as const,
    accent: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    hoverBorder: "hover:border-emerald-400/40",
  },
  {
    icon: Database,
    titleKey: "about.architecture.db.title",
    points: ["about.architecture.db.p1", "about.architecture.db.p2", "about.architecture.db.p3"] as const,
    accent: "text-violet-400",
    iconBg: "bg-violet-500/10",
    border: "border-violet-500/20",
    hoverBorder: "hover:border-violet-400/40",
  },
] as const;

const FEATURE_CARDS = [
  { icon: BanknoteArrowDown, titleKey: "about.features.items.transactions.title", descKey: "about.features.items.transactions.description", accent: "text-sky-600",    iconBg: "bg-sky-50",     border: "border-sky-100" },
  { icon: Landmark,          titleKey: "about.features.items.accounts.title",     descKey: "about.features.items.accounts.description",     accent: "text-emerald-600", iconBg: "bg-emerald-50", border: "border-emerald-100" },
  { icon: WalletCards,       titleKey: "about.features.items.categories.title",   descKey: "about.features.items.categories.description",   accent: "text-violet-600",  iconBg: "bg-violet-50",  border: "border-violet-100" },
  { icon: ChartPie,          titleKey: "about.features.items.budgets.title",      descKey: "about.features.items.budgets.description",      accent: "text-rose-600",    iconBg: "bg-rose-50",    border: "border-rose-100" },
  { icon: Goal,              titleKey: "about.features.items.goals.title",        descKey: "about.features.items.goals.description",        accent: "text-amber-600",   iconBg: "bg-amber-50",   border: "border-amber-100" },
] as const;

// ══════════════════════════════════════════════════════════════
export default function AboutPage() {
  const { t } = useTranslation();

  const heroReveal       = useReveal(0.05);
  const authorReveal     = useReveal(0.1);
  const stackReveal      = useReveal(0.08);
  const archReveal       = useReveal(0.08);
  const originReveal     = useReveal(0.08);
  const featuresReveal   = useReveal(0.05);
  const ctaReveal        = useReveal(0.1);

  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_30%,#f8fafc_100%)]">
      <PublicHeader />

      <main className="flex-1">

        {/* ════════════════════════════════════════════════════
         * 1. HERO — dark, centered, animated orbs
         * ════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-slate-950 text-white">
          {/* Grid pattern */}
          <div className="ab-grid-bg pointer-events-none absolute inset-0" />

          {/* Gradient orbs */}
          <div className="ab-orb   h-[560px] w-[560px] -top-32 -left-28  bg-sky-500/20"     />
          <div className="ab-orb ab-orb-2 h-[480px] w-[480px] -bottom-24 -right-20 bg-emerald-500/16" />
          <div className="ab-orb ab-orb-3 h-[320px] w-[320px]  top-1/2 left-1/2   bg-violet-500/10" style={{ transform: "translate(-50%, -60%)" }} />

          <div
            ref={heroReveal.ref}
            className={`relative mx-auto max-w-4xl px-6 py-24 text-center lg:py-36`}
          >
            {/* Badge */}
            <span className="ab-hero-badge inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/90">
              <GraduationCap className="h-3.5 w-3.5 text-sky-400" />
              {t("about.hero.badge")}
            </span>

            {/* Title */}
            <h1 className="ab-hero-title mt-8 text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
              {t("about.hero.titleLine1")}{" "}
              <span className="ab-gradient-text">{t("about.hero.titleHighlight")}</span>
            </h1>

            {/* Description */}
            <p className="ab-hero-desc mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
              {t("about.hero.description")}
            </p>

            {/* Stat cards */}
            <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {STAT_CARDS.map(({ value, labelKey, floatClass, accent, bg, border }) => (
                <div
                  key={labelKey}
                  className={`ab-stat-card ${floatClass} rounded-2xl border ${border} ${bg} p-5 backdrop-blur-sm`}
                >
                  <span className={`block text-3xl font-black tracking-tight ${accent}`}>{value}</span>
                  <span className="mt-1 block text-sm font-medium text-slate-400">{t(labelKey)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
         * 2. AUTHOR
         * ════════════════════════════════════════════════════ */}
        <section className="border-b border-slate-100 bg-white py-20">
          <div
            ref={authorReveal.ref}
            className={`ab-reveal ${authorReveal.visible ? "ab-visible" : ""} mx-auto max-w-5xl px-6 lg:px-8`}
          >
            <div className="flex flex-col items-center gap-8 rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc,#eef6ff)] p-8 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.2)] sm:flex-row sm:p-10">
              {/* Avatar */}
              <div className="ab-avatar ab-stagger ab-sd1 flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full border-2 border-sky-300/40 bg-gradient-to-br from-sky-500 to-indigo-600 text-xl font-black text-white shadow-lg">
                MR
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <span className="ab-stagger ab-sd2 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-sky-500">
                  {t("about.author.badge")}
                </span>
                <h2 className="ab-stagger ab-sd3 mt-1 text-2xl font-black tracking-tight text-slate-900">
                  {t("about.author.name")}
                </h2>
                <p className="ab-stagger ab-sd4 mt-1 text-sm text-slate-500">
                  {t("about.author.role")} · {t("about.author.university")}
                </p>
                <p className="ab-stagger ab-sd5 mt-1 text-sm font-medium text-slate-400">
                  {t("about.author.program")}
                </p>
                <p className="ab-stagger ab-sd6 mt-4 max-w-xl text-sm leading-7 text-slate-600">
                  {t("about.author.description")}
                </p>
              </div>

              {/* Social links */}
              <div className="ab-stagger ab-sd7 flex flex-shrink-0 flex-col gap-3">
                <a
                  href="https://www.linkedin.com/in/marcos-romay-82b16036a/"
                  target="_blank"
                  rel="noreferrer"
                  className="ab-link-row group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
                >
                  <Linkedin className="h-4 w-4 text-sky-600" />
                  LinkedIn
                  <ArrowRight className="ab-link-arrow ml-1 h-3.5 w-3.5 text-slate-400" />
                </a>
                <a
                  href="https://github.com/Maarcosfdz"
                  target="_blank"
                  rel="noreferrer"
                  className="ab-link-row group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                  <ArrowRight className="ab-link-arrow ml-1 h-3.5 w-3.5 text-slate-400" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
         * 3. TECH STACK
         * ════════════════════════════════════════════════════ */}
        <section className="bg-slate-50 py-20">
          <div
            ref={stackReveal.ref}
            className={`ab-reveal ${stackReveal.visible ? "ab-visible" : ""} mx-auto max-w-5xl px-6 lg:px-8`}
          >
            {/* Heading */}
            <div className="mb-12 text-center">
              <span className="ab-stagger ab-sd1 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {t("about.stack.title")}
              </span>
              <p className="ab-stagger ab-sd2 mt-2 text-sm leading-7 text-slate-500">
                {t("about.stack.subtitle")}
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {/* Frontend */}
              <div className="ab-stagger ab-sd3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100">
                    <Code2 className="h-4 w-4 text-sky-600" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{t("about.stack.frontendLabel")}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {FRONTEND_STACK.map((tech) => (
                    <span
                      key={tech}
                      className="ab-tech-badge cursor-default rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Backend */}
              <div className="ab-stagger ab-sd4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100">
                    <Server className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{t("about.stack.backendLabel")}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {BACKEND_STACK.map((tech) => (
                    <span
                      key={tech}
                      className="ab-tech-badge cursor-default rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Infrastructure */}
              <div className="ab-stagger ab-sd5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100">
                    <Layers className="h-4 w-4 text-violet-600" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{t("about.stack.infraLabel")}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {INFRA_STACK.map((tech) => (
                    <span
                      key={tech}
                      className="ab-tech-badge cursor-default rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
         * 4. ARCHITECTURE
         * ════════════════════════════════════════════════════ */}
        <section className="bg-white py-20">
          <div
            ref={archReveal.ref}
            className={`ab-reveal ${archReveal.visible ? "ab-visible" : ""} mx-auto max-w-5xl px-6 lg:px-8`}
          >
            <div className="mb-12">
              <span className="ab-stagger ab-sd1 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {t("about.architecture.title")}
              </span>
              <p className="ab-stagger ab-sd2 mt-2 max-w-xl text-sm leading-7 text-slate-500">
                {t("about.architecture.subtitle")}
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              {ARCH_CARDS.map(({ icon: Icon, titleKey, points, accent, iconBg, border, hoverBorder }) => (
                <div
                  key={titleKey}
                  className={`ab-arch-card ab-stagger rounded-2xl border ${border} ${hoverBorder} bg-white p-6 shadow-sm`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${iconBg}`}>
                    <Icon className={`h-5 w-5 ${accent}`} />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{t(titleKey)}</h3>
                  <ul className="mt-3 space-y-2">
                    {points.map((pk) => (
                      <li key={pk} className="flex items-start gap-2 text-sm leading-6 text-slate-600">
                        <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${accent.replace("text-", "bg-")}`} />
                        {t(pk)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
         * 5. ORIGIN & OBJECTIVE
         * ════════════════════════════════════════════════════ */}
        <section className="border-y border-slate-100 bg-slate-50 py-20">
          <div
            ref={originReveal.ref}
            className={`ab-reveal ${originReveal.visible ? "ab-visible" : ""} mx-auto max-w-5xl px-6 lg:px-8`}
          >
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Origin */}
              <article className="ab-stagger ab-sd1 rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-[0_16px_60px_-32px_rgba(15,23,42,0.2)]">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-500">
                  {t("about.origin.title")}
                </span>
                <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
                  <p>{t("about.origin.paragraph1")}</p>
                  <p>{t("about.origin.paragraph2")}</p>
                  <p>{t("about.origin.paragraph3")}</p>
                </div>
              </article>

              {/* Objective */}
              <article className="ab-stagger ab-sd2 rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-[0_16px_60px_-32px_rgba(15,23,42,0.2)]">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-500">
                  {t("about.objective.title")}
                </span>
                <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
                  <p>{t("about.objective.paragraph1")}</p>
                  <p>{t("about.objective.paragraph2")}</p>
                  <p>{t("about.objective.paragraph3")}</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
         * 6. FEATURES
         * ════════════════════════════════════════════════════ */}
        <section className="bg-white py-20">
          <div
            ref={featuresReveal.ref}
            className={`ab-reveal ${featuresReveal.visible ? "ab-visible" : ""} mx-auto max-w-5xl px-6 lg:px-8`}
          >
            <div className="mb-12">
              <span className="ab-stagger ab-sd1 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {t("about.features.title")}
              </span>
              <p className="ab-stagger ab-sd2 mt-2 max-w-xl text-sm leading-7 text-slate-500">
                {t("about.features.description")}
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
              {FEATURE_CARDS.map(({ icon: Icon, titleKey, descKey, accent, iconBg, border }, i) => (
                <article
                  key={titleKey}
                  className={`ab-feature-card ab-stagger ab-sd${i + 1} rounded-[1.75rem] border ${border} bg-white p-6 shadow-[0_12px_48px_-24px_rgba(15,23,42,0.22)]`}
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconBg}`}>
                    <Icon className={`h-5 w-5 ${accent}`} />
                  </div>
                  <h3 className="mt-5 text-sm font-bold text-slate-900">{t(titleKey)}</h3>
                  <p className="mt-2 text-xs leading-6 text-slate-500">{t(descKey)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
         * 7. CTA — dark
         * ════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-slate-950 py-24 text-white">
          {/* Orbs */}
          <div className="ab-orb h-[400px] w-[400px] -top-20 -right-20 bg-sky-500/15" />
          <div className="ab-orb ab-orb-2 h-[300px] w-[300px] -bottom-16 -left-16 bg-emerald-500/12" />
          <div className="ab-grid-bg pointer-events-none absolute inset-0 opacity-50" />

          <div
            ref={ctaReveal.ref}
            className={`ab-reveal ${ctaReveal.visible ? "ab-visible" : ""} relative mx-auto max-w-3xl px-6 text-center lg:px-8`}
          >
            <ShieldCheck className="ab-stagger ab-sd1 mx-auto h-10 w-10 text-sky-400" />
            <h2 className="ab-stagger ab-sd2 mt-6 text-3xl font-black tracking-tight sm:text-4xl">
              {t("about.cta.title")}
            </h2>
            <p className="ab-stagger ab-sd3 mx-auto mt-4 max-w-lg text-base leading-8 text-slate-400">
              {t("about.cta.description")}
            </p>

            <div className="ab-stagger ab-sd4 mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                to={ROUTES.HOME}
                className={gradientButtonClass({
                  iconVariant: "other",
                  className: "rounded-xl px-6 py-3 text-sm font-semibold",
                })}
              >
                {t("about.cta.button")}
                <ArrowRight className={gradientButtonIconClass("h-4 w-4")} />
              </Link>

              <a
                href="https://www.linkedin.com/in/marcos-romay-82b16036a/"
                target="_blank"
                rel="noreferrer"
                className="ab-link-row flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-sky-500/10"
              >
                <Linkedin className="h-4 w-4 text-sky-400" />
                LinkedIn
                <ArrowRight className="ab-link-arrow h-3.5 w-3.5 text-white/40" />
              </a>

              <a
                href="https://github.com/Maarcosfdz"
                target="_blank"
                rel="noreferrer"
                className="ab-link-row flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
              >
                <Github className="h-4 w-4" />
                GitHub
                <ArrowRight className="ab-link-arrow h-3.5 w-3.5 text-white/40" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
