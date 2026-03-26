import { useEffect, useMemo, useRef, useState } from "react";
import Pagination from "@/components/ui/Pagination";
import {
  BarChart3,
  Check,
  Eye,
  Gauge,
  Layers3,
  LineChart,
  Maximize2,
  PieChart,
  Plus,
  RefreshCw,
  Save,
  Scale,
  Table2,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { CategorySummaryDto, FilterSummaryDto } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DateRangePicker from "../../transactions/components/DateRangePicker";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { renderWidget, getDefaultSeriesColor } from "../registry";
import { buildConfigForType } from "../mocks";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type {
  AnalysisTransaction,
  AnalysisWidget,
  BarWidgetConfig,
  ComparisonWidgetConfig,
  DateRangePreset,
  HeatmapWidgetConfig,
  LineWidgetConfig,
  StackedBarWidgetConfig,
  DonutWidgetConfig,
  WidgetDraft,
  WidgetConfig,
  WidgetSize,
  WidgetType,
} from "../types";

interface AnalysisConfiguratorProps {
  draft: WidgetDraft | null;
  draftPreviewData?: unknown;
  transactions: AnalysisTransaction[];
  categories: CategorySummaryDto[];
  savedFilters: FilterSummaryDto[];
  editMode: boolean;
  widgets: AnalysisWidget[];
  onStartCreate: (templateId?: string) => void;
  onDraftChange: (next: WidgetDraft) => void;
  onImportFilter: (filterId: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onEditWidget: (widgetId: string) => void;
  onDeleteWidget: (widgetId: string) => void;
  onResizeWidget: (widgetId: string, size: WidgetSize) => void;
  onToggleWidgetVisibility: (widgetId: string) => void;
  onRefreshPreview: () => void;
  refreshingPreview: boolean;
}

interface SelectOption {
  value: string;
  label: string;
}

const dateRangeOptions: DateRangePreset[] = ["30d", "90d", "365d", "ytd"];

const typeOptions: WidgetType[] = [
  "kpi",
  "table",
  "bar",
  "line",
  "donut",
  "stackedBar",
  "heatmap",
  "comparison",
];

function getTypeLabel(t: TFunction, type: WidgetType): string {
  const keys: Record<WidgetType, string> = {
    kpi: "analysis.widgetTypes.kpi.label",
    table: "analysis.widgetTypes.table.label",
    bar: "analysis.widgetTypes.bar.label",
    line: "analysis.widgetTypes.line.label",
    donut: "analysis.widgetTypes.donut.label",
    stackedBar: "analysis.widgetTypes.stackedBar.label",
    heatmap: "analysis.widgetTypes.heatmap.label",
    comparison: "analysis.widgetTypes.comparison.label",
  };
  return t(keys[type]);
}

function getTypeDescription(t: TFunction, type: WidgetType): string {
  const keys: Record<WidgetType, string> = {
    kpi: "analysis.widgetTypes.kpi.description",
    table: "analysis.widgetTypes.table.description",
    bar: "analysis.widgetTypes.bar.description",
    line: "analysis.widgetTypes.line.description",
    donut: "analysis.widgetTypes.donut.description",
    stackedBar: "analysis.widgetTypes.stackedBar.description",
    heatmap: "analysis.widgetTypes.heatmap.description",
    comparison: "analysis.widgetTypes.comparison.description",
  };
  return t(keys[type]);
}

function getTypeIcon(type: WidgetType): LucideIcon {
  const icons: Record<WidgetType, LucideIcon> = {
    kpi: Gauge,
    table: Table2,
    bar: BarChart3,
    line: LineChart,
    donut: PieChart,
    stackedBar: Layers3,
    heatmap: BarChart3,
    comparison: Scale,
  };
  return icons[type];
}

const controlClassName =
  "mt-1 h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition hover:border-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200";

function SingleSelectDropdown({
  value,
  onChange,
  label,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: SelectOption[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((opt) => opt.value === value);

  return (
    <div className="space-y-1" ref={ref}>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-xs transition hover:border-sky-300 hover:bg-sky-50/40 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        >
          <span className={`truncate ${selected ? "text-slate-700" : "text-slate-400"}`}>
            {selected?.label ?? placeholder}
          </span>
          <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
        </button>

        {open && (
          <div className="absolute left-0 top-full z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-slate-500 transition hover:bg-sky-50 hover:text-slate-700"
            >
              {placeholder}
            </button>
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-sky-50 hover:text-slate-800"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  allLabel,
  noOptionsLabel,
  selectedManyLabel,
  pageSize,
}: {
  label: string;
  options: Array<{ id: string; name: string }>;
  selected: string[];
  onChange: (ids: string[]) => void;
  allLabel: string;
  noOptionsLabel: string;
  selectedManyLabel: string;
  pageSize?: number;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  };

  const displayLabel =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? options.find((opt) => opt.id === selected[0])?.name ?? label
        : `${selected.length} ${selectedManyLabel}`;

  const effectivePageSize = pageSize ?? options.length;
  const totalPages = Math.max(1, Math.ceil(options.length / effectivePageSize));
  const safePage = Math.min(page, totalPages);
  const pagedOptions = options.slice((safePage - 1) * effectivePageSize, safePage * effectivePageSize);

  return (
    <div className="space-y-1" ref={ref}>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setOpen((prev) => {
              const next = !prev;
              if (next) setPage(1);
              return next;
            });
          }}
          className="flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-xs transition hover:border-sky-300 hover:bg-sky-50/40 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        >
          <span className={`truncate ${selected.length === 0 ? "text-slate-400" : "text-slate-700"}`}>{displayLabel}</span>
          <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
        </button>

        {open && (
          <div className="absolute left-0 top-full z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            {options.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">{noOptionsLabel}</p>
            ) : (
              <>
                {pagedOptions.map((option) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-600 transition hover:bg-sky-50 hover:text-slate-800"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(option.id)}
                      onChange={() => toggle(option.id)}
                      className="h-3.5 w-3.5 rounded accent-sky-500"
                    />
                    {option.name}
                  </label>
                ))}

                {totalPages > 1 && (
                  <div className="mt-1 flex items-center justify-between border-t border-slate-100 px-2 pt-2 text-xs text-slate-500">
                    <button
                      type="button"
                      className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={safePage <= 1}
                    >
                      ‹
                    </button>
                    <span>{safePage} / {totalPages}</span>
                    <button
                      type="button"
                      className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={safePage >= totalPages}
                    >
                      ›
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function rangeStartIso(preset: DateRangePreset): string {
  const now = new Date();
  const start = new Date(now);
  if (preset === "30d") start.setDate(start.getDate() - 30);
  if (preset === "90d") start.setDate(start.getDate() - 90);
  if (preset === "365d") start.setDate(start.getDate() - 365);
  if (preset === "ytd") {
    start.setMonth(0);
    start.setDate(1);
  }
  const year = start.getFullYear();
  const month = String(start.getMonth() + 1).padStart(2, "0");
  const day = String(start.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function filterDraftTransactions(transactions: AnalysisTransaction[], draft: WidgetDraft | null): AnalysisTransaction[] {
  if (!draft) return [];
  const cfg = draft.config;
  const specificDates = new Set(cfg.specificDates ?? []);
  const hasSpecificDates = specificDates.size > 0;

  const startDay = hasSpecificDates
    ? undefined
    : cfg.startDate
      ? cfg.startDate.slice(0, 10)
      : cfg.dateRange !== "custom"
        ? rangeStartIso(cfg.dateRange)
        : undefined;
  const endDay = hasSpecificDates
    ? undefined
    : cfg.endDate
      ? cfg.endDate.slice(0, 10)
      : cfg.dateRange !== "custom"
        ? new Date().toISOString().slice(0, 10)
        : undefined;

  const normalizedQuery = cfg.nameQuery.trim().toLowerCase();

  return transactions.filter((tx) => {
    const txDay = tx.date.slice(0, 10);
    if (startDay && txDay < startDay) return false;
    if (endDay && txDay > endDay) return false;
    if (cfg.transactionType && tx.type !== cfg.transactionType) return false;
    if (cfg.accountId && tx.accountId !== cfg.accountId) return false;
    if (cfg.categoryIds.length > 0 && (!tx.categoryId || !cfg.categoryIds.includes(tx.categoryId))) return false;
    if (specificDates.size > 0 && !specificDates.has(txDay)) return false;
    if (normalizedQuery && !tx.name.toLowerCase().includes(normalizedQuery)) return false;
    if (typeof cfg.amountMin === "number" && tx.amount < cfg.amountMin) return false;
    if (typeof cfg.amountMax === "number" && tx.amount > cfg.amountMax) return false;
    return true;
  });
}

export default function AnalysisConfigurator({
  draft,
  draftPreviewData,
  transactions,
  categories,
  savedFilters,
  editMode,
  widgets,
  onStartCreate,
  onDraftChange,
  onImportFilter,
  onSave,
  onCancel,
  onEditWidget,
  onDeleteWidget,
  onResizeWidget,
  onToggleWidgetVisibility,
  onRefreshPreview,
  refreshingPreview,
}: AnalysisConfiguratorProps) {
  const { t, i18n } = useTranslation();
  const [activeColorEditor, setActiveColorEditor] = useState<string | null>(null);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const draftRef = useRef<WidgetDraft | null>(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const accountOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const tx of transactions) map.set(tx.accountId, tx.accountName);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [transactions]);

  const savedFilterOptions = useMemo(
    () => savedFilters.map((filter) => ({ value: filter.id, label: filter.name })),
    [savedFilters],
  );

  const widgetTypeOptions = useMemo(
    () => typeOptions.map((type) => ({ value: type, label: getTypeLabel(t, type) })),
    [t],
  );

  const widgetSizeOptions: SelectOption[] = [
    { value: "sm", label: t("analysis.configurator.sizes.small") },
    { value: "md", label: t("analysis.configurator.sizes.medium") },
    { value: "lg", label: t("analysis.configurator.sizes.large") },
  ];

  const dateRangeSelectOptions = dateRangeOptions.map((option) => ({
    value: option,
    label: t(`analysis.configurator.dateRanges.${option}`),
  }));

  const movementTypeOptions: SelectOption[] = [
    { value: "INCOME", label: t("analysis.configurator.transactionTypeOptions.income") },
    { value: "EXPENSE", label: t("analysis.configurator.transactionTypeOptions.expense") },
  ];

  const accountSelectOptions = accountOptions.map((account) => ({ value: account.id, label: account.name }));

  const categoryOptions = useMemo(() => {
    const txType = draft?.config.transactionType;
    const fromCatalog = categories
      .filter((category) => !txType || !category.type || category.type === txType)
      .map((category) => ({ id: category.id, name: category.name }));

    if (fromCatalog.length > 0) {
      return fromCatalog.sort((a, b) => a.name.localeCompare(b.name));
    }

    const map = new Map<string, string>();
    for (const tx of transactions) {
      if (txType && tx.type !== txType) continue;
      if (tx.categoryId) map.set(tx.categoryId, tx.categoryName);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, draft?.config.transactionType, transactions]);

  const filteredDraftTransactions = useMemo(
    () => filterDraftTransactions(transactions, draft),
    [transactions, draft],
  );

  const editableSeriesKeys = useMemo(() => {
    if (!draft) return [] as string[];
    if (draft.type === "bar") {
      const barConfig = draft.config as BarWidgetConfig;
      if (barConfig.mode === "expensesByCategory") {
        const keys = new Set<string>();
        for (const tx of filteredDraftTransactions) {
          if (barConfig.transactionType && tx.type !== barConfig.transactionType) continue;
          keys.add(tx.categoryName);
        }
        return Array.from(keys).sort((a, b) => a.localeCompare(b));
      }
      if (barConfig.mode === "expensesByAccount") {
        const keys = new Set<string>();
        for (const tx of filteredDraftTransactions) {
          if (barConfig.transactionType && tx.type !== barConfig.transactionType) continue;
          keys.add(tx.accountName);
        }
        return Array.from(keys).sort((a, b) => a.localeCompare(b));
      }

      const keys = new Set<string>();
      for (const tx of filteredDraftTransactions) {
        if (tx.type === "INCOME") {
          keys.add(new Date(tx.date).toLocaleDateString(i18n.resolvedLanguage, { month: "short" }));
        }
      }
      return Array.from(keys);
    }

    if (draft.type === "donut") {
      const donutConfig = draft.config as DonutWidgetConfig;
      const keys = new Set<string>();
      for (const tx of filteredDraftTransactions) {
        if (donutConfig.transactionType && tx.type !== donutConfig.transactionType) continue;
        keys.add(donutConfig.mode === "expensesByAccount" ? tx.accountName : tx.categoryName);
      }
      return Array.from(keys).sort((a, b) => a.localeCompare(b));
    }

    if (draft.type === "line") {
      const lineConfig = draft.config as LineWidgetConfig;

      if (lineConfig.mode === "incomeVsExpense") {
        return ["income", "expense"];
      }

      if (lineConfig.mode === "balanceTrend") {
        return ["balance"];
      }

      const keySet = new Set<string>();
      const source = filteredDraftTransactions;
      const keyFromTx = (tx: AnalysisTransaction) =>
        lineConfig.mode === "byAccount"
          ? tx.accountName
          : (tx.categoryName || t("analysis.configurator.uncategorized"));

      for (const tx of source) keySet.add(keyFromTx(tx));
      const allKeys = Array.from(keySet).sort((a, b) => a.localeCompare(b));
      if (!lineConfig.seriesKeys || lineConfig.seriesKeys.length === 0) return allKeys;
      const selectedSet = new Set(lineConfig.seriesKeys);
      return allKeys.filter((key) => selectedSet.has(key));
    }

    if (draft.type === "stackedBar") {
      const stackedConfig = draft.config as StackedBarWidgetConfig;
      if (stackedConfig.stackBy === "type") {
        return ["income", "expense"];
      }

      const keySet = new Set<string>();
      for (const tx of filteredDraftTransactions) {
        if (stackedConfig.stackBy === "account") keySet.add(tx.accountName);
        if (stackedConfig.stackBy === "category") keySet.add(tx.categoryName || t("analysis.configurator.uncategorized"));
      }
      const allKeys = Array.from(keySet).sort((a, b) => a.localeCompare(b));
      if (!stackedConfig.seriesKeys || stackedConfig.seriesKeys.length === 0) return allKeys;
      const selectedSet = new Set(stackedConfig.seriesKeys);
      return allKeys.filter((key) => selectedSet.has(key));
    }

    if (draft.type === "comparison") {
      return ["income", "expense"];
    }

    return [] as string[];
  }, [draft, filteredDraftTransactions, i18n.resolvedLanguage, t]);

  const lineSeriesOptions = useMemo(() => {
    if (!draft || draft.type !== "line") return [] as Array<{ id: string; name: string }>;
    const lineConfig = draft.config as LineWidgetConfig;
    if (lineConfig.mode === "byAccount") {
      return accountOptions.map((account) => ({ id: account.name, name: account.name }));
    }
    if (lineConfig.mode === "byCategory") {
      const options = categoryOptions.map((category) => ({ id: category.name, name: category.name }));
      const hasUncategorized = filteredDraftTransactions.some((tx) => !tx.categoryName);
      if (hasUncategorized) {
        options.push({
          id: t("analysis.configurator.uncategorized"),
          name: t("analysis.configurator.uncategorized"),
        });
      }
      return options;
    }
    return [] as Array<{ id: string; name: string }>;
  }, [accountOptions, categoryOptions, draft, filteredDraftTransactions, t]);

  const stackedSeriesOptions = useMemo(() => {
    if (!draft || draft.type !== "stackedBar") return [] as Array<{ id: string; name: string }>;
    const stackedConfig = draft.config as StackedBarWidgetConfig;
    if (stackedConfig.stackBy === "account") {
      return accountOptions.map((account) => ({ id: account.name, name: account.name }));
    }
    if (stackedConfig.stackBy === "category") {
      const options = categoryOptions.map((category) => ({ id: category.name, name: category.name }));
      const hasUncategorized = filteredDraftTransactions.some((tx) => !tx.categoryName);
      if (hasUncategorized) {
        options.push({
          id: t("analysis.configurator.uncategorized"),
          name: t("analysis.configurator.uncategorized"),
        });
      }
      return options;
    }
    return [] as Array<{ id: string; name: string }>;
  }, [accountOptions, categoryOptions, draft, filteredDraftTransactions, t]);

  const previewWidget: AnalysisWidget | null = useMemo(() => {
    if (!draft) return null;
    return {
      id: "preview",
      order: 0,
      visible: true,
      title: draft.title,
      description: draft.description,
      type: draft.type,
      size: draft.size,
      config: draft.config,
    };
  }, [draft]);

  const changeDraftConfig = (patch: Partial<WidgetConfig>) => {
    const currentDraft = draftRef.current;
    if (!currentDraft) return;

    const next = {
      ...currentDraft,
      config: {
        ...(currentDraft.config as unknown as Record<string, unknown>),
        ...(patch as unknown as Record<string, unknown>),
      } as unknown as WidgetConfig,
    };

    draftRef.current = next;
    onDraftChange({
      ...next,
    });
  };

  const startFromType = (type: WidgetType) => {
    onStartCreate(type);
  };

  const WIDGET_PAGE_SIZE = 15;
  const [visiblePage, setVisiblePage] = useState(1);
  const [hiddenPage, setHiddenPage] = useState(1);

  const cardTitle = editMode && !draft
    ? t("analysis.actions.editDashboard")
    : t("analysis.configurator.title");
  const visibleWidgets = widgets.filter((widget) => widget.visible);
  const hiddenWidgets = widgets.filter((widget) => !widget.visible);

  const visibleTotalPages = Math.max(1, Math.ceil(visibleWidgets.length / WIDGET_PAGE_SIZE));
  const hiddenTotalPages = Math.max(1, Math.ceil(hiddenWidgets.length / WIDGET_PAGE_SIZE));
  const pagedVisibleWidgets = visibleWidgets.slice((visiblePage - 1) * WIDGET_PAGE_SIZE, visiblePage * WIDGET_PAGE_SIZE);
  const pagedHiddenWidgets = hiddenWidgets.slice((hiddenPage - 1) * WIDGET_PAGE_SIZE, hiddenPage * WIDGET_PAGE_SIZE);

  return (
    <div className="sticky top-4 space-y-4">
      <Card className="analysis-configurator-card border-slate-200">
        <div className="analysis-configurator-strip" />
        <CardHeader className="pb-3">
          <CardTitle className="bg-gradient-to-r from-sky-600 to-emerald-500 bg-clip-text text-lg text-transparent">
            {cardTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* ── Edit mode: widget list ─────────────────────────────── */}
          {editMode && !draft && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">
                {t("analysis.configurator.editHintPrefix")} <strong>S / M / L</strong> {t("analysis.configurator.editHintSuffix")}
              </p>

              {widgets.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">
                  {t("analysis.configurator.noCharts")}
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("analysis.configurator.inDashboard")}
                    </p>
                    {pagedVisibleWidgets.map((widget) => (
                    <div
                      key={widget.id}
                      role="button"
                      tabIndex={0}
                      className="analysis-widget-list-item is-visible-list"
                      onClick={() => onEditWidget(widget.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onEditWidget(widget.id);
                        }
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {widget.title}
                        </p>
                        {widget.description && (
                          <p className="truncate text-xs text-slate-500">{widget.description}</p>
                        )}
                      </div>

                      {/* Controls — stop propagation so card click doesn't fire */}
                      <div
                        className="flex shrink-0 items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="analysis-dashboard-toggle is-active"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleWidgetVisibility(widget.id);
                          }}
                          title={t("analysis.configurator.removeFromDashboard")}
                          aria-label={t("analysis.configurator.removeFromDashboard")}
                        >
                          <span className="analysis-dashboard-toggle__fill" />
                          <Check className="analysis-dashboard-toggle__check h-3 w-3" />
                          <span className="analysis-dashboard-toggle__tooltip">{t("analysis.configurator.remove")}</span>
                        </button>

                        <div className="analysis-size-toggle">
                          {(["sm", "md", "lg"] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              className={`analysis-size-btn ${widget.size === s ? "active" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onResizeWidget(widget.id, s);
                              }}
                              title={s === "sm"
                                ? t("analysis.configurator.sizes.small")
                                : s === "md"
                                  ? t("analysis.configurator.sizes.medium")
                                  : t("analysis.configurator.sizes.large")}
                            >
                              {s.toUpperCase()}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          className="btn-delete-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteWidget(widget.id);
                          }}
                          title={t("analysis.configurator.delete")}
                          aria-label={t("analysis.configurator.delete")}
                        >
                          <Trash2 className="btn-delete-icon__icon h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    ))}
                    {visibleWidgets.length === 0 && (
                      <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        {t("analysis.configurator.noActiveCharts")}
                      </p>
                    )}
                    <Pagination
                      currentPage={visiblePage}
                      totalPages={visibleTotalPages}
                      onPageChange={setVisiblePage}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("analysis.configurator.outDashboard")}
                    </p>
                    {pagedHiddenWidgets.map((widget) => (
                      <div
                        key={widget.id}
                        role="button"
                        tabIndex={0}
                        className="analysis-widget-list-item is-muted is-hidden-list"
                        onClick={() => onEditWidget(widget.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onEditWidget(widget.id);
                          }
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-700">
                            {widget.title}
                          </p>
                          {widget.description && (
                            <p className="truncate text-xs text-slate-500">{widget.description}</p>
                          )}
                        </div>

                        <div
                          className="flex shrink-0 items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="analysis-dashboard-toggle"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleWidgetVisibility(widget.id);
                            }}
                            title={t("analysis.configurator.addToDashboard")}
                            aria-label={t("analysis.configurator.addToDashboard")}
                          >
                            <span className="analysis-dashboard-toggle__fill" />
                            <Check className="analysis-dashboard-toggle__check h-3 w-3" />
                            <span className="analysis-dashboard-toggle__tooltip">{t("analysis.configurator.add")}</span>
                          </button>

                          <button
                            type="button"
                            className="btn-delete-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteWidget(widget.id);
                            }}
                            title={t("analysis.configurator.delete")}
                            aria-label={t("analysis.configurator.delete")}
                          >
                            <Trash2 className="btn-delete-icon__icon h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {hiddenWidgets.length === 0 && (
                      <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        {t("analysis.configurator.allChartsActive")}
                      </p>
                    )}
                    <Pagination
                      currentPage={hiddenPage}
                      totalPages={hiddenTotalPages}
                      onPageChange={setHiddenPage}
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => onStartCreate()}
                className="analysis-add-btn"
              >
                <Plus className="h-4 w-4" />
                {t("analysis.actions.addWidget")}
              </button>
            </div>
          )}

          {/* ── Normal mode: type picker ───────────────────────────── */}
          {!editMode && !draft && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                {t("analysis.configurator.startHint")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {typeOptions.map((type) => {
                  const Icon = getTypeIcon(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => startFromType(type)}
                      className="analysis-type-card rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 text-left shadow-sm"
                    >
                      <div className="flex items-start gap-2">
                        <span className="analysis-type-icon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-slate-600 transition-colors duration-200">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span>
                          <p className="text-sm font-semibold text-slate-800">{getTypeLabel(t, type)}</p>
                          <p className="text-xs text-slate-500">{getTypeDescription(t, type)}</p>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Draft form (edit or create) ────────────────────────── */}
          {draft && (
            <>
              <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {t("analysis.configurator.importSavedFilter")}
                </p>
                <div className="mt-2 flex gap-2">
                  <SingleSelectDropdown
                    label=""
                    value={draft.importedFilterId ?? ""}
                    options={savedFilterOptions}
                    placeholder={t("analysis.configurator.selectFilter")}
                    onChange={(nextFilterId) => {
                      if (!nextFilterId) {
                        onDraftChange({ ...draft, importedFilterId: undefined });
                        return;
                      }
                      onImportFilter(nextFilterId);
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <label className="text-sm font-medium text-slate-700">
                  {t("analysis.configurator.fields.title")}
                  <input
                    className={controlClassName}
                    value={draft.title}
                    placeholder={t("analysis.configurator.fields.titlePlaceholder")}
                    onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t("analysis.configurator.fields.description")}
                  <input
                    className={controlClassName}
                    value={draft.description}
                    placeholder={t("analysis.configurator.fields.descriptionPlaceholder")}
                    onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SingleSelectDropdown
                  label={t("analysis.configurator.fields.type")}
                  value={draft.type}
                  options={widgetTypeOptions}
                  placeholder={t("analysis.configurator.selectType")}
                  onChange={(value) => {
                    const newType = value as WidgetType;
                    if (newType === draft.type) return;
                    const newConfig = buildConfigForType(newType, draft.config);
                    onDraftChange({
                      ...draft,
                      type: newType,
                      title: draft.title || getTypeLabel(t, newType),
                      config: newConfig,
                    });
                  }}
                />
                <SingleSelectDropdown
                  label={t("analysis.configurator.fields.size")}
                  value={draft.size}
                  options={widgetSizeOptions}
                  placeholder={t("analysis.configurator.selectSize")}
                  onChange={(value) => onDraftChange({ ...draft, size: value as AnalysisWidget["size"] })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SingleSelectDropdown
                  label={t("analysis.configurator.fields.quickRange")}
                  value={draft.config.dateRange === "custom" ? "" : draft.config.dateRange}
                  options={dateRangeSelectOptions}
                  placeholder={t("analysis.configurator.noQuickRange")}
                  onChange={(value) =>
                    changeDraftConfig({
                      dateRange: value ? (value as DateRangePreset) : "custom",
                      startDate: undefined,
                      endDate: undefined,
                      specificDates: [],
                    })}
                />
                <SingleSelectDropdown
                  label={t("analysis.configurator.fields.transactionType")}
                  value={draft.config.transactionType ?? ""}
                  options={movementTypeOptions}
                  placeholder={t("analysis.configurator.all")}
                  onChange={(value) =>
                    changeDraftConfig({
                      transactionType: value === "INCOME" || value === "EXPENSE" ? value : undefined,
                    })}
                />
              </div>

              <DateRangePicker
                startDate={draft.config.startDate ?? ""}
                endDate={draft.config.endDate ?? ""}
                onChangeStart={(value) =>
                  changeDraftConfig({
                    dateRange: "custom",
                    startDate: value || undefined,
                    specificDates: [],
                  })}
                onChangeEnd={(value) =>
                  changeDraftConfig({
                    dateRange: "custom",
                    endDate: value || undefined,
                    specificDates: [],
                  })}
                specificDates={draft.config.specificDates}
                onChangeSpecificDates={(dates) =>
                  changeDraftConfig({
                    dateRange: "custom",
                    specificDates: dates,
                    startDate: undefined,
                    endDate: undefined,
                  })}
              />

              <div className="grid grid-cols-2 gap-3">
                <SingleSelectDropdown
                  label={t("analysis.configurator.fields.account")}
                  value={draft.config.accountId ?? ""}
                  options={accountSelectOptions}
                  placeholder={t("analysis.configurator.all")}
                  onChange={(value) => changeDraftConfig({ accountId: value || undefined })}
                />
                <label className="text-sm font-medium text-slate-700">
                  {t("analysis.configurator.fields.searchName")}
                  <input
                    className={controlClassName}
                    value={draft.config.nameQuery}
                    onChange={(event) => changeDraftConfig({ nameQuery: event.target.value })}
                    placeholder={t("analysis.configurator.fields.searchNamePlaceholder")}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium text-slate-700">
                  {t("analysis.configurator.fields.amountMin")}
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={controlClassName}
                    value={draft.config.amountMin ?? ""}
                    onChange={(event) =>
                      changeDraftConfig({
                        amountMin: event.target.value ? Number(event.target.value) : undefined,
                      })}
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t("analysis.configurator.fields.amountMax")}
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={controlClassName}
                    value={draft.config.amountMax ?? ""}
                    onChange={(event) =>
                      changeDraftConfig({
                        amountMax: event.target.value ? Number(event.target.value) : undefined,
                      })}
                  />
                </label>
              </div>

              <MultiSelectDropdown
                label={t("analysis.configurator.fields.categories")}
                options={categoryOptions}
                selected={draft.config.categoryIds}
                onChange={(ids) => changeDraftConfig({ categoryIds: ids })}
                allLabel={t("analysis.configurator.all")}
                noOptionsLabel={t("analysis.configurator.noCategories")}
                selectedManyLabel={t("analysis.configurator.categoriesCount")}
              />

              {"metric" in draft.config && (
                <SingleSelectDropdown
                  label={t("analysis.configurator.fields.kpiMetric")}
                  value={draft.config.metric}
                  placeholder={t("analysis.configurator.selectMetric")}
                  options={[
                    { value: "income", label: t("analysis.configurator.kpiOptions.income") },
                    { value: "expense", label: t("analysis.configurator.kpiOptions.expense") },
                    { value: "balance", label: t("analysis.configurator.kpiOptions.balance") },
                    { value: "savingsRate", label: t("analysis.configurator.kpiOptions.savingsRate") },
                  ]}
                  onChange={(value) =>
                    changeDraftConfig({
                      metric: value as "income" | "expense" | "balance" | "savingsRate",
                    })}
                />
              )}

              {"groupBy" in draft.config && (
                <div className="grid grid-cols-2 gap-3">
                  <SingleSelectDropdown
                    label={t("analysis.configurator.fields.groupBy")}
                    value={draft.config.groupBy}
                    placeholder={t("analysis.configurator.selectGroup")}
                    options={[
                      { value: "category", label: t("analysis.configurator.groupByOptions.category") },
                      { value: "account", label: t("analysis.configurator.groupByOptions.account") },
                    ]}
                    onChange={(value) => changeDraftConfig({ groupBy: value as "category" | "account" })}
                  />
                  {"valueMode" in draft.config && (
                    <SingleSelectDropdown
                      label={t("analysis.configurator.fields.value")}
                      value={draft.config.valueMode}
                      placeholder={t("analysis.configurator.selectValue")}
                      options={[
                        { value: "amount", label: t("analysis.configurator.valueOptions.amount") },
                        { value: "count", label: t("analysis.configurator.valueOptions.count") },
                      ]}
                      onChange={(value) => changeDraftConfig({ valueMode: value as "amount" | "count" })}
                    />
                  )}
                </div>
              )}

              {draft.type === "bar" && "mode" in draft.config && "valueMode" in draft.config && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <SingleSelectDropdown
                      label={t("analysis.configurator.fields.barMode")}
                      value={draft.config.mode}
                      placeholder={t("analysis.configurator.selectMode")}
                      options={[
                        { value: "expensesByCategory", label: t("analysis.configurator.barModeOptions.expensesByCategory") },
                        { value: "expensesByAccount", label: t("analysis.configurator.barModeOptions.expensesByAccount") },
                        { value: "incomeByMonth", label: t("analysis.configurator.barModeOptions.incomeByMonth") },
                      ]}
                      onChange={(value) =>
                        changeDraftConfig({
                          mode: value as "expensesByCategory" | "incomeByMonth",
                        })}
                    />
                    <SingleSelectDropdown
                      label={t("analysis.configurator.fields.yAxis")}
                      value={draft.config.valueMode}
                      placeholder={t("analysis.configurator.selectValue")}
                      options={[
                        { value: "amount", label: t("analysis.configurator.valueOptions.amount") },
                        { value: "count", label: t("analysis.configurator.valueOptions.count") },
                      ]}
                      onChange={(value) => changeDraftConfig({ valueMode: value as "amount" | "count" })}
                    />
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <input
                      type="checkbox"
                      checked={(draft.config as BarWidgetConfig).gradientFill ?? false}
                      onChange={(e) => changeDraftConfig({ gradientFill: e.target.checked })}
                      className="h-3.5 w-3.5 rounded accent-indigo-500"
                    />
                    <span className="text-sm text-slate-600">{t("analysis.configurator.gradientFill")}</span>
                  </label>

                  {editableSeriesKeys.length > 0 && (
                    <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {t("analysis.configurator.colorPerBar")}
                      </p>
                      <div className="space-y-1">
                        {editableSeriesKeys.map((key) => {
                          const editorId = `bar:${key}`;
                          const currentColor = (draft.config as BarWidgetConfig).seriesColors?.[key] ?? getDefaultSeriesColor(key, editableSeriesKeys);
                          const isOpen = activeColorEditor === editorId;
                          const existingColors = (draft.config as BarWidgetConfig).seriesColors ?? {};

                          return (
                            <div key={key} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="h-5 w-5 shrink-0 cursor-pointer rounded border border-slate-300 shadow-sm hover:scale-110 transition-transform"
                                  style={{ backgroundColor: currentColor }}
                                  onClick={() => setActiveColorEditor(isOpen ? null : editorId)}
                                />
                                <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600">{key}</span>
                                <span className="shrink-0 font-mono text-[10px] text-slate-400">{currentColor.toUpperCase()}</span>
                              </div>
                              {isOpen && (
                                <div className="ml-7 space-y-1">
                                  <HexColorPicker
                                    color={currentColor}
                                    onChange={(color) =>
                                      changeDraftConfig({
                                        seriesColors: { ...existingColors, [key]: color },
                                      })}
                                    style={{ width: "100%", height: "140px" }}
                                  />
                                  <HexColorInput
                                    color={currentColor}
                                    onChange={(color) =>
                                      changeDraftConfig({
                                        seriesColors: { ...existingColors, [key]: color },
                                      })}
                                    prefixed
                                    className="h-7 w-full rounded border border-slate-300 bg-slate-50 px-2 text-[11px] uppercase"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {draft.type === "line" && "mode" in draft.config && "valueMode" in draft.config && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <SingleSelectDropdown
                      label={t("analysis.configurator.fields.lineMode")}
                      value={draft.config.mode}
                      placeholder={t("analysis.configurator.selectMode")}
                      options={[
                        { value: "balanceTrend", label: t("analysis.configurator.lineModeOptions.balanceTrend") },
                        { value: "incomeVsExpense", label: t("analysis.configurator.lineModeOptions.incomeVsExpense") },
                        { value: "byCategory", label: t("analysis.configurator.lineModeOptions.byCategory") },
                        { value: "byAccount", label: t("analysis.configurator.lineModeOptions.byAccount") },
                      ]}
                      onChange={(value) =>
                        changeDraftConfig({
                          mode: value as LineWidgetConfig["mode"],
                          splitBy:
                            value === "byCategory"
                              ? "category"
                              : value === "byAccount"
                                ? "account"
                                : "none",
                          seriesKeys: [],
                        })}
                    />
                    <SingleSelectDropdown
                      label={t("analysis.configurator.fields.value")}
                      value={draft.config.valueMode}
                      placeholder={t("analysis.configurator.selectValue")}
                      options={[
                        { value: "amount", label: t("analysis.configurator.valueOptions.amount") },
                        { value: "count", label: t("analysis.configurator.valueOptions.count") },
                      ]}
                      onChange={(value) => changeDraftConfig({ valueMode: value as "amount" | "count" })}
                    />
                  </div>

                  <SingleSelectDropdown
                    label={t("analysis.configurator.fields.lineVisualization")}
                    value={(draft.config as LineWidgetConfig).visualization ?? "line"}
                    placeholder={t("analysis.configurator.selectMode")}
                    options={[
                      { value: "line", label: t("analysis.configurator.lineVisualizationOptions.line") },
                      { value: "area", label: t("analysis.configurator.lineVisualizationOptions.area") },
                    ]}
                    onChange={(value) =>
                      changeDraftConfig({
                        visualization: value as "line" | "area",
                      })}
                  />

                  <div className="flex flex-col gap-1.5">
                    {(draft.config as LineWidgetConfig).visualization === "area" && (
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <input
                          type="checkbox"
                          checked={(draft.config as LineWidgetConfig).blurFill ?? false}
                          onChange={(e) => changeDraftConfig({ blurFill: e.target.checked })}
                          className="h-3.5 w-3.5 rounded accent-indigo-500"
                        />
                        <span className="text-sm text-slate-600">{t("analysis.configurator.blurFill")}</span>
                      </label>
                    )}
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <input
                        type="checkbox"
                        checked={(draft.config as LineWidgetConfig).neonGlow ?? false}
                        onChange={(e) => changeDraftConfig({ neonGlow: e.target.checked })}
                        className="h-3.5 w-3.5 rounded accent-indigo-500"
                      />
                      <span className="text-sm text-slate-600">{t("analysis.configurator.neonGlow")}</span>
                    </label>
                  </div>

                  {((draft.config as LineWidgetConfig).mode === "byCategory" || (draft.config as LineWidgetConfig).mode === "byAccount") && (
                    <MultiSelectDropdown
                      label={t("analysis.configurator.fields.lineSeries")}
                      options={lineSeriesOptions}
                      selected={(draft.config as LineWidgetConfig).seriesKeys ?? []}
                      onChange={(ids) => changeDraftConfig({ seriesKeys: ids })}
                      allLabel={t("analysis.configurator.all")}
                      noOptionsLabel={
                        (draft.config as LineWidgetConfig).mode === "byCategory"
                          ? t("analysis.configurator.noCategories")
                          : t("analysis.configurator.noAccounts")
                      }
                      selectedManyLabel={t("analysis.configurator.categoriesCount")}
                      pageSize={50}
                    />
                  )}

                  {editableSeriesKeys.length > 0 && (
                    <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {t("analysis.configurator.colorsAndLegend")}
                      </p>
                      <div className="space-y-1">
                        {editableSeriesKeys.map((key) => {
                          const editorId = `line:${key}`;
                          const currentColor = (draft.config as LineWidgetConfig).seriesColors?.[key] ?? getDefaultSeriesColor(key, editableSeriesKeys);
                          const isOpen = activeColorEditor === editorId;
                          const existingColors = (draft.config as LineWidgetConfig).seriesColors ?? {};

                          return (
                            <div key={key} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="h-5 w-5 shrink-0 cursor-pointer rounded border border-slate-300 shadow-sm hover:scale-110 transition-transform"
                                  style={{ backgroundColor: currentColor }}
                                  onClick={() => setActiveColorEditor(isOpen ? null : editorId)}
                                />
                                <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600">{key}</span>
                                <span className="shrink-0 font-mono text-[10px] text-slate-400">{currentColor.toUpperCase()}</span>
                              </div>
                              {isOpen && (
                                <div className="ml-7 space-y-1">
                                  <HexColorPicker
                                    color={currentColor}
                                    onChange={(color) =>
                                      changeDraftConfig({
                                        seriesColors: { ...existingColors, [key]: color },
                                      })}
                                    style={{ width: "100%", height: "140px" }}
                                  />
                                  <HexColorInput
                                    color={currentColor}
                                    onChange={(color) =>
                                      changeDraftConfig({
                                        seriesColors: { ...existingColors, [key]: color },
                                      })}
                                    prefixed
                                    className="h-7 w-full rounded border border-slate-300 bg-slate-50 px-2 text-[11px] uppercase"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {draft.type === "donut" && "mode" in draft.config && "valueMode" in draft.config && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <SingleSelectDropdown
                      label={t("analysis.configurator.fields.donutMode")}
                      value={draft.config.mode}
                      placeholder={t("analysis.configurator.selectMode")}
                      options={[
                        { value: "expensesByCategory", label: t("analysis.configurator.donutModeOptions.expensesByCategory") },
                        { value: "expensesByAccount", label: t("analysis.configurator.donutModeOptions.expensesByAccount") },
                      ]}
                      onChange={(value) =>
                        changeDraftConfig({
                          mode: value as "expensesByCategory" | "expensesByAccount",
                        })}
                    />
                    <SingleSelectDropdown
                      label={t("analysis.configurator.fields.value")}
                      value={draft.config.valueMode}
                      placeholder={t("analysis.configurator.selectValue")}
                      options={[
                        { value: "amount", label: t("analysis.configurator.valueOptions.amount") },
                        { value: "count", label: t("analysis.configurator.valueOptions.count") },
                      ]}
                      onChange={(value) => changeDraftConfig({ valueMode: value as "amount" | "count" })}
                    />
                  </div>

                  {editableSeriesKeys.length > 0 && (
                    <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {t("analysis.configurator.colorsAndLegend")}
                      </p>
                      <div className="space-y-1">
                        {editableSeriesKeys.map((key) => {
                          const editorId = `donut:${key}`;
                          const currentColor = (draft.config as DonutWidgetConfig).seriesColors?.[key] ?? getDefaultSeriesColor(key, editableSeriesKeys);
                          const isOpen = activeColorEditor === editorId;
                          const existingColors = (draft.config as DonutWidgetConfig).seriesColors ?? {};

                          return (
                            <div key={key} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="h-5 w-5 shrink-0 cursor-pointer rounded border border-slate-300 shadow-sm hover:scale-110 transition-transform"
                                  style={{ backgroundColor: currentColor }}
                                  onClick={() => setActiveColorEditor(isOpen ? null : editorId)}
                                />
                                <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600">{key}</span>
                                <span className="shrink-0 font-mono text-[10px] text-slate-400">{currentColor.toUpperCase()}</span>
                              </div>
                              {isOpen && (
                                <div className="ml-7 space-y-1">
                                  <HexColorPicker
                                    color={currentColor}
                                    onChange={(color) =>
                                      changeDraftConfig({
                                        seriesColors: { ...existingColors, [key]: color },
                                      })}
                                    style={{ width: "100%", height: "140px" }}
                                  />
                                  <HexColorInput
                                    color={currentColor}
                                    onChange={(color) =>
                                      changeDraftConfig({
                                        seriesColors: { ...existingColors, [key]: color },
                                      })}
                                    prefixed
                                    className="h-7 w-full rounded border border-slate-300 bg-slate-50 px-2 text-[11px] uppercase"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {draft.type === "stackedBar" && "stackBy" in draft.config && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <SingleSelectDropdown
                      label={t("analysis.configurator.fields.stackBy")}
                      value={draft.config.stackBy}
                      placeholder={t("analysis.configurator.selectCriteria")}
                      options={[
                        { value: "type", label: t("analysis.configurator.stackByOptions.type") },
                        { value: "account", label: t("analysis.configurator.stackByOptions.account") },
                        { value: "category", label: t("analysis.configurator.stackByOptions.category") },
                      ]}
                      onChange={(value) =>
                        changeDraftConfig({
                          stackBy: value as StackedBarWidgetConfig["stackBy"],
                          seriesKeys: [],
                        })}
                    />
                    <SingleSelectDropdown
                      label={t("analysis.configurator.fields.value")}
                      value={(draft.config as StackedBarWidgetConfig).valueMode ?? "amount"}
                      placeholder={t("analysis.configurator.selectValue")}
                      options={[
                        { value: "amount", label: t("analysis.configurator.valueOptions.amount") },
                        { value: "count", label: t("analysis.configurator.valueOptions.count") },
                      ]}
                      onChange={(value) => changeDraftConfig({ valueMode: value as "amount" | "count" })}
                    />
                  </div>

                  {((draft.config as StackedBarWidgetConfig).stackBy === "category" || (draft.config as StackedBarWidgetConfig).stackBy === "account") && (
                    <MultiSelectDropdown
                      label={t("analysis.configurator.fields.lineSeries")}
                      options={stackedSeriesOptions}
                      selected={(draft.config as StackedBarWidgetConfig).seriesKeys ?? []}
                      onChange={(ids) => changeDraftConfig({ seriesKeys: ids })}
                      allLabel={t("analysis.configurator.all")}
                      noOptionsLabel={
                        (draft.config as StackedBarWidgetConfig).stackBy === "category"
                          ? t("analysis.configurator.noCategories")
                          : t("analysis.configurator.noAccounts")
                      }
                      selectedManyLabel={t("analysis.configurator.categoriesCount")}
                      pageSize={50}
                    />
                  )}

                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <input
                      type="checkbox"
                      checked={(draft.config as StackedBarWidgetConfig).gradientFill ?? false}
                      onChange={(e) => changeDraftConfig({ gradientFill: e.target.checked })}
                      className="h-3.5 w-3.5 rounded accent-indigo-500"
                    />
                    <span className="text-sm text-slate-600">{t("analysis.configurator.gradientFill")}</span>
                  </label>

                  {editableSeriesKeys.length > 0 && (
                    <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {t("analysis.configurator.colorsAndLegend")}
                      </p>
                      <div className="space-y-1">
                        {editableSeriesKeys.map((key) => {
                          const editorId = `stacked:${key}`;
                          const currentColor = (draft.config as StackedBarWidgetConfig).seriesColors?.[key] ?? getDefaultSeriesColor(key, editableSeriesKeys);
                          const isOpen = activeColorEditor === editorId;
                          const existingColors = (draft.config as StackedBarWidgetConfig).seriesColors ?? {};

                          return (
                            <div key={key} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="h-5 w-5 shrink-0 cursor-pointer rounded border border-slate-300 shadow-sm hover:scale-110 transition-transform"
                                  style={{ backgroundColor: currentColor }}
                                  onClick={() => setActiveColorEditor(isOpen ? null : editorId)}
                                />
                                <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600">{key}</span>
                                <span className="shrink-0 font-mono text-[10px] text-slate-400">{currentColor.toUpperCase()}</span>
                              </div>
                              {isOpen && (
                                <div className="ml-7 space-y-1">
                                  <HexColorPicker
                                    color={currentColor}
                                    onChange={(color) =>
                                      changeDraftConfig({
                                        seriesColors: { ...existingColors, [key]: color },
                                      })}
                                    style={{ width: "100%", height: "140px" }}
                                  />
                                  <HexColorInput
                                    color={currentColor}
                                    onChange={(color) =>
                                      changeDraftConfig({
                                        seriesColors: { ...existingColors, [key]: color },
                                      })}
                                    prefixed
                                    className="h-7 w-full rounded border border-slate-300 bg-slate-50 px-2 text-[11px] uppercase"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {"compare" in draft.config && (
                <>
                  <SingleSelectDropdown
                    label={t("analysis.configurator.fields.comparison")}
                    value={draft.config.compare}
                    placeholder={t("analysis.configurator.selectComparison")}
                    options={[
                      { value: "weekVsPrevious", label: t("analysis.configurator.comparisonOptions.weekVsPrevious") },
                      { value: "monthVsPrevious", label: t("analysis.configurator.comparisonOptions.monthVsPrevious") },
                      { value: "quarterVsPrevious", label: t("analysis.configurator.comparisonOptions.quarterVsPrevious") },
                      { value: "yearVsPrevious", label: t("analysis.configurator.comparisonOptions.yearVsPrevious") },
                    ]}
                    onChange={(value) =>
                      changeDraftConfig({
                        compare: value as "weekVsPrevious" | "monthVsPrevious" | "quarterVsPrevious" | "yearVsPrevious",
                      })}
                  />

                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <input
                      type="checkbox"
                      checked={(draft.config as ComparisonWidgetConfig).gradientFill ?? false}
                      onChange={(e) => changeDraftConfig({ gradientFill: e.target.checked })}
                      className="h-3.5 w-3.5 rounded accent-indigo-500"
                    />
                    <span className="text-sm text-slate-600">{t("analysis.configurator.gradientFill")}</span>
                  </label>

                  <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {t("analysis.configurator.colorsAndLegend")}
                    </p>
                    <div className="space-y-1">
                      {(["income", "expense"] as const).map((key) => {
                        const editorId = `comparison:${key}`;
                        const currentColor = (draft.config as ComparisonWidgetConfig).seriesColors?.[key]
                          ?? getDefaultSeriesColor(key, ["income", "expense"]);
                        const isOpen = activeColorEditor === editorId;
                        const existingColors = (draft.config as ComparisonWidgetConfig).seriesColors ?? {};
                        const displayLabel = key === "income"
                          ? t("analysis.configurator.kpiOptions.income")
                          : t("analysis.configurator.kpiOptions.expense");

                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="h-5 w-5 shrink-0 cursor-pointer rounded border border-slate-300 shadow-sm hover:scale-110 transition-transform"
                                style={{ backgroundColor: currentColor }}
                                onClick={() => setActiveColorEditor(isOpen ? null : editorId)}
                              />
                              <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600">{displayLabel}</span>
                              <span className="shrink-0 font-mono text-[10px] text-slate-400">{currentColor.toUpperCase()}</span>
                            </div>
                            {isOpen && (
                              <div className="ml-7 space-y-1">
                                <HexColorPicker
                                  color={currentColor}
                                  onChange={(color) =>
                                    changeDraftConfig({
                                      seriesColors: { ...existingColors, [key]: color },
                                    })}
                                  style={{ width: "100%", height: "140px" }}
                                />
                                <HexColorInput
                                  color={currentColor}
                                  onChange={(color) =>
                                    changeDraftConfig({
                                      seriesColors: { ...existingColors, [key]: color },
                                    })}
                                  prefixed
                                  className="h-7 w-full rounded border border-slate-300 bg-slate-50 px-2 text-[11px] uppercase"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {draft.type === "heatmap" && (
                <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {t("analysis.configurator.heatmapColor")}
                  </p>
                  {(() => {
                    const hmBaseColor = (draft.config as HeatmapWidgetConfig).baseColor ?? "#7c3aed";
                    const hmEditorId = "heatmap:base";
                    const hmOpen = activeColorEditor === hmEditorId;
                    return (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="h-5 w-5 shrink-0 cursor-pointer rounded border border-slate-300 shadow-sm hover:scale-110 transition-transform"
                            style={{ backgroundColor: hmBaseColor }}
                            onClick={() => setActiveColorEditor(hmOpen ? null : hmEditorId)}
                          />
                          <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600">{t("analysis.configurator.heatmapBaseColor")}</span>
                          <span className="shrink-0 font-mono text-[10px] text-slate-400">{hmBaseColor.toUpperCase()}</span>
                        </div>
                        {hmOpen && (
                          <div className="ml-7 space-y-1">
                            <HexColorPicker
                              color={hmBaseColor}
                              onChange={(color) => changeDraftConfig({ baseColor: color } as Partial<HeatmapWidgetConfig>)}
                              style={{ width: "100%", height: "140px" }}
                            />
                            <HexColorInput
                              color={hmBaseColor}
                              onChange={(color) => changeDraftConfig({ baseColor: color } as Partial<HeatmapWidgetConfig>)}
                              prefixed
                              className="h-7 w-full rounded border border-slate-300 bg-slate-50 px-2 text-[11px] uppercase"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button className="tx-apply-pastel-btn flex-1" onClick={onSave}>
                  <Save className="mr-1 h-4 w-4" />
                  {draft.mode === "create"
                    ? t("analysis.configurator.saveChart")
                    : t("analysis.configurator.updateChart")}
                </Button>
                <Button variant="outline" className="tx-cancel-draw-btn" onClick={onCancel}>
                  {t("common.cancel")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {previewWidget && (
        <Card className="analysis-preview-card border-sky-200">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="h-4 w-4 text-sky-600" />
                <span className="bg-gradient-to-r from-sky-600 to-emerald-500 bg-clip-text text-transparent">
                  {t("analysis.configurator.preview")}
                </span>
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRefreshPreview}
                disabled={refreshingPreview}
                className="h-8"
              >
                <RefreshCw className={`mr-1 h-3.5 w-3.5 ${refreshingPreview ? "animate-spin" : ""}`} />
                {t("analysis.configurator.reload")}
              </Button>
              <button
                type="button"
                className="analysis-expand-btn"
                onClick={() => setPreviewExpanded(true)}
                title={t("analysis.board.expand")}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="min-h-[260px] overflow-x-auto overflow-y-hidden">
            {renderWidget(previewWidget, transactions, draftPreviewData)}
          </CardContent>
        </Card>
      )}

      <Dialog open={previewExpanded} onOpenChange={setPreviewExpanded}>
        <DialogContent className="!max-w-[90vw] !h-[85vh] !w-[90vw] flex flex-col">
          {previewWidget && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg text-slate-800">{t("analysis.configurator.expandedPreview")}</DialogTitle>
                <DialogDescription className="sr-only">
                  {t("analysis.configurator.expandedPreviewDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="analysis-lightbox-chart flex-1 overflow-auto">
                {renderWidget({ ...previewWidget, size: "lg" }, transactions, draftPreviewData)}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
