import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import { NAV_ITEMS } from "@/config/nav";
import { ROUTES } from "@/config/routes";

export default function TopBar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { logout, user } = useAuth();

  const isActive = (path: string) =>
    pathname === path || (path !== ROUTES.DASHBOARD && pathname.startsWith(path));

  return (
    <header className="flex h-14 shrink-0 items-center border-b bg-card px-4 gap-4 shadow-sm">
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

      {/* Nav items */}
      <nav className="flex flex-1 items-center gap-1">
        {NAV_ITEMS.map(({ key, path, icon: Icon }) => (
          <Link
            key={key}
            to={path}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-300 ease-in-out ${
              isActive(path)
                ? "bg-slate-700 text-white shadow-sm"
                : "text-muted-foreground hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <Icon className="h-4 w-4" />
            {t(`nav.${key}`)}
          </Link>
        ))}
      </nav>

      {/* User + logout */}
      <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
        <span className="text-sm text-muted-foreground truncate max-w-[120px]">
          {user?.nickname}
        </span>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
