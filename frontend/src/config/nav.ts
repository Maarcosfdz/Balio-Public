import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Tag,
  Target,
  Filter,
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
 */
export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard",    path: ROUTES.DASHBOARD,    icon: LayoutDashboard },
  { key: "transactions", path: ROUTES.TRANSACTIONS, icon: ArrowLeftRight },
  { key: "accounts",     path: ROUTES.ACCOUNTS,     icon: Wallet },
  { key: "categories",   path: ROUTES.CATEGORIES,   icon: Tag },
  { key: "goals",        path: ROUTES.GOALS,        icon: Target },
  { key: "filters",      path: ROUTES.FILTERS,      icon: Filter },
  { key: "settings",     path: ROUTES.SETTINGS,     icon: Settings },
];
