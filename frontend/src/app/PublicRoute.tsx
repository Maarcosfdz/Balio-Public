import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/config/routes";

/**
 * If the user is ALREADY authenticated, redirect them to the dashboard.
 * Otherwise, show the public page (login/signup).
 */
export default function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return isAuthenticated ? (
  <Navigate to={ROUTES.DASHBOARD} replace />
  ) : (
    <div className="font-system">
      <Outlet />
    </div>
  );
}
