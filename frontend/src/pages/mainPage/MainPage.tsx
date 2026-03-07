import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, ArrowLeftRight, Wallet, BarChart2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import Footer from "@/components/layout/footer";
import PublicHeader from "@/components/layout/PublicHeader";

const features = [
  {
    icon: ArrowLeftRight,
    titleKey: "main.feat1Title",
    descKey: "main.feat1Desc",
    bg: "bg-sky-50",
    iconColor: "text-sky-500",
    ring: "ring-1 ring-sky-500/20",
  },
  {
    icon: Wallet,
    titleKey: "main.feat2Title",
    descKey: "main.feat2Desc",
    bg: "bg-red-50",
    iconColor: "text-red-500",
    ring: "ring-1 ring-red-500/20",
  },
  {
    icon: Target,
    titleKey: "main.feat3Title",
    descKey: "main.feat3Desc",
    bg: "bg-emerald-50",
    iconColor: "text-emerald-500",
    ring: "ring-1 ring-emerald-500/20",
  },
  {
    icon: BarChart2,
    titleKey: "main.feat4Title",
    descKey: "main.feat4Desc",
    bg: "bg-amber-50",
    iconColor: "text-amber-500",
    ring: "ring-1 ring-amber-500/20",
  },
] as const;

function DashboardIllustration() {
  return (
    <div className="w-full max-w-[40rem] rounded-2xl border bg-card p-5 shadow-2xl lg:w-[520px]">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-3 w-24 rounded-full bg-muted" />
        <div className="h-6 w-6 rounded-full bg-primary/20" />
      </div>

      <div className="mb-4 rounded-xl bg-primary/10 p-4">
        <div className="mb-1 h-2 w-16 rounded-full bg-muted" />
        <div className="h-7 w-32 rounded-full bg-sky-200" />
      </div>

      {["w-3/4", "w-2/3", "w-4/5"].map((w, i) => (
        <div key={i} className="mb-2 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-muted" />
          <div className={`h-2.5 rounded-full bg-muted ${w}`} />
          <div className="ml-auto h-2.5 w-12 rounded-full bg-green-200" />
        </div>
      ))}

      <div className="mt-4 flex flex-col gap-3 px-2 sm:flex-row sm:items-end sm:gap-6">
        {[0, 1].map((_, chartIdx) => (
          <div key={chartIdx} className="flex items-end gap-2">
            {[40, 65, 45, 80, 55, 70, 90].map((h, i) => (
              <div
                key={i}
                className="flex-none rounded-t-sm bg-primary/40"
                style={{ height: `${h}px`, width: "22px" }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MainPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />

      <div className="relative w-full overflow-hidden bg-muted/40">
        <section className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-0 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:px-3">
          <div className="flex flex-col gap-5 lg:col-span-7 lg:-ml-12">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              {t("main.badge")}
            </span>

            <h1 className="max-w-3xl text-5xl font-extrabold leading-tight tracking-tight lg:text-6xl">
              <span className="block">{t("main.titleLine1")}</span>
              <span className="block whitespace-nowrap bg-gradient-to-r from-sky-500 from-0% via-emerald-400 via-70% to-emerald-600 bg-clip-text text-transparent">
                {t("main.titleHighlight")}
              </span>
              <span className="block">{t("main.titleLine2")}</span>
            </h1>

            <p className="max-w-xl text-base text-muted-foreground lg:text-lg">
              {t("main.subtitle")}
            </p>

            <div className="flex gap-3">
              <Link to={ROUTES.SIGNUP} className="btn-register">
                <span className="btn-register-text">{t("auth.signUp")}</span>
              </Link>
              <Link to={ROUTES.LOGIN} className="btn-login-hover">
                {t("auth.login")}
                <ArrowRight className="arrow-icon h-4 w-4" />
              </Link>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {["bg-green-400", "bg-cyan-400", "bg-blue-400"].map((c, i) => (
                  <div key={i} className={`h-7 w-7 rounded-full border-2 border-background ${c}`} />
                ))}
              </div>
              <span>{t("main.trusted")}</span>
            </div>
          </div>

          <div className="relative hidden lg:col-span-5 lg:flex lg:items-center lg:justify-center">
            <div className="pointer-events-none absolute -left-10 bottom-0 h-72 w-72 rounded-full bg-sky-400/30 blur-3xl" />
            <div className="relative z-10">
              <DashboardIllustration />
            </div>
          </div>
        </section>
      </div>

      <section className="bg-white px-8 py-20 lg:px-16">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="mb-3 text-3xl font-bold">{t("main.featuresTitle")}</h2>
          <p className="text-muted-foreground">{t("main.featuresSubtitle")}</p>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, titleKey, descKey, bg, iconColor, ring }) => (
            <div key={titleKey} className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-sm">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${ring}`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <h3 className="font-semibold">{t(titleKey)}</h3>
              <p className="text-sm text-muted-foreground">{t(descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 bg-foreground px-8 py-20 text-center text-background lg:px-16">
        <h2 className="mb-3 text-4xl font-extrabold">{t("main.ctaTitle")}</h2>
        <p className="mx-auto mb-8 max-w-md text-background/70">{t("main.ctaSubtitle")}</p>
        <Button
          size="lg"
          variant="outline"
          className="border border-background bg-background text-foreground transition-all duration-700 hover:border-background hover:bg-transparent hover:text-background"
          asChild
        >
          <Link to={ROUTES.SIGNUP}>{t("main.ctaButton")}</Link>
        </Button>
      </section>

      <div className="my-4" />
      <Footer />
    </div>
  );
}
