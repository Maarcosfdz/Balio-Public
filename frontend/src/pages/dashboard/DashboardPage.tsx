import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BarChart3,
  CircleDollarSign,
  Grip,
  LayoutDashboard,
  Pencil,
  PiggyBank,
  Plus,
  Target,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  accountService,
  budgetService,
  chartService,
  goalService,
  transactionService,
} from "@/backend";
import type {
  AccountSummaryDto,
  BudgetSummaryDto,
  GoalSummaryDto,
  TransactionSummaryDto,
} from "@/types";
import type { ChartWidgetSummaryDto } from "@/backend/chartService";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";
import { ROUTES } from "@/config/routes";
import { renderWidget } from "@/pages/analysis/registry";
import type { AnalysisWidget, WidgetType } from "@/pages/analysis/types";
import { emptyDraftFromType } from "@/pages/analysis/mocks";

// ── Types ───────────────────────────────────────────────────────────

type SlotKind = "chart" | "budget" | "goal" | "account" | "recentActivity" | "netWorth";

type SlotSize = "normal" | "wide" | "tall";

interface DashboardSlot {
  kind: SlotKind;
  refId?: string; // chartId, budgetId, goalId, accountId
  label: string;  // display name for the widget title
  size?: SlotSize;
}

const STORAGE_KEY = "balio_dashboard_slots";
const MAX_SLOTS = 10;

const DEFAULT_SLOTS: (DashboardSlot | null)[] = [
  { kind: "netWorth", label: "Net Worth" },
  null, null, null,
  null, null, null, null,
];

function loadSlots(): (DashboardSlot | null)[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_SLOTS];
    const parsed = JSON.parse(raw) as (DashboardSlot | null)[];
    if (!Array.isArray(parsed)) return [...DEFAULT_SLOTS];
    // Ensure at least 8 slots, max 10
    while (parsed.length < 8) parsed.push(null);
    return parsed.slice(0, MAX_SLOTS);
  } catch {
    return [...DEFAULT_SLOTS];
  }
}

