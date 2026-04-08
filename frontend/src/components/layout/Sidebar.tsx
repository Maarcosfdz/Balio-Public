import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Menu, X } from "lucide-react";
import { useState, useRef, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS } from "@/config/nav";
import { ROUTES } from "@/config/routes";

export default function Sidebar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { logout, user } = useAuth();
  const [open, setOpen] = useState(false);

  const isActive = (path: string) =>
    pathname === path || (path !== ROUTES.DASHBOARD && pathname.startsWith(path));

  const activeIndex = NAV_ITEMS.findIndex(({ path }) => isActive(path));

  // ── Sliding pill ──────────────────────────────────────────────
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const isFirstRender = useRef(true);
  const [pill, setPill] = useState<{ top: number; height: number } | null>(null);
  const [pillInstant, setPillInstant] = useState(true);

  useLayoutEffect(() => {
    const el = itemRefs.current[activeIndex >= 0 ? activeIndex : 0];
    if (!el) return;

    setPill({ top: el.offsetTop, height: el.offsetHeight });

    if (isFirstRender.current) {
      isFirstRender.current = false;
      // Allow one rAF so the initial position paints before enabling transitions
      requestAnimationFrame(() => setPillInstant(false));
    }
  }, [activeIndex]);

  const nav = (
    <div className="relative flex flex-1 flex-col gap-1">
      {/* Sliding pill highlight */}
      {pill !== null && (
        <div
          className={`nav-pill${pillInstant ? " nav-pill--instant" : ""}`}
          style={{ top: pill.top, height: pill.height }}
        />
      )}

      {NAV_ITEMS.map(({ key, path, icon: Icon }, i) => {
        const active = isActive(path);
        return (
          <Link
            key={key}
            to={path}
            ref={(el) => { itemRefs.current[i] = el; }}
            onClick={() => setOpen(false)}
            className={`nav-item${active ? " nav-item--active" : ""}`}
          >
            <Icon
              className={`h-4 w-4 flex-shrink-0 transition-colors duration-200 ${
                active ? "text-sky-500" : "text-slate-300"
              }`}
            />
            <span className={active ? "nav-gradient-text" : ""}>
              {t(`nav.${key}`)}
            </span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Hamburger — mobile only */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden nav-hamburger-btn"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`nav-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col p-4 transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="mb-8 flex items-center gap-2 px-3">
          <img
            src="/logo.png"
            alt="Balio"
            className="h-6 w-6"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
          <span className="text-xl font-bold text-slate-800">Balio</span>
        </div>

        {nav}

        {/* Footer: user + logout */}
        <div className="mt-auto border-t border-slate-100 pt-4">
          <div className="mb-2 truncate px-3 text-sm text-slate-400">
            {user?.nickname}
          </div>
          <button
            type="button"
            onClick={logout}
            className="btn-ghost-draw w-full gap-3"
          >
            <LogOut className="h-4 w-4" />
            {t("auth.logout")}
          </button>
        </div>
      </aside>
    </>
  );
}
