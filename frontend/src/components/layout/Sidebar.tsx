import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
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

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV_ITEMS.map(({ key, path, icon: Icon }) => (
        <Link
          key={key}
          to={path}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-300 ease-in-out ${
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
  );

  return (
    <>
      {/* Botón hamburguesa solo en móvil */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay en móvil */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card p-4 transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo / Nombre */}
        <div className="mb-8 flex items-center gap-2 px-3">
          <img
            src="/logo.png"
            alt="Balio"
            className="h-6 w-6"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
          <span className="text-xl font-bold">Balio</span>
        </div>

        {nav}

        {/* Footer: usuario + logout */}
        <div className="mt-auto border-t pt-4">
          <div className="mb-2 truncate px-3 text-sm text-muted-foreground">
            {user?.nickname}
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            {t("auth.logout")}
          </button>
        </div>
      </aside>
    </>
  );
}
