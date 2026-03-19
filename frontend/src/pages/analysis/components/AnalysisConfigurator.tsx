import { useEffect, useMemo, useRef, useState } from "react";
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
import { renderWidget } from "../registry";
import { buildConfigForType } from "../mocks";
import type {
  AnalysisTransaction,
  AnalysisWidget,
  BarWidgetConfig,
  DateRangePreset,
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

const dateRangeOptions: Array<{ value: DateRangePreset; label: string }> = [
  { value: "30d", label: "Ultimos 30 dias" },
  { value: "90d", label: "Ultimos 90 dias" },
  { value: "365d", label: "Ultimos 12 meses" },
  { value: "ytd", label: "Anio actual (YTD)" },
];

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

function getTypeLabel(type: WidgetType): string {
  const labels: Record<WidgetType, string> = {
    kpi: "KPI",
    table: "Tabla",
    bar: "Barras",
    line: "Linea/Area",
    donut: "Donut",
    stackedBar: "Barras apiladas",
    heatmap: "Heatmap",
    comparison: "Comparativa",
  };
  return labels[type];
}

function getTypeDescription(type: WidgetType): string {
  const descriptions: Record<WidgetType, string> = {
    kpi: "Resumen rapido de una metrica.",
    table: "Listado agregado por categoria o cuenta.",
    bar: "Compara importes por categoria.",
    line: "Evolucion temporal de ingresos y gastos.",
    donut: "Peso relativo de cada categoria.",
    stackedBar: "Compara segmentos por periodos.",
    heatmap: "Detecta concentracion por dias.",
    comparison: "Periodo actual frente al anterior.",
  };
  return descriptions[type];
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
}: {
  label: string;
  options: Array<{ id: string; name: string }>;
  selected: string[];
  onChange: (ids: string[]) => void;
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

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  };

  const displayLabel =
    selected.length === 0
      ? "Todas"
      : selected.length === 1
        ? options.find((opt) => opt.id === selected[0])?.name ?? label
        : `${selected.length} categorias`;

  return (
    <div className="space-y-1" ref={ref}>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-xs transition hover:border-sky-300 hover:bg-sky-50/40 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        >
          <span className={`truncate ${selected.length === 0 ? "text-slate-400" : "text-slate-700"}`}>{displayLabel}</span>
          <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
        </button>

        {open && (
          <div className="absolute left-0 top-full z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            {options.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">No hay categorias</p>
            ) : (
              options.map((option) => (
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
              ))
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
    () => typeOptions.map((type) => ({ value: type, label: getTypeLabel(type) })),
    [],
  );

  const widgetSizeOptions: SelectOption[] = [
    { value: "sm", label: "Pequeño" },
    { value: "md", label: "Mediano" },
    { value: "lg", label: "Grande" },
  ];

  const dateRangeSelectOptions = dateRangeOptions.map((option) => ({
    value: option.value,
    label: option.label,
  }));

  const movementTypeOptions: SelectOption[] = [
    { value: "INCOME", label: "Ingresos" },
    { value: "EXPENSE", label: "Gastos" },
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

      const keys = new Set<string>();
      for (const tx of filteredDraftTransactions) {
        if (tx.type === "INCOME") {
          keys.add(new Date(tx.date).toLocaleDateString("es-ES", { month: "short" }));
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

    return [] as string[];
  }, [draft, filteredDraftTransactions]);

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

  const cardTitle = editMode && !draft ? "Editar dashboard" : "Configurador de gráfico";
  const visibleWidgets = widgets.filter((widget) => widget.visible);
  const hiddenWidgets = widgets.filter((widget) => !widget.visible);

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
                Haz clic en un gráfico para editarlo. Usa <strong>S / M / L</strong> para el tamaño.
              </p>

              {widgets.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">
                  No hay gráficos todavía.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      En dashboard
                    </p>
                    {visibleWidgets.map((widget) => (
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
                          title="Quitar del dashboard"
                          aria-label="Quitar del dashboard"
                        >
                          <span className="analysis-dashboard-toggle__fill" />
                          <Check className="analysis-dashboard-toggle__check h-3 w-3" />
                          <span className="analysis-dashboard-toggle__tooltip">Quitar</span>
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
                              title={s === "sm" ? "Pequeño" : s === "md" ? "Mediano" : "Grande"}
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
                          title="Borrar"
                          aria-label="Borrar"
                        >
                          <Trash2 className="btn-delete-icon__icon h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    ))}
                    {visibleWidgets.length === 0 && (
                      <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        No hay gráficos activos en el dashboard.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Fuera del dashboard (abajo)
                    </p>
                    {hiddenWidgets.map((widget) => (
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
                            title="Añadir al dashboard"
                            aria-label="Añadir al dashboard"
                          >
                            <span className="analysis-dashboard-toggle__fill" />
                            <Check className="analysis-dashboard-toggle__check h-3 w-3" />
                            <span className="analysis-dashboard-toggle__tooltip">Añadir</span>
                          </button>

                          <button
                            type="button"
                            className="btn-delete-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteWidget(widget.id);
                            }}
                            title="Borrar"
                            aria-label="Borrar"
                          >
                            <Trash2 className="btn-delete-icon__icon h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {hiddenWidgets.length === 0 && (
                      <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        Todos los gráficos están activos.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => onStartCreate()}
                className="analysis-add-btn"
              >
                <Plus className="h-4 w-4" />
                Añadir gráfico
              </button>
            </div>
          )}

          {/* ── Normal mode: type picker ───────────────────────────── */}
          {!editMode && !draft && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Elige el tipo de grafico para empezar. Despues podras afinar filtros, fechas y formato.
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
                          <p className="text-sm font-semibold text-slate-800">{getTypeLabel(type)}</p>
                          <p className="text-xs text-slate-500">{getTypeDescription(type)}</p>
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
                  Importar filtro guardado
                </p>
                <div className="mt-2 flex gap-2">
                  <SingleSelectDropdown
                    label=""
                    value={draft.importedFilterId ?? ""}
                    options={savedFilterOptions}
                    placeholder="Selecciona un filtro"
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
                  Titulo
                  <input
                    className={controlClassName}
                    value={draft.title}
                    placeholder="Ej. Gastos por categoria"
                    onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Descripcion
                  <input
                    className={controlClassName}
                    value={draft.description}
                    placeholder="Ej. Comparativa mensual de tus gastos"
                    onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SingleSelectDropdown
                  label="Tipo"
                  value={draft.type}
                  options={widgetTypeOptions}
                  placeholder="Selecciona tipo"
                  onChange={(value) => {
                    const newType = value as WidgetType;
                    if (newType === draft.type) return;
                    const newConfig = buildConfigForType(newType, draft.config);
                    onDraftChange({
                      ...draft,
                      type: newType,
                      title: draft.title || getTypeLabel(newType),
                      config: newConfig,
                    });
                  }}
                />
                <SingleSelectDropdown
                  label="Tamano"
                  value={draft.size}
                  options={widgetSizeOptions}
                  placeholder="Selecciona tamano"
                  onChange={(value) => onDraftChange({ ...draft, size: value as AnalysisWidget["size"] })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SingleSelectDropdown
                  label="Rango rapido"
                  value={draft.config.dateRange === "custom" ? "" : draft.config.dateRange}
                  options={dateRangeSelectOptions}
                  placeholder="Sin rango rapido"
                  onChange={(value) =>
                    changeDraftConfig({
                      dateRange: value ? (value as DateRangePreset) : "custom",
                      startDate: undefined,
                      endDate: undefined,
                      specificDates: [],
                    })}
                />
                <SingleSelectDropdown
                  label="Tipo movimiento"
                  value={draft.config.transactionType ?? ""}
                  options={movementTypeOptions}
                  placeholder="Todos"
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
                  label="Cuenta"
                  value={draft.config.accountId ?? ""}
                  options={accountSelectOptions}
                  placeholder="Todas"
                  onChange={(value) => changeDraftConfig({ accountId: value || undefined })}
                />
                <label className="text-sm font-medium text-slate-700">
                  Buscar nombre
                  <input
                    className={controlClassName}
                    value={draft.config.nameQuery}
                    onChange={(event) => changeDraftConfig({ nameQuery: event.target.value })}
                    placeholder="Ej. alquiler, nomina..."
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium text-slate-700">
                  Importe minimo
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
                  Importe maximo
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
                label="Categorias"
                options={categoryOptions}
                selected={draft.config.categoryIds}
                onChange={(ids) => changeDraftConfig({ categoryIds: ids })}
              />

              {"metric" in draft.config && (
                <SingleSelectDropdown
                  label="Metrica KPI"
                  value={draft.config.metric}
                  placeholder="Selecciona metrica"
                  options={[
                    { value: "income", label: "Ingresos" },
                    { value: "expense", label: "Gastos" },
                    { value: "balance", label: "Balance" },
                    { value: "savingsRate", label: "Tasa de ahorro" },
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
                    label="Agrupar por"
                    value={draft.config.groupBy}
                    placeholder="Selecciona grupo"
                    options={[
                      { value: "category", label: "Categoria" },
                      { value: "account", label: "Cuenta" },
                    ]}
                    onChange={(value) => changeDraftConfig({ groupBy: value as "category" | "account" })}
                  />
                  {"valueMode" in draft.config && (
                    <SingleSelectDropdown
                      label="Valor"
                      value={draft.config.valueMode}
                      placeholder="Selecciona valor"
                      options={[
                        { value: "amount", label: "Importe" },
                        { value: "count", label: "Count transacciones" },
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
                      label="Modo barras"
                      value={draft.config.mode}
                      placeholder="Selecciona modo"
                      options={[
                        { value: "expensesByCategory", label: "Por categoría" },
                        { value: "incomeByMonth", label: "Por mes" },
                      ]}
                      onChange={(value) =>
                        changeDraftConfig({
                          mode: value as "expensesByCategory" | "incomeByMonth",
                        })}
                    />
                    <SingleSelectDropdown
                      label="Eje Y"
                      value={draft.config.valueMode}
                      placeholder="Selecciona valor"
                      options={[
                        { value: "amount", label: "Importe" },
                        { value: "count", label: "Count transacciones" },
                      ]}
                      onChange={(value) => changeDraftConfig({ valueMode: value as "amount" | "count" })}
                    />
                  </div>

                  {editableSeriesKeys.length > 0 && (
                    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Color por barra
                      </p>
                      <div className="space-y-2">
                        {editableSeriesKeys.map((key) => {
                          const editorId = `bar:${key}`;
                          const currentColor = (draft.config as BarWidgetConfig).seriesColors?.[key] ?? "#0f766e";
                          const isOpen = activeColorEditor === editorId;

                          return (
                            <div key={key} className="rounded-md border border-slate-200 bg-white p-2">
                              <div className="flex items-center justify-between gap-3 text-sm text-slate-700">
                                <span className="truncate">{key}</span>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                  onClick={() => setActiveColorEditor(isOpen ? null : editorId)}
                                >
                                  <span className="h-4 w-4 rounded-sm border border-slate-300" style={{ backgroundColor: currentColor }} />
                                  {currentColor.toUpperCase()}
                                </button>
                              </div>

                              {isOpen && (
                                <div className="mt-2 space-y-2">
                                  <HexColorPicker
                                    color={currentColor}
                                    onChange={(color) =>
                                      changeDraftConfig({
                                        seriesColors: {
                                          ...((draft.config as BarWidgetConfig).seriesColors ?? {}),
                                          [key]: color,
                                        },
                                      })}
                                  />
                                  <HexColorInput
                                    color={currentColor}
                                    onChange={(color) =>
                                      changeDraftConfig({
                                        seriesColors: {
                                          ...((draft.config as BarWidgetConfig).seriesColors ?? {}),
                                          [key]: color,
                                        },
                                      })}
                                    prefixed
                                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm uppercase"
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
                <div className="grid grid-cols-2 gap-3">
                  <SingleSelectDropdown
                    label="Modo línea"
                    value={draft.config.mode}
                    placeholder="Selecciona modo"
                    options={[
                      { value: "balanceTrend", label: "Tendencia de balance" },
                      { value: "incomeVsExpense", label: "Ingresos vs gastos" },
                    ]}
                    onChange={(value) =>
                      changeDraftConfig({
                        mode: value as "balanceTrend" | "incomeVsExpense",
                      })}
                  />
                  <SingleSelectDropdown
                    label="Valor"
                    value={draft.config.valueMode}
                    placeholder="Selecciona valor"
                    options={[
                      { value: "amount", label: "Importe" },
                      { value: "count", label: "Count transacciones" },
                    ]}
                    onChange={(value) => changeDraftConfig({ valueMode: value as "amount" | "count" })}
                  />
                </div>
              )}

              {draft.type === "donut" && "mode" in draft.config && "valueMode" in draft.config && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <SingleSelectDropdown
                      label="Modo donut"
                      value={draft.config.mode}
                      placeholder="Selecciona modo"
                      options={[
                        { value: "expensesByCategory", label: "Por categoría" },
                        { value: "expensesByAccount", label: "Por cuenta" },
                      ]}
                      onChange={(value) =>
                        changeDraftConfig({
                          mode: value as "expensesByCategory" | "expensesByAccount",
                        })}
                    />
                    <SingleSelectDropdown
                      label="Valor"
                      value={draft.config.valueMode}
                      placeholder="Selecciona valor"
                      options={[
                        { value: "amount", label: "Importe" },
                        { value: "count", label: "Count transacciones" },
                      ]}
                      onChange={(value) => changeDraftConfig({ valueMode: value as "amount" | "count" })}
                    />
                  </div>

                  {editableSeriesKeys.length > 0 && (
                    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Colores y leyenda
                      </p>
                      <div className="space-y-2">
                        {editableSeriesKeys.map((key) => {
                          const editorId = `donut:${key}`;
                          const currentColor = (draft.config as DonutWidgetConfig).seriesColors?.[key] ?? "#0284c7";
                          const isOpen = activeColorEditor === editorId;

                          return (
                            <div key={key} className="rounded-md border border-slate-200 bg-white p-2">
                              <div className="flex items-center justify-between gap-3 text-sm text-slate-700">
                                <span className="truncate">{key}</span>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                  onClick={() => setActiveColorEditor(isOpen ? null : editorId)}
                                >
                                  <span className="h-4 w-4 rounded-sm border border-slate-300" style={{ backgroundColor: currentColor }} />
                                  {currentColor.toUpperCase()}
                                </button>
                              </div>

                              {isOpen && (
                                <div className="mt-2 space-y-2">
                                  <HexColorPicker
                                    color={currentColor}
                                    onChange={(color) =>
                                      changeDraftConfig({
                                        seriesColors: {
                                          ...((draft.config as DonutWidgetConfig).seriesColors ?? {}),
                                          [key]: color,
                                        },
                                      })}
                                  />
                                  <HexColorInput
                                    color={currentColor}
                                    onChange={(color) =>
                                      changeDraftConfig({
                                        seriesColors: {
                                          ...((draft.config as DonutWidgetConfig).seriesColors ?? {}),
                                          [key]: color,
                                        },
                                      })}
                                    prefixed
                                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm uppercase"
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
                <SingleSelectDropdown
                  label="Apilar por"
                  value={draft.config.stackBy}
                  placeholder="Selecciona criterio"
                  options={[
                    { value: "type", label: "Tipo (ingreso/gasto)" },
                    { value: "account", label: "Cuenta" },
                  ]}
                  onChange={(value) =>
                    changeDraftConfig({
                      stackBy: value as "type" | "account",
                    })}
                />
              )}

              {"compare" in draft.config && (
                <SingleSelectDropdown
                  label="Comparacion"
                  value={draft.config.compare}
                  placeholder="Selecciona comparacion"
                  options={[
                    { value: "weekVsPrevious", label: "Semana actual vs anterior" },
                    { value: "monthVsPrevious", label: "Mes actual vs anterior" },
                    { value: "quarterVsPrevious", label: "Trimestre actual vs anterior" },
                    { value: "yearVsPrevious", label: "Año actual vs anterior" },
                  ]}
                  onChange={(value) =>
                    changeDraftConfig({
                      compare: value as "weekVsPrevious" | "monthVsPrevious" | "quarterVsPrevious" | "yearVsPrevious",
                    })}
                />
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button className="tx-apply-pastel-btn flex-1" onClick={onSave}>
                  <Save className="mr-1 h-4 w-4" />
                  {draft.mode === "create" ? "Guardar gráfico" : "Actualizar gráfico"}
                </Button>
                <Button variant="outline" className="tx-cancel-draw-btn" onClick={onCancel}>
                  Cancelar
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
                  Previsualizacion
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
                Recargar
              </Button>
              <button
                type="button"
                className="analysis-expand-btn"
                onClick={() => setPreviewExpanded(true)}
                title="Expandir"
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
                <DialogTitle className="text-lg text-slate-800">Previsualizacion ampliada</DialogTitle>
                <DialogDescription className="sr-only">
                  Vista ampliada de la previsualización del gráfico en edición.
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
