/**
 * Source of truth for all app routes.
 * Import from here instead of hardcoding route strings.
 */
export const ROUTES = {
  // Public
  HOME: "/",
  ABOUT: "/about",
  LOGIN: "/login",
  SIGNUP: "/signup",

  // Protected (require session)
  DASHBOARD: "/dashboard",
  TRANSACTIONS: "/transactions",
  ANALYSIS: "/analysis",
  ACCOUNTS: "/accounts",
  BUDGETS: "/budgets",
  BUDGET_DETAIL: "/budgets/:budgetId",
  CATEGORIES: "/categories",
  GOALS: "/goals",
  FILTERS: "/filters",
  SETTINGS: "/settings",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