function saveSlots(slots: (DashboardSlot | null)[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
}

// ── Helpers ─────────────────────────────────────────────────────────

function toMoney(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "dashboard.greetingMorning";
  if (hour < 19) return "dashboard.greetingAfternoon";
  return "dashboard.greetingEvening";
}

function budgetColor(pct: number): string {
  if (pct < 50) return "#0ea5e9";
  if (pct < 75) return "#f59e0b";
  if (pct < 90) return "#f97316";
  return "#ef4444";
}

function goalColor(pct: number): string {
  if (pct >= 100) return "#10b981";
  if (pct >= 50) return "#0ea5e9";
  return "#f59e0b";
}

const CAT_COLORS: Record<string, string> = {
  Housing: "#0ea5e9", Vivienda: "#0ea5e9",
  Food: "#10b981", Comida: "#10b981",
  Transport: "#f59e0b", Transporte: "#f59e0b",
  Shopping: "#8b5cf6", Compras: "#8b5cf6",
};

function catBg(name: string): string {
  return CAT_COLORS[name] ?? "#94a3b8";
}

// ── Component ───────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Data state ──
  const [accounts, setAccounts] = useState<AccountSummaryDto[]>([]);
  const [budgets, setBudgets] = useState<BudgetSummaryDto[]>([]);
  const [goals, setGoals] = useState<GoalSummaryDto[]>([]);
  const [recentTx, setRecentTx] = useState<TransactionSummaryDto[]>([]);
  const [savedCharts, setSavedCharts] = useState<ChartWidgetSummaryDto[]>([]);
  const [chartPreviews, setChartPreviews] = useState<Record<string, unknown>>({});
  const [chartWidgets, setChartWidgets] = useState<Record<string, AnalysisWidget>>({});
  const [loading, setLoading] = useState(true);

  // ── Slots ──
  const [slots, setSlots] = useState<(DashboardSlot | null)[]>(loadSlots);
  const [editMode, setEditMode] = useState(false);
  const [pickerSlotIdx, setPickerSlotIdx] = useState<number | null>(null);
  const [pickerTab, setPickerTab] = useState<SlotKind>("chart");

  // ── Transaction modals ──
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);

  // ── Persist slots ──
  useEffect(() => { saveSlots(slots); }, [slots]);

  // ── Fetch all data ──
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [accs, bds, gls, txPage, charts] = await Promise.all([
        accountService.getAll(),
        budgetService.getAll(),
        goalService.getAll(),
        transactionService.getAll({}, 0, 20),
        chartService.getAll(),
      ]);
      setAccounts(accs);
      setBudgets(bds);
      setGoals(gls);
      setRecentTx(txPage.content);
      setSavedCharts(charts);

      // Fetch chart previews + widget details for placed charts
      const chartIds = new Set(
        slots
          .filter((s): s is DashboardSlot => s !== null && s.kind === "chart" && !!s.refId)
          .map((s) => s.refId!),
      );

      if (chartIds.size > 0) {
        const results = await Promise.allSettled(
          [...chartIds].map(async (id) => {
            const [detail, preview] = await Promise.all([
              chartService.getById(id),
              chartService.previewSaved(id),
            ]);
            return { id, detail, preview };
          }),
        );

        const previews: Record<string, unknown> = {};
        const widgets: Record<string, AnalysisWidget> = {};

        for (const r of results) {
          if (r.status !== "fulfilled") continue;
          const { id, detail, preview } = r.value;
          previews[id] = preview.data;

          // Build a minimal AnalysisWidget for renderWidget
          let parsedConfig: Record<string, unknown> = {};
          try { parsedConfig = JSON.parse(detail.configuration ?? "{}"); } catch { /* empty */ }
          const frontendType = (parsedConfig.frontendType as WidgetType | undefined) ?? "bar";
          const fallback = emptyDraftFromType(frontendType);
          const widgetConfig = (parsedConfig.widgetConfig as object | undefined) ?? {};
          const size = detail.layoutSize?.toLowerCase();

          widgets[id] = {
            id: detail.id,
            title: detail.name,
            description: (parsedConfig.description as string | undefined) ?? "",
            type: frontendType,
            size: size === "lg" || size === "md" || size === "sm" ? size : "md",
            visible: true,
            order: 0,
            config: { ...fallback.config, ...widgetConfig } as AnalysisWidget["config"],
          };
        }

        setChartPreviews(previews);
        setChartWidgets(widgets);
      }
    } catch {
      // Fail silently — slots will show empty states
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [slots]);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => void fetchData(false), 30_000);
    const handleVis = () => {
      if (document.visibilityState === "visible") void fetchData(false);
    };
    document.addEventListener("visibilitychange", handleVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVis);
    };
  }, [fetchData]);

  // ── Slot actions ──
  const setSlot = (idx: number, slot: DashboardSlot | null) => {
    setSlots((prev) => {
      const next = [...prev];
      next[idx] = slot;
      return next;
    });
  };

  const removeSlot = (idx: number) => setSlot(idx, null);

  const addSlotRow = () => {
    if (slots.length >= MAX_SLOTS) return;
    setSlots((prev) => [...prev, null]);
  };

  const openPicker = (idx: number) => {
    setPickerSlotIdx(idx);
    setPickerTab("chart");
  };

  const pickWidget = (kind: SlotKind, refId?: string, label?: string, size?: SlotSize) => {
    if (pickerSlotIdx === null) return;
    setSlot(pickerSlotIdx, { kind, refId, label: label ?? kind, size });
    setPickerSlotIdx(null);
    // Trigger data refresh for chart previews
    if (kind === "chart" && refId) {
      void fetchData(false);
    }
  };

  const handleTxCreated = useCallback(() => {
    void fetchData(false);
  }, [fetchData]);

  // ── Derived ──
  const netWorth = useMemo(
    () => accounts.reduce((s, a) => s + a.balance, 0),
    [accounts],
  );

  // ── Widget renderers ──

  function renderNetWorth() {
    return (
      <div className="flex h-full flex-col">
        <p className="dash-widget-title">{t("dashboard.netWorth")}</p>
        <div className="flex flex-1 items-center">
          <div>
            <p className="dash-widget-value">{toMoney(netWorth)}</p>
            <p className="mt-1.5 text-xs text-slate-400">
              {accounts.length} {t("dashboard.pickerAccounts").toLowerCase()}
            </p>
          </div>
        </div>
        <div className="mt-auto flex items-center gap-1.5 pt-2">
          <Wallet className="h-3.5 w-3.5 text-sky-400" />
          <span className="text-xs font-medium text-slate-400">
            {accounts.map((a) => a.name).join(", ") || "—"}
          </span>
        </div>
      </div>
    );
  }

  function renderBudgetWidget(budgetId?: string) {
    const budget = budgets.find((b) => b.id === budgetId);
    if (!budget) {
      return (
        <div className="flex h-full flex-col">
          <p className="dash-widget-title">{t("dashboard.pickerBudgets")}</p>
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-slate-400">{t("dashboard.noBudgets")}</p>
          </div>
        </div>
      );
    }
    const pct = budget.totalBudget > 0
      ? Math.min(100, (budget.totalSpent / budget.totalBudget) * 100)
      : 0;
    const color = budgetColor(pct);
    return (
      <div className="flex h-full flex-col">
        <p className="dash-widget-title">{budget.name}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-lg font-bold text-slate-800">{toMoney(budget.totalSpent)}</span>
          <span className="text-xs text-slate-400">
            {t("dashboard.of")} {toMoney(budget.totalBudget)}
          </span>
        </div>
        <div className="mt-3">
          <div className="dash-progress-track">
            <div
              className="dash-progress-fill"
              style={{ width: `${pct}%`, background: color }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span style={{ color }} className="font-semibold">{pct.toFixed(0)}%</span>
            <span className="text-slate-400">
              {toMoney(budget.totalRemaining)} {t("dashboard.remaining")}
            </span>
          </div>
        </div>
        <div className="mt-auto pt-2">
          <button
            onClick={() => navigate(`/budgets/${budget.id}`)}
            className="flex items-center gap-1 text-xs font-semibold text-sky-500 transition hover:text-sky-600"
          >
            {t("budgets.viewDetails")} <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  function renderGoalWidget(goalId?: string) {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) {
      return (
        <div className="flex h-full flex-col">
          <p className="dash-widget-title">{t("dashboard.pickerGoals")}</p>
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-slate-400">{t("dashboard.noGoals")}</p>
          </div>
        </div>
      );
    }
    const pct = goal.targetAmount > 0
      ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
      : 0;
    const color = goalColor(pct);
    const circ = 2 * Math.PI * 34; // r=34
    const offset = circ - (circ * pct) / 100;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="dash-widget-title self-start">{goal.name}</p>
        <div className="dash-circle-wrap">
          <svg viewBox="0 0 80 80" width="80" height="80">
            <circle className="dash-circle-bg" cx="40" cy="40" r="34" />
            <circle
              className="dash-circle-fill"
              cx="40"
              cy="40"
              r="34"
              stroke={color}
              strokeDasharray={circ}
              strokeDashoffset={offset}
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-slate-800">{pct.toFixed(0)}%</p>
          <p className="text-xs text-slate-400">
            {toMoney(goal.currentAmount)} {t("dashboard.of")} {toMoney(goal.targetAmount)}
          </p>
        </div>
      </div>
    );
  }

  function renderAccountWidget(accountId?: string) {
    const account = accountId
      ? accounts.find((a) => a.id === accountId)
      : accounts.find((a) => a.isDefault) ?? accounts[0];
    if (!account) {
      return (
        <div className="flex h-full flex-col">
          <p className="dash-widget-title">{t("dashboard.pickerAccounts")}</p>
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-slate-400">{t("dashboard.noAccounts")}</p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex h-full flex-col">
        <p className="dash-widget-title">{account.name}</p>
        <div className="mt-1 flex items-center gap-2">
          {account.isDefault && (
            <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[0.65rem] font-bold text-sky-600">
              {t("dashboard.defaultBadge")}
            </span>
          )}
          <span className="text-xs uppercase text-slate-400">
            {account.type}
          </span>
        </div>
        <div className="mt-auto">
          <p className="text-xs text-slate-400">{t("dashboard.balance")}</p>
          <p className="dash-widget-value">{toMoney(account.balance)}</p>
        </div>
      </div>
    );
  }

  function renderRecentActivity() {
    if (recentTx.length === 0) {
      return (
        <div className="flex h-full flex-col">
          <p className="dash-widget-title">{t("dashboard.recentActivity")}</p>
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-slate-400">{t("dashboard.noRecentTx")}</p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex h-full flex-col">
        <div className="mb-2 flex items-center justify-between">
          <p className="dash-widget-title">{t("dashboard.recentActivity")}</p>
          <button
            onClick={() => navigate(ROUTES.TRANSACTIONS)}
            className="flex items-center gap-1 text-[0.65rem] font-semibold text-sky-500 hover:text-sky-600"
          >
            {t("dashboard.viewAll")} <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="flex-1 space-y-0">
          {recentTx.slice(0, 6).map((tx) => {
            const isExp = tx.type === "EXPENSE";
            const cat = tx.categoryName || t("dashboard.uncategorized");
            return (
              <div key={tx.id} className="dash-tx-row">
                <div
                  className="dash-cat-icon text-white"
                  style={{ background: catBg(cat) }}
                >
                  {cat.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-700">{tx.name}</p>
                  <p className="text-[0.65rem] text-slate-400">
                    {new Date(tx.date + "T00:00:00").toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold whitespace-nowrap ${isExp ? "text-rose-500" : "text-emerald-500"}`}
                >
                  {isExp ? "-" : "+"}{toMoney(tx.amount)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderChartWidget(chartId?: string) {
    if (!chartId) return null;
    const widget = chartWidgets[chartId];
    const preview = chartPreviews[chartId];
    if (!widget) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        </div>
      );
    }
    return (
      <div className="flex h-full flex-col">
        <p className="dash-widget-title">{widget.title}</p>
        <div className="dash-chart-preview">
          {renderWidget(widget, [], preview)}
        </div>
      </div>
    );
  }

  // ── Render a filled slot ──
  function renderSlotContent(slot: DashboardSlot) {
    switch (slot.kind) {
      case "netWorth": return renderNetWorth();
      case "budget": return renderBudgetWidget(slot.refId);
      case "goal": return renderGoalWidget(slot.refId);
      case "account": return renderAccountWidget(slot.refId);
      case "recentActivity": return renderRecentActivity();
      case "chart": return renderChartWidget(slot.refId);
      default: return null;
    }
  }

  // ── Widget size CSS class ──
  function slotSizeClass(slot: DashboardSlot): string {
    const s = slot.size ?? "normal";
    if (s === "wide") return "dash-widget-lg";
    if (s === "tall") return "dash-widget-tall";
    return "";
  }

  // ── Picker dialog ──
  function renderPicker() {
    if (pickerSlotIdx === null) return null;

    const tabs: { key: SlotKind; label: string; icon: typeof BarChart3 }[] = [
      { key: "chart", label: t("dashboard.pickerCharts"), icon: BarChart3 },
      { key: "budget", label: t("dashboard.pickerBudgets"), icon: Wallet },
      { key: "goal", label: t("dashboard.pickerGoals"), icon: Target },
      { key: "account", label: t("dashboard.pickerAccounts"), icon: CircleDollarSign },
      { key: "netWorth", label: t("dashboard.pickerQuick"), icon: PiggyBank },
    ];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          onClick={() => setPickerSlotIdx(null)}
        />
        <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">{t("dashboard.pickerTitle")}</h2>
            <button
              onClick={() => setPickerSlotIdx(null)}
              className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setPickerTab(tab.key)}
                className={`dash-picker-tab ${pickerTab === tab.key ? "dash-picker-tab-active" : ""}`}
              >
                <tab.icon className="mr-1 inline h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {pickerTab === "chart" && (
              savedCharts.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">{t("dashboard.noCharts")}</p>
              ) : (
                savedCharts.map((c) => (
                  <button
                    key={c.id}
                    className="dash-picker-item"
                    onClick={() => pickWidget("chart", c.id, c.name, "tall")}
                  >
                    <BarChart3 className="h-5 w-5 text-sky-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.chartType} · 1×2</p>
                    </div>
                  </button>
                ))
              )
            )}

            {pickerTab === "budget" && (
              budgets.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">{t("dashboard.noBudgets")}</p>
              ) : (
                budgets.map((b) => (
                  <button
                    key={b.id}
                    className="dash-picker-item"
                    onClick={() => pickWidget("budget", b.id, b.name)}
                  >
                    <Wallet className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{b.name}</p>
                      <p className="text-xs text-slate-400">
                        {toMoney(b.totalSpent)} / {toMoney(b.totalBudget)}
                      </p>
                    </div>
                  </button>
                ))
              )
            )}

            {pickerTab === "goal" && (
              goals.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">{t("dashboard.noGoals")}</p>
              ) : (
                goals.map((g) => {
                  const pct = g.targetAmount > 0
                    ? Math.min(100, (g.currentAmount / g.targetAmount) * 100)
                    : 0;
                  return (
                    <button
                      key={g.id}
                      className="dash-picker-item"
                      onClick={() => pickWidget("goal", g.id, g.name)}
                    >
                      <Target className="h-5 w-5 text-emerald-500" />
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{g.name}</p>
                        <p className="text-xs text-slate-400">{pct.toFixed(0)}% — {toMoney(g.currentAmount)}</p>
                      </div>
                    </button>
                  );
                })
              )
            )}

            {pickerTab === "account" && (
              accounts.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">{t("dashboard.noAccounts")}</p>
              ) : (
                accounts.map((a) => (
                  <button
                    key={a.id}
                    className="dash-picker-item"
                    onClick={() => pickWidget("account", a.id, a.name)}
                  >
                    <CircleDollarSign className="h-5 w-5 text-sky-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {a.name}
                        {a.isDefault && (
                          <span className="ml-1.5 rounded bg-sky-100 px-1.5 py-0.5 text-[0.6rem] font-bold text-sky-600">
                            {t("dashboard.defaultBadge")}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">{toMoney(a.balance)}</p>
                    </div>
                  </button>
                ))
              )
            )}

            {pickerTab === "netWorth" && (
              <div className="space-y-2">
                <button
                  className="dash-picker-item"
                  onClick={() => pickWidget("netWorth", undefined, t("dashboard.netWorth"))}
                >
                  <PiggyBank className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{t("dashboard.netWorth")}</p>
                    <p className="text-xs text-slate-400">{toMoney(netWorth)}</p>
                  </div>
                </button>
                <button
                  className="dash-picker-item"
                  onClick={() => pickWidget("recentActivity", undefined, t("dashboard.recentActivity"), "wide")}
                >
                  <Grip className="h-5 w-5 text-violet-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{t("dashboard.recentActivity")}</p>
                    <p className="text-xs text-slate-400">{recentTx.length} txs</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header: Greeting only ── */}
      <div>
        <p className="text-sm font-medium text-slate-400">{t(getGreetingKey())}</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
          {user?.nickname || "User"}
        </h1>
      </div>

      {/* ── Widget grid ── */}
      <div className={`dash-grid ${editMode ? "dash-edit-mode" : ""}`}>
        {slots.map((slot, idx) => {
          if (slot === null) {
            // Empty slot
            return (
              <div
                key={`slot-${idx}`}
                className="dash-empty-slot cursor-pointer"
                onClick={() => openPicker(idx)}
              >
                <Plus className="h-6 w-6 text-slate-300" />
                <span className="text-xs font-medium text-slate-400">
                  {t("dashboard.emptySlot")}
                </span>
              </div>
            );
          }

          // Filled slot
          return (
            <div
              key={`slot-${idx}`}
              className={`dash-widget ${slotSizeClass(slot)}`}
            >
              {editMode && (
                <button
                  className="dash-remove-btn"
                  onClick={() => removeSlot(idx)}
                  title={t("dashboard.removeWidget")}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              {renderSlotContent(slot)}
            </div>
          );
        })}

        {/* Add more slots button (in edit mode, if under max) */}
        {editMode && slots.length < MAX_SLOTS && (
          <button
            className="dash-empty-slot"
            onClick={addSlotRow}
          >
            <Plus className="h-6 w-6 text-slate-300" />
            <span className="text-xs font-medium text-slate-400">
              {t("dashboard.addWidget")}
            </span>
          </button>
        )}
      </div>

      {/* ── Bottom section: Recent transactions + Action buttons ── */}
      <div className="dash-bottom-section">
        {/* Recent transactions */}
        <div className="dash-bottom-tx">
          <div className="mb-3 flex items-center justify-between">
            <p className="dash-widget-title">{t("dashboard.recentActivity")}</p>
            <button
              onClick={() => navigate(ROUTES.TRANSACTIONS)}
              className="flex items-center gap-1 text-[0.65rem] font-semibold text-sky-500 hover:text-sky-600"
            >
              {t("dashboard.viewAll")} <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {recentTx.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t("dashboard.noRecentTx")}</p>
          ) : (
            <div className="space-y-0">
              {recentTx.slice(0, 5).map((tx) => {
                const isExp = tx.type === "EXPENSE";
                const cat = tx.categoryName || t("dashboard.uncategorized");
                return (
                  <div key={tx.id} className="dash-tx-row">
                    <div
                      className="dash-cat-icon text-white"
                      style={{ background: catBg(cat) }}
                    >
                      {cat.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-700">{tx.name}</p>
                      <p className="text-[0.65rem] text-slate-400">
                        {new Date(tx.date + "T00:00:00").toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold whitespace-nowrap ${isExp ? "text-rose-500" : "text-emerald-500"}`}
                    >
                      {isExp ? "-" : "+"}{toMoney(tx.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="dash-bottom-actions">
          <button onClick={() => setIncomeOpen(true)} className="dash-cta-income dash-cta-square">
            <Plus className="relative z-10 h-5 w-5" />
            <span className="relative z-10">{t("txPage.addIncome")}</span>
          </button>
          <button onClick={() => setExpenseOpen(true)} className="dash-cta-expense dash-cta-square">
            <Plus className="relative z-10 h-5 w-5" />
            <span className="relative z-10">{t("txPage.addExpense")}</span>
          </button>
          <button
            onClick={() => setEditMode((v) => !v)}
            className={`dash-cta-edit ${
              editMode
                ? "border-sky-300 bg-sky-50 text-sky-600"
                : "border-slate-200 bg-white text-slate-500 hover:border-sky-200 hover:text-sky-500"
            }`}
          >
            {editMode ? (
              <><LayoutDashboard className="h-4 w-4" />{t("dashboard.doneEditing")}</>
            ) : (
              <><Pencil className="h-4 w-4" />{t("dashboard.editDashboard")}</>
            )}
          </button>
        </div>
      </div>

      {/* ── Picker dialog ── */}
      {renderPicker()}

      {/* ── Transaction modals ── */}
      <AddTransactionModal
        type="INCOME"
        open={incomeOpen}
        onClose={() => setIncomeOpen(false)}
        onCreated={handleTxCreated}
      />
      <AddTransactionModal
        type="EXPENSE"
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        onCreated={handleTxCreated}
      />
    </div>
  );
}
