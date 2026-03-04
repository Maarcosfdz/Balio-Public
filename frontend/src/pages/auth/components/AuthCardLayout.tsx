import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import BalioBrand from "@/components/branding/BalioBrand";
import { ROUTES } from "@/config/routes";
import MainPage from "@/pages/mainPage/MainPage";

interface AuthCardLayoutProps {
  title: string;
  subtitle: string;
  closeLabel: string;
  children: ReactNode;
}

export default function AuthCardLayout({
  title,
  subtitle,
  closeLabel,
  children,
}: AuthCardLayoutProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      {/* MainPage real difuminada como fondo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="blur-sm brightness-75 scale-[1.02] origin-center">
          <MainPage />
        </div>
      </div>
      {/* Capa de oscurecimiento encima del fondo */}
      <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px]" />

      <Link
        to={ROUTES.HOME}
        aria-label={closeLabel}
        className="absolute right-5 top-5 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white/90 text-slate-700 shadow-sm transition-colors hover:bg-white"
      >
        <X className="h-6 w-6 stroke-[2.5]" />
      </Link>

      <section className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200/90 bg-white/95 p-7 shadow-xl sm:p-8">
        <BalioBrand className="justify-center" logoClassName="h-9" />
        <header className="mt-5 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </header>

        <div className="mt-7">{children}</div>
      </section>
    </main>
  );
}
