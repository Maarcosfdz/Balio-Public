import { NavLink, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BalioBrand from "@/components/branding/BalioBrand";
import { ROUTES } from "@/config/routes";

const navItems = [
  { key: "home", to: ROUTES.HOME, end: true },
  { key: "about", to: ROUTES.ABOUT, end: false },
] as const;

function navItemClass(isActive: boolean) {
  return [
    "relative pb-2 text-sm font-semibold tracking-tight transition-colors",
    isActive ? "text-foreground" : "text-slate-500 hover:text-foreground",
    "after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-slate-300 after:transition-opacity",
    isActive ? "after:opacity-100" : "after:opacity-0 hover:after:opacity-60",
  ].join(" ");
}

export default function PublicHeader() {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-6 py-3 lg:px-8">
        <Link to={ROUTES.HOME} className="shrink-0">
          <BalioBrand />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-8 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.end}
              className={({ isActive }) => navItemClass(isActive)}
            >
              {t(`publicNav.${item.key}`)}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link to={ROUTES.SIGNUP} className="btn-register btn-register-sm">
            <span className="btn-register-text">{t("auth.signUp")}</span>
          </Link>
          <Link to={ROUTES.LOGIN} className="btn-login-hover btn-login-sm">
            {t("auth.login")}
          </Link>
        </div>
      </div>

      <nav className="mx-auto flex w-full max-w-7xl items-center gap-6 px-6 pb-3 md:hidden lg:px-8">
        {navItems.map((item) => (
          <NavLink
            key={item.key}
            to={item.to}
            end={item.end}
            className={({ isActive }) => navItemClass(isActive)}
          >
            {t(`publicNav.${item.key}`)}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}