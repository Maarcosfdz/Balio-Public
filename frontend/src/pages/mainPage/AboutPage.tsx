import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BanknoteArrowDown,
  ChartPie,
  Database,
  GraduationCap,
  Github,
  Goal,
  Landmark,
  Linkedin,
  ServerCog,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Footer from "@/components/layout/footer";
import PublicHeader from "@/components/layout/PublicHeader";
import { ROUTES } from "@/config/routes";

const technologies = [
  "React 19",
  "TypeScript",
  "Vite",
  "Spring Boot",
  "PostgreSQL",
  "JWT + refresh token",
  "i18next",
  "Docker Compose",
];

const architectureHighlights = [
  {
    icon: ServerCog,
    titleKey: "about.hero.architecture.items.technical.title",
    descriptionKey: "about.hero.architecture.items.technical.description",
  },
  {
    icon: ShieldCheck,
    titleKey: "about.hero.architecture.items.security.title",
    descriptionKey: "about.hero.architecture.items.security.description",
  },
  {
    icon: Database,
    titleKey: "about.hero.architecture.items.persistence.title",
    descriptionKey: "about.hero.architecture.items.persistence.description",
  },
] as const;

const originParagraphKeys = [
  "about.origin.paragraph1",
  "about.origin.paragraph2",
  "about.origin.paragraph3",
] as const;

const objectiveParagraphKeys = [
  "about.objective.paragraph1",
  "about.objective.paragraph2",
  "about.objective.paragraph3",
] as const;

const featureCards = [
  {
    icon: BanknoteArrowDown,
    titleKey: "about.features.items.transactions.title",
    descriptionKey: "about.features.items.transactions.description",
  },
  {
    icon: Landmark,
    titleKey: "about.features.items.accounts.title",
    descriptionKey: "about.features.items.accounts.description",
  },
  {
    icon: WalletCards,
    titleKey: "about.features.items.categories.title",
    descriptionKey: "about.features.items.categories.description",
  },
  {
    icon: ChartPie,
    titleKey: "about.features.items.budgets.title",
    descriptionKey: "about.features.items.budgets.description",
  },
  {
    icon: Goal,
    titleKey: "about.features.items.goals.title",
    descriptionKey: "about.features.items.goals.description",
  },
] as const;

function AboutIllustration() {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-slate-950/20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.2),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.18),_transparent_35%)]" />
      <div className="relative grid gap-4">
        <div className="grid grid-cols-[1.2fr_0.8fr] gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="mb-3 flex items-center gap-2 text-sky-200">
              <ServerCog className="h-4 w-4" />
              <span className="text-sm font-semibold">{t("about.hero.illustration.frontendBackend")}</span>
            </div>
            <div className="space-y-3">
              <div className="h-3 w-24 rounded-full bg-white/10" />
              <div className="h-16 rounded-2xl bg-sky-400/20" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-10 rounded-xl bg-emerald-400/20" />
                <div className="h-10 rounded-xl bg-white/10" />
                <div className="h-10 rounded-xl bg-white/10" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-emerald-200">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-sm font-semibold">{t("about.hero.illustration.secureSession")}</span>
              </div>
              <div className="h-14 rounded-xl bg-emerald-400/20" />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-amber-100">
                <ChartPie className="h-4 w-4" />
                <span className="text-sm font-semibold">{t("about.hero.illustration.visualization")}</span>
              </div>
              <div className="flex items-end gap-2 pt-3">
                {[32, 48, 26, 60, 40].map((height, index) => (
                  <div
                    key={index}
                    className="w-full rounded-t-full bg-white/20"
                    style={{ height }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center gap-2 text-white/80">
            <Database className="h-4 w-4" />
            <span className="text-sm font-semibold">{t("about.hero.illustration.stackTitle")}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {technologies.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/85"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_28%,#f8fafc_100%)]">
      <PublicHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_32%)]" />
          <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
            <AboutIllustration />

            <div className="flex flex-col justify-center gap-6">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200/90">
                <GraduationCap className="h-3.5 w-3.5" />
                {t("about.hero.badge")}
              </span>

              <div>
                <h1 className="max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">
                  {t("about.hero.title")}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
                  {t("about.hero.description")}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {architectureHighlights.map(({ icon: Icon, titleKey, descriptionKey }) => (
                  <div key={titleKey} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                    <Icon className="h-5 w-5 text-sky-300" />
                    <h2 className="mt-3 text-sm font-semibold text-white">{t(titleKey)}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{t(descriptionKey)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)]">
              <span className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                {t("about.project.eyebrow")}
              </span>
              <p className="mt-4 text-lg leading-8 text-slate-700">
                {t("about.project.lead")}
              </p>
              <p className="mt-4 text-base leading-8 text-slate-600">
                {t("about.project.body")}
              </p>
            </article>

            <aside className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.3)]">
              <span className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                {t("about.technical.eyebrow")}
              </span>
              <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
                <p>{t("about.technical.paragraph1")}</p>
                <p>{t("about.technical.paragraph2")}</p>
              </div>
            </aside>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-6 px-6 pb-8 lg:grid-cols-2 lg:px-8">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">{t("about.origin.title")}</h2>
            <div className="mt-6 space-y-5 text-base leading-8 text-slate-600">
              {originParagraphKeys.map((paragraphKey) => (
                <p key={paragraphKey}>{t(paragraphKey)}</p>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">{t("about.objective.title")}</h2>
            <div className="mt-6 space-y-5 text-base leading-8 text-slate-600">
              {objectiveParagraphKeys.map((paragraphKey) => (
                <p key={paragraphKey}>{t(paragraphKey)}</p>
              ))}
            </div>
          </article>
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 py-14 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <h2 className="text-3xl font-black tracking-tight text-slate-900">{t("about.features.title")}</h2>
            <p className="mt-3 text-base leading-8 text-slate-600">
              {t("about.features.description")}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {featureCards.map(({ icon: Icon, titleKey, descriptionKey }) => (
              <article
                key={titleKey}
                className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)] transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">{t(titleKey)}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{t(descriptionKey)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 pb-16 lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_42%,#eef6ff_100%)] p-8 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)] lg:p-10">
            <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">{t("about.usefulness.title")}</h2>
                <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
                  {t("about.usefulness.description")}
                </p>
              </div>

              <div className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 bg-white/90 p-6 backdrop-blur-sm">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {t("about.links.title")}
                </h3>
                <a
                  href="https://www.linkedin.com/in/marcos-romay-82b16036a/"
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
                >
                  <span className="inline-flex items-center gap-3">
                    <Linkedin className="h-4 w-4 text-sky-600" />
                    LinkedIn
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
                <a
                  href="https://github.com/Maarcosfdz"
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"
                >
                  <span className="inline-flex items-center gap-3">
                    <Github className="h-4 w-4 text-emerald-700" />
                    GitHub
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
                <Link
                  to={ROUTES.HOME}
                  className="btn-login-hover mt-2 inline-flex w-fit items-center gap-2 self-start !rounded-xl !px-4 !py-2.5 !text-sm !font-semibold"
                >
                  {t("about.links.backHome")}
                  <ArrowRight className="arrow-icon h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}