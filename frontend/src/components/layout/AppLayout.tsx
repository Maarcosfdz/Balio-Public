import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

/**
 * Layout principal para rutas autenticadas.
 * Sidebar a la izquierda + contenido a la derecha.
 */
export default function AppLayout() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
