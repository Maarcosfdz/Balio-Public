import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import AppLayout from "@/components/layout/AppLayout";
import { ROUTES } from "@/config/routes";
import MainPage from "@/pages/mainPage/MainPage";
import LoginPage from "@/pages/auth/LoginPage";
import SignUpPage from "@/pages/auth/SignUpPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import AccountsPage from "@/pages/accounts/AccountsPage";
import TransactionsPage from "@/pages/transactions/TransactionsPage";
import CategoriesPage from "@/pages/categories/CategoriesPage";
import GoalsPage from "@/pages/goals/GoalsPage";
import FiltersPage from "@/pages/filters/FiltersPage";
import SettingsPage from "@/pages/settings/SettingsPage";

export const router = createBrowserRouter([
  // ── Rutas públicas (redirigen a /dashboard si ya hay sesión) ──
  {
    element: <PublicRoute />,
    children: [
      { path: ROUTES.HOME,   element: <MainPage /> },
      { path: ROUTES.LOGIN,  element: <LoginPage /> },
      { path: ROUTES.SIGNUP, element: <SignUpPage /> },
    ],
  },

  // ── Rutas protegidas (requieren autenticación) ──
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: ROUTES.DASHBOARD,    element: <DashboardPage /> },
          { path: ROUTES.ACCOUNTS,     element: <AccountsPage /> },
          { path: ROUTES.TRANSACTIONS, element: <TransactionsPage /> },
          { path: ROUTES.CATEGORIES,   element: <CategoriesPage /> },
          { path: ROUTES.GOALS,        element: <GoalsPage /> },
          { path: ROUTES.FILTERS,      element: <FiltersPage /> },
          { path: ROUTES.SETTINGS,     element: <SettingsPage /> },
        ],
      },
    ],
  },
]);
