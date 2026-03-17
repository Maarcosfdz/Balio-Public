import {
  LayoutDashboard,
  ChartNoAxesCombined,
  ArrowLeftRight,
  Wallet,
  Target,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "./routes";

export interface NavItem {
  /** Clave usada en i18n → `nav.<key>` */
  key: string;
  path: string;
  icon: LucideIcon;
}

/**
 * Items del sidebar/navegación principal.
 * Un solo sitio donde añadir, quitar o reordenar secciones.
 * Categorías y filtros se acceden desde la página de transacciones.
 */
export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard",    path: ROUTES.DASHBOARD,    icon: LayoutDashboard },
  { key: "analysis",     path: ROUTES.ANALYSIS,     icon: ChartNoAxesCombined },
  { key: "transactions", path: ROUTES.TRANSACTIONS, icon: ArrowLeftRight },
  { key: "accounts",     path: ROUTES.ACCOUNTS,     icon: Wallet },
  { key: "goals",        path: ROUTES.GOALS,        icon: Target },
  { key: "settings",     path: ROUTES.SETTINGS,     icon: Settings },
];
