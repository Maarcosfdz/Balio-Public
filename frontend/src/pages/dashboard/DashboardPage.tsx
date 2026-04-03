import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { gsap } from "gsap";
import InfoCard from "@/components/ui/InfoCard";
import {
  ChevronRight,
  Minus,
  Plus,
  Settings2,
  Sparkles,
  Target,
  Wallet,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import {
  accountService,
  budgetService,
  categoryService,
  filterService,
  goalService,
  transactionService,
} from "@/backend";
import type {
  AccountSummaryDto,
  BudgetSummaryDto,
  CategorySummaryDto,
  FilterSummaryDto,
  GoalSummaryDto,
  TransactionSummaryDto,
  TransactionResponseDto,
} from "@/types";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";
import { GradientButton } from "@/components/ui/gradient-button";
import { ROUTES } from "@/config/routes";
import { IconAvatar } from "@/components/icons/IconAvatar";
import "@/styles/pages/dashboard.css";

// ── Types ────────────────────────────────────────────────────────────

type QuickToolKind = "goal" | "budget" | "filter";

interface QuickToolConfig {
  kind: QuickToolKind;
  refId: string;
  label: string;
}

interface MonthlyBar {
  month: string;
  income: number;
  expense: number;
}

interface CategorySlice {
  name: string;
  value: number;
  color: string;
  iconName?: string | null;
  iconBgColor?: string | null;
}

// ── Constants ────────────────────────────────────────────────────────

const STORAGE_KEY = "dashboard_quick_tools_v2";

// Blue/green/teal palette (screen18 style)
const DONUT_COLORS = [
  "#0891b2", // cyan-600
  "#22c55e", // green-500
  "#3b82f6", // blue-500
  "#06b6d4", // cyan-500
  "#10b981", // emerald-500
  "#6366f1", // indigo-500
  "#0ea5e9", // sky-500
  "#14b8a6", // teal-500
];

// ── Helpers ──────────────────────────────────────────────────────────

function resolveLocale(language?: string): string {
  if (!language) return "es-ES";
  if (language.startsWith("en")) return "en-US";
  if (language.startsWith("gl") || language.startsWith("gal")) return "gl-ES";
  return "es-ES";
}

function formatCurrency(amount: number, currency = "EUR", locale = "es-ES"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatCompactCurrency(amount: number, currency = "EUR", locale = "es-ES"): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
      currencyDisplay: "narrowSymbol",
    }).format(amount);
  } catch {
    return formatCurrency(amount, currency, locale);
  }
}

function renderDonutPercentageLabel({
  cx = 0,
  cy = 0,
  midAngle = 0,
  innerRadius = 0,
  outerRadius = 0,
  percent = 0,
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}) {
  if (percent < 0.04) return null;

  const RADIAN = Math.PI / 180;
  const labelRadius = innerRadius + (outerRadius - innerRadius) * 0.58;
  const x = cx + labelRadius * Math.cos(-midAngle * RADIAN);
  const y = cy + labelRadius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={800}
      style={{ textShadow: "0 1px 3px rgba(0,0,0,0.55)" }}
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  );
}

function shortMonth(date: Date, locale = "es-ES"): string {
  return date.toLocaleString(locale, { month: "short" });
}

function startOfMonth(y: number, m: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

function endOfMonth(y: number, m: number): string {
  const last = new Date(y, m + 1, 0);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

function getLast4Months(locale = "es-ES"): { key: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: 4 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (3 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: shortMonth(d, locale),
    };
  });
}

// ── CategoryIcon ─────────────────────────────────────────────────────

function CategoryIcon({
  iconName,
  iconBgColor,
  fallbackText,
  size = 36,
}: {
  iconName?: string | null;
  iconBgColor?: string | null;
  fallbackText?: string | null;
  size?: number;
}) {
  return (
    <div style={{ width: size, height: size }} className="shrink-0">
      <IconAvatar
        iconName={iconName}
        iconBgColor={iconBgColor}
        fallbackText={fallbackText}
        className="h-full w-full rounded-lg"
        iconClassName="text-slate-700"
      />
    </div>
  );
}

function ViewAllArrowIcon() {
  return (
    <svg
      className="db-view-all-arrow"
      viewBox="0 0 24 12"
      aria-hidden="true"
      focusable="false"
    >
      <path className="one" d="M2 2 L7 6 L2 10" />
      <path className="two" d="M9 2 L14 6 L9 10" />
      <path className="three" d="M16 2 L21 6 L16 10" />
    </svg>
  );
}

