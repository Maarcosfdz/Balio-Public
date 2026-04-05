import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { ROUTES } from "@/config/routes";

type NavStyle = "vertical" | "horizontal";

function getNavStyle(): NavStyle {
  return (localStorage.getItem("navStyle") as NavStyle) ?? "vertical";
}

export default function AppLayout() {
  const [navStyle, setNavStyle] = useState<NavStyle>(getNavStyle);
  const { pathname } = useLocation();
  const isDashboardRoute = pathname === ROUTES.DASHBOARD;
  const mainClassName = `flex-1 overflow-y-auto p-6 md:p-8 app-main${isDashboardRoute ? " app-main--dashboard" : ""}`;

  // Listen for navStyle changes dispatched from SettingsPage
  useEffect(() => {
    const handler = () => setNavStyle(getNavStyle());
    window.addEventListener("balio:navstyle-changed", handler);
    return () => window.removeEventListener("balio:navstyle-changed", handler);
  }, []);

  if (navStyle === "horizontal") {
    return (
      <div className="flex h-screen flex-col bg-background app-layout-horizontal">
        <TopBar />
        <main className={mainClassName}>
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background app-layout-vertical">
      <Sidebar />
      <main className={mainClassName}>
        <Outlet />
      </main>
    </div>
  );
}
