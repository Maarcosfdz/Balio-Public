/**
 * Fuente de verdad de todas las rutas de la app.
 * Importa desde aquí en lugar de escribir strings a mano.
 */
export const ROUTES = {
  // Públicas
  HOME: "/",
  ABOUT: "/about",
  LOGIN: "/login",
  SIGNUP: "/signup",

  // Protegidas (requieren sesión)
  DASHBOARD: "/dashboard",
  TRANSACTIONS: "/transactions",
  ANALYSIS: "/analysis",
  ACCOUNTS: "/accounts",
  CATEGORIES: "/categories",
  GOALS: "/goals",
  FILTERS: "/filters",
  SETTINGS: "/settings",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