// ── QuickToolPicker modal ────────────────────────────────────────────

interface PickerProps {
  slotIndex: number;
  goals: GoalSummaryDto[];
  budgets: BudgetSummaryDto[];
  filters: FilterSummaryDto[];
  onPick: (index: number, config: QuickToolConfig) => void;
  onClose: () => void;
}

function QuickToolPicker({ slotIndex, goals, budgets, filters, onPick, onClose }: PickerProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<QuickToolKind>("goal");

  const items: { id: string; label: string }[] =
    tab === "goal"
      ? goals.map((g) => ({ id: g.id, label: g.name }))
      : tab === "budget"
        ? budgets.map((b) => ({ id: b.id, label: b.name }))
        : filters.map((f) => ({ id: f.id, label: f.name }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xs rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <p className="text-sm font-bold text-slate-800">{t("dashboard.page.quickTools.picker.title", "Configurar acceso rápido")}</p>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-1 px-4 py-2 border-b bg-slate-50">
          {(["goal", "budget", "filter"] as QuickToolKind[]).map((kind) => (
            <button
              key={kind}
              onClick={() => setTab(kind)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                tab === kind
                  ? "bg-slate-800 text-white"
                  : "text-slate-500 hover:bg-slate-200"
              }`}
            >
              {kind === "goal"
                ? t("dashboard.page.quickTools.picker.goal", "Objetivo")
                : kind === "budget"
                  ? t("dashboard.page.quickTools.picker.budget", "Presupuesto")
                  : t("dashboard.page.quickTools.picker.filter", "Filtro")}
            </button>
          ))}
        </div>
        <div className="max-h-56 overflow-y-auto px-4 py-2">
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t("dashboard.page.quickTools.picker.empty", "Sin elementos")}</p>
          ) : (
            <ul className="space-y-0.5">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => onPick(slotIndex, { kind: tab, refId: item.id, label: item.label })}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-100 transition"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t px-4 py-3">
          <button type="button" onClick={onClose} className="btn-cancel-draw w-full justify-center">
            {t("common.cancel", "Cancelar")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Custom tooltip — dark blurry ─────────────────────────────────────

function BarTooltip({
  active,
  payload,
  label,
  currency = "EUR",
}: {
  active?: boolean;
  payload?: { name: string; value: number; fill: string }[];
  label?: string;
  currency?: string;
}) {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.resolvedLanguage);

  if (!active || !payload?.length) return null;
  return (
    <div className="db-tooltip">
      <p className="font-bold mb-1 text-white/90">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: p.fill }}
          />
          <span className="text-white/60">
            {p.name === "income"
              ? t("dashboard.page.charts.incomeLegend", "Ingresos")
              : t("dashboard.page.charts.expenseLegend", "Gastos")}
            :
          </span>
          <span className="font-semibold text-white">{formatCurrency(p.value, currency, locale)}</span>
        </div>
      ))}
    </div>
  );
}

function DonutTooltip({
  active,
  payload,
  currency = "EUR",
}: {
  active?: boolean;
  payload?: { name: string; value: number }[];
  currency?: string;
}) {
  const { i18n } = useTranslation();
  const locale = resolveLocale(i18n.resolvedLanguage);

  if (!active || !payload?.length) return null;
  return (
    <div className="db-tooltip">
      <p className="font-semibold text-white/90">{payload[0].name}</p>
      <p className="text-white/70">{formatCurrency(payload[0].value, currency, locale)}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Main DashboardPage
// ══════════════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const chartCurrency = user?.preferredCurrency ?? "EUR";
  const locale = useMemo(() => resolveLocale(i18n.resolvedLanguage), [i18n.resolvedLanguage]);

  // ── Data state ──────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<AccountSummaryDto[]>([]);
  const [recentTx, setRecentTx] = useState<TransactionSummaryDto[]>([]);
  const [chartTx, setChartTx] = useState<TransactionSummaryDto[]>([]);
  const [categories, setCategories] = useState<CategorySummaryDto[]>([]);
  const [budgets, setBudgets] = useState<BudgetSummaryDto[]>([]);
  const [goals, setGoals] = useState<GoalSummaryDto[]>([]);
  const [filters, setFilters] = useState<FilterSummaryDto[]>([]);

  // ── UI state ────────────────────────────────────────────────────────
  const [addModal, setAddModal] = useState<"INCOME" | "EXPENSE" | null>(null);
  const [quickTools, setQuickTools] = useState<(QuickToolConfig | null)[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as (QuickToolConfig | null)[]) : [null, null, null];
    } catch {
      return [null, null, null];
    }
  });
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [activeDonutIndex, setActiveDonutIndex] = useState<number | null>(null);

  // ── Fetch data ──────────────────────────────────────────────────────
  useEffect(() => {
    const now = new Date();
    const fourMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const startDate = `${fourMonthsAgo.getFullYear()}-${String(fourMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;

    accountService.getAll().then(setAccounts).catch(() => {});
    transactionService.getAll({}, 0, 10).then((p) => setRecentTx(p.content)).catch(() => {});
    transactionService.getAll({ startDate }, 0, 500).then((p) => setChartTx(p.content)).catch(() => {});
    categoryService.getAll().then(setCategories).catch(() => {});
    budgetService.getAll().then(setBudgets).catch(() => {});
    goalService.getAll().then(setGoals).catch(() => {});
    filterService.getAll().then(setFilters).catch(() => {});
  }, []);

  // ── Category map ────────────────────────────────────────────────────
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  // ── Monthly bar chart data ───────────────────────────────────────────
  const monthlyData = useMemo<MonthlyBar[]>(() => {
    const months = getLast4Months(locale);
    return months.map(({ key, label }) => {
      const [y, m] = key.split("-").map(Number);
      const monthStart = startOfMonth(y, m - 1);
      const monthEnd = endOfMonth(y, m - 1);
      let income = 0;
      let expense = 0;
      for (const tx of chartTx) {
        if (tx.date >= monthStart && tx.date <= monthEnd) {
          if (tx.type === "INCOME") income += tx.amount;
          else expense += tx.amount;
        }
      }
      return { month: label, income, expense };
    });
  }, [chartTx, locale]);

  // ── Category donut data (current month) ─────────────────────────────
  const categoryDonutData = useMemo<CategorySlice[]>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const monthStart = startOfMonth(y, m);
    const monthEnd = endOfMonth(y, m);

    const acc: Record<string, { name: string; value: number; iconName?: string | null; iconBgColor?: string | null }> = {};

    for (const tx of chartTx) {
      if (tx.type !== "EXPENSE") continue;
      if (tx.date < monthStart || tx.date > monthEnd) continue;

      const catId = tx.categoryId ?? "__none__";
      const catName = tx.categoryName ?? t("transactions.uncategorized", "Sin categoría");
      const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : null;

      if (!acc[catId]) {
        acc[catId] = {
          name: catName,
          value: 0,
          iconName: cat?.iconName,
          iconBgColor: cat?.iconBgColor,
        };
      }
      acc[catId].value += tx.amount;
    }

    return Object.values(acc)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
      .map((item, idx) => ({
        ...item,
        color: DONUT_COLORS[idx % DONUT_COLORS.length],
      }));
  }, [chartTx, categoryMap, t]);

  // ── Total balance ────────────────────────────────────────────────────
  const totalBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + a.balance, 0),
    [accounts],
  );

  // ── GSAP: balance count-up whenever totalBalance changes ─────────────
  const balanceRef = useRef<HTMLParagraphElement>(null);
  const prevBalanceRef = useRef(0);
  useEffect(() => {
    const el = balanceRef.current;
    if (!el) return;
    const from = prevBalanceRef.current;
    const obj = { v: from };
    const ctx = gsap.context(() => {
      gsap.to(obj, {
        v: totalBalance,
        duration: 1.1,
        ease: "power2.out",
        onUpdate() {
          el.textContent = formatCurrency(obj.v, user?.preferredCurrency ?? "EUR", locale);
        },
        onComplete() { prevBalanceRef.current = totalBalance; },
      });
    });
    return () => ctx.revert();
  }, [totalBalance, user?.preferredCurrency, locale]);

  // ── Quick tools helpers ──────────────────────────────────────────────
  const handlePickTool = useCallback((idx: number, config: QuickToolConfig) => {
    setQuickTools((prev) => {
      const next = [...prev];
      next[idx] = config;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setPickerSlot(null);
  }, []);

  const handleRemoveTool = useCallback((idx: number) => {
    setQuickTools((prev) => {
      const next = [...prev];
      next[idx] = null;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const navigateToTool = useCallback(
    (tool: QuickToolConfig) => {
      if (tool.kind === "goal") navigate(ROUTES.GOALS);
      else if (tool.kind === "budget") navigate(`/budgets/${tool.refId}`);
      else navigate(ROUTES.TRANSACTIONS);
    },
    [navigate],
  );

  const handleAddCreated = useCallback((_tx: TransactionResponseDto) => {
    void _tx;
    transactionService.getAll({}, 0, 10).then((p) => setRecentTx(p.content)).catch(() => {});
    accountService.getAll().then(setAccounts).catch(() => {});
    const now = new Date();
    const fourMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const startDate = `${fourMonthsAgo.getFullYear()}-${String(fourMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;
    transactionService.getAll({ startDate }, 0, 500).then((p) => setChartTx(p.content)).catch(() => {});
    setAddModal(null);
  }, []);

  // ── Quick tool icon — resolves actual goal/budget icon ───────────────
  function toolIconNode(tool: QuickToolConfig) {
    if (tool.kind === "goal") {
      const goal = goals.find((g) => g.id === tool.refId);
      if (goal?.iconName) {
        return <CategoryIcon iconName={goal.iconName} iconBgColor={goal.iconBgColor} fallbackText={goal.name} size={28} />;
      }
      return <Target className="h-4 w-4 text-teal-500" />;
    }
    if (tool.kind === "budget") {
      const budget = budgets.find((b) => b.id === tool.refId);
      if (budget?.iconName) {
        return <CategoryIcon iconName={budget.iconName} iconBgColor={budget.iconBgColor} fallbackText={budget.name} size={28} />;
      }
      return <Wallet className="h-4 w-4 text-sky-500" />;
    }
    return <Sparkles className="h-4 w-4 text-amber-500" />;
  }

  // ── Render ───────────────────────────────────────────────────────────

  // Preparedo: obtener items traducidos para la InfoCard
  const infoItems = t("dashboard.page.infoCard.items", { returnObjects: true }) as string[];

  return (
    <div className="db-page-bg">
      <InfoCard
        id="dashboard"
        accentColor="sky"
        title={t("dashboard.page.infoCard.title", "Welcome to Balio 👋")}
        description={t(
          "dashboard.page.infoCard.description",
          "Balio is your personal finance manager. Manage bank and manual accounts, track income/expenses, and analyze your finances visually. Use the navigation to explore each section. This page shows a general overview of your financial situation. 💡 Change language and currency in Settings."
        )}
        items={infoItems}
      />
      <div className="db-grid">

      {/* ── Hero card (gradient border wrapper) ─────────────────────── */}
      <div className="db-hero-wrapper">
        <div className="db-hero-inner">
          <div className="db-hero-content">
            {/* Greeting + name */}
            <div>
              <p className="text-sm font-medium text-slate-500 mb-0.5">
                {t("dashboard.page.hero.welcomeBack", "Bienvenido de nuevo")} 👋
              </p>
              <h1 className="db-hero-name-gradient text-4xl font-extrabold leading-tight">
                {user?.nickname ?? t("dashboard.page.hero.userFallback", "Usuario")}
              </h1>
              <div className="mt-4">
                <p className="text-xs text-slate-400 mb-0.5">{t("dashboard.page.hero.totalBalance", "Balance total")}</p>
                <p ref={balanceRef} className="text-3xl font-extrabold text-slate-800 tracking-tight">
                  {formatCurrency(totalBalance, user?.preferredCurrency ?? "EUR", locale)}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-5 flex-wrap">
              <GradientButton
                size="sm"
                iconVariant="plus"
                icon={<Plus className="h-3.5 w-3.5" />}
                className="db-cta-btn"
                onClick={() => setAddModal("INCOME")}
              >
                {t("dashboard.page.actions.addIncome", "Añadir ingreso")}
              </GradientButton>
              <button className="db-cta-ghost db-cta-btn" onClick={() => setAddModal("EXPENSE")}>
                <Minus className="h-3.5 w-3.5" />
                {t("dashboard.page.actions.addExpense", "Añadir gasto")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick tools ─────────────────────────────────────────────── */}
      <div className="db-quick-tools">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {t("dashboard.page.quickTools.title", "Accesos rápidos")}
          </p>
          <Settings2 className="h-3.5 w-3.5 text-slate-300" />
        </div>

        {quickTools.map((tool, idx) =>
          tool ? (
            <div
              key={idx}
              className="db-quick-tool-slot filled group app-add-dashed"
              onClick={() => navigateToTool(tool)}
            >
              <div className="flex items-center gap-2 min-w-0">
                {toolIconNode(tool)}
                <span className="text-sm font-semibold text-slate-700 truncate">
                  {tool.label}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveTool(idx); }}
                  className="p-1 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="h-3 w-3" />
                </button>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            </div>
          ) : (
            <button
              key={idx}
              className="db-quick-tool-slot app-add-dashed"
              onClick={() => setPickerSlot(idx)}
            >
              <div className="flex items-center gap-1.5 text-slate-400">
                <Plus className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{t("dashboard.page.quickTools.addAccess", "Añadir acceso")}</span>
              </div>
            </button>
          ),
        )}
      </div>

      {/* ── Charts row ──────────────────────────────────────────────── */}
      <div className="db-chart-row">

        {/* Income vs Expense bar chart */}
        <div className="db-card">
          <p className="db-card-title">{t("dashboard.page.charts.incomeVsExpense", "Ingresos vs gastos")}</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData} barGap={4} barCategoryGap="30%">
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={1} />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#86efac" stopOpacity={1} />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0.9} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={(v: number) => formatCompactCurrency(v, chartCurrency, locale)}
              />
              <Tooltip
                content={<BarTooltip currency={chartCurrency} />}
                cursor={{ fill: "rgba(0,0,0,0.04)", radius: 6 }}
              />
              <Bar
                dataKey="income"
                name="income"
                fill="url(#incomeGrad)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expense"
                name="expense"
                fill="url(#expenseGrad)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-500" />
              <span className="text-[11px] text-slate-500">{t("dashboard.page.charts.incomeLegend", "Ingresos")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-600" />
              <span className="text-[11px] text-slate-500">{t("dashboard.page.charts.expenseLegend", "Gastos")}</span>
            </div>
          </div>
        </div>

        {/* Category donut */}
        <div className="db-card flex flex-col">
          <p className="db-card-title">{t("dashboard.page.charts.monthExpenses", "Gastos del mes")}</p>
          {categoryDonutData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-slate-400">{t("dashboard.page.charts.noMonthExpenses", "Sin gastos este mes")}</p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={categoryDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="value"
                    labelLine={false}
                    label={renderDonutPercentageLabel}
                    onMouseLeave={() => setActiveDonutIndex(null)}
                    onMouseEnter={(_, index) => setActiveDonutIndex(index)}
                  >
                    {categoryDonutData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        fillOpacity={activeDonutIndex == null || activeDonutIndex === index ? 1 : 0.28}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip currency={chartCurrency} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="style-1 max-h-[152px] flex-1 min-w-0 space-y-1 overflow-y-auto pr-1">
                {categoryDonutData.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-1.5 min-w-0 rounded px-1 py-0.5 transition ${activeDonutIndex == null || activeDonutIndex === idx ? "opacity-100" : "opacity-35"}`}
                    onMouseEnter={() => setActiveDonutIndex(idx)}
                    onMouseLeave={() => setActiveDonutIndex(null)}
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ background: item.color }}
                    />
                    <span className="text-[11px] text-slate-500 truncate min-w-0">{item.name}</span>
                    <span className="text-[11px] font-semibold text-slate-700 shrink-0 ml-auto pl-1">
                      {formatCurrency(item.value, chartCurrency, locale)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Account summary */}
        <div className="db-card">
          <div className="flex items-center justify-between mb-3">
            <p className="db-card-title mb-0">{t("dashboard.page.cards.accounts", "Cuentas")}</p>
            <button
              onClick={() => navigate(ROUTES.ACCOUNTS)}
              className="db-view-all"
            >
              {t("dashboard.page.buttons.viewAll", "Ver todos")} <ViewAllArrowIcon />
            </button>
          </div>
          {accounts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">{t("dashboard.page.empty.accounts", "Sin cuentas")}</p>
          ) : (
            <ul className="space-y-2.5">
              {accounts.slice(0, 4).map((acc) => (
                <li
                  key={acc.id}
                  className="flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 rounded-lg px-1 py-0.5 -mx-1 transition"
                  onClick={() => navigate(ROUTES.ACCOUNTS)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Wallet className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">
                        {acc.name}
                      </p>
                      <p className="text-[10px] text-slate-400 uppercase">{acc.type}</p>
                    </div>
                  </div>
                  <p
                    className={`text-sm font-bold shrink-0 ${acc.balance >= 0 ? "text-slate-800" : "text-red-500"}`}
                  >
                    {formatCurrency(acc.balance, acc.currency, locale)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Bottom row ──────────────────────────────────────────────── */}
      <div className="db-bottom-row">

        {/* Recent transactions */}
        <div className="db-card">
          <div className="flex items-center justify-between mb-3">
            <p className="db-card-title mb-0">{t("dashboard.page.cards.recentTransactions", "Transacciones recientes")}</p>
            <button
              onClick={() => navigate(ROUTES.TRANSACTIONS)}
              className="db-view-all"
            >
              {t("dashboard.page.buttons.viewAll", "Ver todos")} <ViewAllArrowIcon />
            </button>
          </div>

          {recentTx.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              {t("dashboard.page.empty.recentTransactions", "Sin transacciones recientes")}
            </p>
          ) : (
            <ul className="db-tx-list">
              {recentTx.map((tx) => {
                const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : null;
                return (
                  <li key={tx.id} className="db-tx-item">
                    <CategoryIcon
                      iconName={cat?.iconName}
                      iconBgColor={cat?.iconBgColor}
                      fallbackText={cat?.name ?? tx.categoryName}
                      size={36}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">
                        {tx.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {cat?.name ?? t("transactions.uncategorized", "Sin categoría")}
                        {tx.accountName && (
                          <span className="text-slate-300"> · {tx.accountName}</span>
                        )}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-sm font-bold ${
                          tx.type === "INCOME" ? "text-emerald-600" : "text-slate-700"
                        }`}
                      >
                        {tx.type === "INCOME" ? "+" : "-"}
                        {formatCurrency(tx.amount, tx.currency ?? "EUR", locale)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(tx.date).toLocaleDateString(locale, {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Budgets panel */}
        <div className="db-card">
          <div className="flex items-center justify-between mb-3">
            <p className="db-card-title mb-0">{t("dashboard.page.cards.budgets", "Presupuestos")}</p>
            <button
              onClick={() => navigate(ROUTES.BUDGETS)}
              className="db-view-all"
            >
              {t("dashboard.page.buttons.viewAll", "Ver todos")} <ViewAllArrowIcon />
            </button>
          </div>

          {budgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Wallet className="h-8 w-8 text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">{t("dashboard.page.empty.budgets", "Sin presupuestos")}</p>
              <button
                onClick={() => navigate(ROUTES.BUDGETS)}
                className="mt-2 text-xs text-slate-500 hover:text-slate-800 font-semibold transition"
              >
                {t("dashboard.page.buttons.createBudget", "Crear presupuesto")}
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {budgets.slice(0, 5).map((budget) => {
                const used = budget.totalSpent;
                const limit = budget.totalBudget;
                const pct = Math.min(budget.usagePercent, 100);
                const over = used > limit;
                return (
                  <li
                    key={budget.id}
                    className="cursor-pointer hover:bg-slate-50 rounded-lg px-1 py-0.5 -mx-1 transition"
                    onClick={() => navigate(`/budgets/${budget.id}`)}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <CategoryIcon
                        iconName={budget.iconName}
                        iconBgColor={budget.iconBgColor}
                        fallbackText={budget.name}
                        size={26}
                      />
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
                        <p className="text-sm font-semibold text-slate-700 truncate">
                          {budget.name}
                        </p>
                        <p
                          className={`text-xs font-bold shrink-0 ${
                            over ? "text-red-500" : "text-slate-500"
                          }`}
                        >
                          {formatCurrency(used, chartCurrency, locale)} / {formatCurrency(limit, chartCurrency, locale)}
                        </p>
                      </div>
                    </div>
                    <div className="db-budget-bar-bg ml-[34px]">
                      <div
                        className={`db-budget-bar-fill${over ? " over" : ""}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Quick tool picker modal ──────────────────────────────────── */}
      {pickerSlot !== null && (
        <QuickToolPicker
          slotIndex={pickerSlot}
          goals={goals}
          budgets={budgets}
          filters={filters}
          onPick={handlePickTool}
          onClose={() => setPickerSlot(null)}
        />
      )}

      {/* ── Add transaction modal ────────────────────────────────────── */}
      {addModal && (
        <AddTransactionModal
          type={addModal}
          open={true}
          onClose={() => setAddModal(null)}
          onCreated={handleAddCreated}
        />
      )}
      </div>
    </div>
  );
}
