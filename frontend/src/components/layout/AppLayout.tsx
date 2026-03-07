import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

type NavStyle = "vertical" | "horizontal";

function getNavStyle(): NavStyle {
  return (localStorage.getItem("navStyle") as NavStyle) ?? "vertical";
}

export default function AppLayout() {
  const [navStyle, setNavStyle] = useState<NavStyle>(getNavStyle);

  // Listen for navStyle changes dispatched from SettingsPage
  useEffect(() => {
    const handler = () => setNavStyle(getNavStyle());
    window.addEventListener("balio:navstyle-changed", handler);
    return () => window.removeEventListener("balio:navstyle-changed", handler);
  }, []);

  if (navStyle === "horizontal") {
    return (
      <div className="flex h-screen flex-col bg-background">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
