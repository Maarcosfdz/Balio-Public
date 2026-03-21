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
  /** Key used in i18n → `nav.<key>` */
  key: string;
  path: string;
  icon: LucideIcon;
}

/**
 * Sidebar / main navigation items.
 * Single place to add, remove or reorder sections.
 * Categories and filters are accessed from the transactions page.
 */
export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard",    path: ROUTES.DASHBOARD,    icon: LayoutDashboard },
  { key: "analysis",     path: ROUTES.ANALYSIS,     icon: ChartNoAxesCombined },
  { key: "transactions", path: ROUTES.TRANSACTIONS, icon: ArrowLeftRight },
  { key: "accounts",     path: ROUTES.ACCOUNTS,     icon: Wallet },
  { key: "goals",        path: ROUTES.GOALS,        icon: Target },
  { key: "settings",     path: ROUTES.SETTINGS,     icon: Settings },
];
