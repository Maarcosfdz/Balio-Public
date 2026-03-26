import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import AppLayout from "@/components/layout/AppLayout";
import { ROUTES } from "@/config/routes";
import MainPage from "@/pages/mainPage/MainPage2";
import AboutPage from "@/pages/mainPage/AboutPage";
import LoginPage from "@/pages/auth/LoginPage";
import SignUpPage from "@/pages/auth/SignUpPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import AnalysisPage from "@/pages/analysis/AnalysisPage";
import AccountsPage from "@/pages/accounts/AccountsPage";
import TransactionsPage from "@/pages/transactions/TransactionsPage";
import CategoriesPage from "@/pages/categories/CategoriesPage";
import GoalsPage from "@/pages/goals/GoalsPage";
import BudgetsPage from "@/pages/budgets/BudgetsPage";
import BudgetDetailPage from "@/pages/budgets/BudgetDetailPage";
import ScheduledTransactionsPage from "@/pages/scheduledTransactions/ScheduledTransactionsPage";
import FiltersPage from "@/pages/filters/FiltersPage";
import SettingsPage from "@/pages/settings/SettingsPage";

export const router = createBrowserRouter([
  // ── Public routes (redirect to /dashboard if already authenticated) ──
  {
    element: <PublicRoute />,
    children: [
      { path: ROUTES.HOME,   element: <MainPage /> },
      { path: ROUTES.ABOUT,  element: <AboutPage /> },
      { path: ROUTES.LOGIN,  element: <LoginPage /> },
      { path: ROUTES.SIGNUP, element: <SignUpPage /> },
    ],
  },

  // ── Protected routes (require authentication) ──
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: ROUTES.DASHBOARD,    element: <DashboardPage /> },
          { path: ROUTES.ANALYSIS,     element: <AnalysisPage /> },
          { path: ROUTES.ACCOUNTS,     element: <AccountsPage /> },
          { path: ROUTES.TRANSACTIONS, element: <TransactionsPage /> },
          { path: ROUTES.CATEGORIES,   element: <CategoriesPage /> },
          { path: ROUTES.GOALS,          element: <GoalsPage /> },
          { path: ROUTES.BUDGETS,        element: <BudgetsPage /> },
          { path: ROUTES.BUDGET_DETAIL,  element: <BudgetDetailPage /> },
          { path: ROUTES.SCHEDULED_TRANSACTIONS, element: <ScheduledTransactionsPage /> },
          { path: ROUTES.FILTERS,        element: <FiltersPage /> },
          { path: ROUTES.SETTINGS,     element: <SettingsPage /> },
        ],
      },
    ],
  },
]);
