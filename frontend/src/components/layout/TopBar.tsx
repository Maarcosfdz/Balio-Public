import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import { useState, useRef, useLayoutEffect } from "react";
import { NAV_ITEMS } from "@/config/nav";
import { ROUTES } from "@/config/routes";

export default function TopBar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { logout, user } = useAuth();

  const isActive = (path: string) =>
    pathname === path || (path !== ROUTES.DASHBOARD && pathname.startsWith(path));

  const activeIndex = NAV_ITEMS.findIndex(({ path }) => isActive(path));

  // ── Sliding underline indicator ───────────────────────────────
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const isFirstRender = useRef(true);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const [indicatorInstant, setIndicatorInstant] = useState(true);

  useLayoutEffect(() => {
    const el = itemRefs.current[activeIndex >= 0 ? activeIndex : 0];
    if (!el) return;

    setIndicator({ left: el.offsetLeft, width: el.offsetWidth });

    if (isFirstRender.current) {
      isFirstRender.current = false;
      requestAnimationFrame(() => setIndicatorInstant(false));
    }
  }, [activeIndex]);

  return (
    <header className="relative flex h-14 shrink-0 items-center bg-card px-4 gap-4 shadow-sm topbar-header">
      {/* Full-width gradient bottom separator */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[1.5px] bg-gradient-to-r from-sky-400 to-emerald-400 opacity-55" />

      {/* Logo */}
      <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
        <img
          src="/logo.png"
          alt="Balio"
          className="h-6 w-6"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
        <span className="text-lg font-bold text-slate-800">Balio</span>
      </div>

      {/* Nav */}
      <nav className="topbar-nav">
        {/* Sliding gradient underline under active item */}
        {indicator !== null && (
          <div
            className={`topbar-indicator${indicatorInstant ? " topbar-indicator--instant" : ""}`}
            style={{
              left: indicator.left,
              width: indicator.width,
              opacity: activeIndex >= 0 ? 1 : 0,
            }}
          />
        )}

        {NAV_ITEMS.map(({ key, path, icon: Icon }, i) => {
          const active = isActive(path);
          return (
            <Link
              key={key}
              to={path}
              ref={(el) => { itemRefs.current[i] = el; }}
              className={`topbar-item${active ? " topbar-item--active" : ""}`}
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
      </nav>

      {/* User + logout */}
      <div className="flex items-center gap-3 pl-4 border-l border-slate-200 topbar-user-section">
        <span className="text-sm text-slate-400 truncate max-w-[120px] topbar-user-name">
          {user?.nickname}
        </span>
        <button
          type="button"
          onClick={logout}
          className="btn-ghost-draw min-h-0 px-2.5 py-1.5"
          title={t("auth.logout")}
          aria-label={t("auth.logout")}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
