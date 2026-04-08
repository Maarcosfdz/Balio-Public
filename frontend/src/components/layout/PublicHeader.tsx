import { NavLink, Link, useLocation } from "react-router-dom";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import BalioBrand from "@/components/branding/BalioBrand";
import { ROUTES } from "@/config/routes";
import { gradientButtonClass } from "@/components/ui/gradient-button";

function navItemClass(isActive: boolean) {
  return [
    "relative z-10 flex w-fit justify-self-center items-center justify-center px-4 pb-2 text-sm font-semibold tracking-tight transition-colors",
    isActive ? "text-foreground" : "text-slate-500 hover:text-foreground",
  ].join(" ");
}

function PublicNavTabs({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navRef = useRef<HTMLElement | null>(null);
  const homeRef = useRef<HTMLAnchorElement | null>(null);
  const aboutRef = useRef<HTMLAnchorElement | null>(null);
  const [glider, setGlider] = useState({ x: 0, w: 0, ready: false });

  useLayoutEffect(() => {
    const updateGlider = () => {
      const navEl = navRef.current;
      if (!navEl) return;
      const activeEl = location.pathname.startsWith(ROUTES.ABOUT) ? aboutRef.current : homeRef.current;
      if (!activeEl) return;

      const navBox = navEl.getBoundingClientRect();
      const activeBox = activeEl.getBoundingClientRect();
      setGlider({
        x: activeBox.left - navBox.left,
        w: activeBox.width,
        ready: true,
      });
    };

    updateGlider();
    window.addEventListener("resize", updateGlider);
    return () => window.removeEventListener("resize", updateGlider);
  }, [location.pathname]);

  return (
    <nav ref={navRef} className={["relative inline-grid grid-cols-2", className].join(" ")}>
      <span
        aria-hidden="true"
        className={[
          "pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full",
          "bg-[linear-gradient(90deg,rgba(120,146,176,0.95)_0%,rgba(95,124,160,0.95)_100%)]",
          "shadow-[0_0_0_1px_rgba(120,146,176,0.08)]",
          "transition-[transform,width,opacity] duration-[280ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] will-change-transform",
          glider.ready ? "opacity-100" : "opacity-0",
        ].join(" ")}
        style={{ width: `${glider.w}px`, transform: `translateX(${glider.x}px)` }}
      />
      <NavLink
        ref={homeRef}
        to={ROUTES.HOME}
        end
        className={({ isActive }) => navItemClass(isActive)}
      >
        {t("publicNav.home")}
      </NavLink>
      <NavLink
        ref={aboutRef}
        to={ROUTES.ABOUT}
        className={({ isActive }) => navItemClass(isActive)}
      >
        {t("publicNav.about")}
      </NavLink>
    </nav>
  );
}

interface PublicHeaderProps {
  sticky?: boolean;
}

export default function PublicHeader({ sticky = true }: PublicHeaderProps) {
  const { t } = useTranslation();

  return (
    <header
      className={[
        "z-40 border-b border-slate-200/80 bg-background/90 backdrop-blur",
        sticky ? "sticky top-0" : "relative",
      ].join(" ")}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-6 py-3 lg:px-8">
        <Link to={ROUTES.HOME} className="shrink-0">
          <BalioBrand />
        </Link>

        <div className="hidden flex-1 items-center justify-center md:flex">
          <PublicNavTabs className="w-[220px]" />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <Link to={ROUTES.SIGNUP} className="btn-register btn-register-sm">
            <span className="btn-register-text">{t("auth.signUp")}</span>
          </Link>
          <Link to={ROUTES.LOGIN} className={gradientButtonClass({ size: "sm" })}>
            {t("auth.login")}
          </Link>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl justify-center px-6 pb-3 md:hidden lg:px-8">
        <PublicNavTabs className="w-full max-w-[260px]" />
      </div>
    </header>
  );
}
