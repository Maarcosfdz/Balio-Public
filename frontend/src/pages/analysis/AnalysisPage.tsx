import { useCallback, useEffect, useMemo, useState } from "react";
import { ChartNoAxesCombined, Plus, RefreshCw } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ToastBanner } from "@/components/ui/toast-banner";
import {
  accountService,
  categoryService,
  chartService,
  filterService,
  transactionService,
} from "@/backend";
import type {
  AccountSummaryDto,
  CategorySummaryDto,
  FilterResponseDto,
  FilterSummaryDto,
  TransactionSummaryDto,
} from "@/types";
import AnalysisBoard from "./components/AnalysisBoard";
import AnalysisConfigurator from "./components/AnalysisConfigurator";
import {
  buildInitialWidgets,
  copyConfig,
  draftFromTemplate,
  emptyDraftFromType,
  widgetTemplates,
} from "./mocks";
import type { AnalysisTransaction, AnalysisWidget, WidgetDraft, WidgetType } from "./types";
import type {
  BackendChartType,
  BackendWidgetType,
  ChartWidgetResponseDto,
  ChartWidgetSummaryDto,
} from "@/backend/chartService";

interface FilterDefinitionLike {
  type?: "INCOME" | "EXPENSE";
  accountId?: string;
  categoryId?: string;
  categoryIds?: string[];
  startDate?: string;
  endDate?: string;
  specificDates?: string[];
  nameQuery?: string;
  amountMin?: number;
  amountMax?: number;
}

function normalizeOrder(widgets: AnalysisWidget[]): AnalysisWidget[] {
  return widgets
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((widget, idx) => ({ ...widget, order: idx }));
}

function toAccountId(accountName?: string): string {
  const raw = (accountName ?? "sin-cuenta").trim().toLowerCase();
  return raw.replace(/\s+/g, "-");
}

function mapTransactions(source: TransactionSummaryDto[], accountIdByName: Record<string, string>): AnalysisTransaction[] {
  return source.map((tx) => ({
    id: tx.id,
    name: tx.name,
    accountId: accountIdByName[(tx.accountName ?? "").trim().toLowerCase()] ?? toAccountId(tx.accountName),
    accountName: tx.accountName ?? "Sin cuenta",
    categoryId: tx.categoryId ?? null,
    categoryName: tx.categoryName ?? "Sin categoria",
    type: tx.type,
    amount: tx.amount,
    date: tx.date,
  }));
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function toNumberOrUndefined(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function parseFilterDefinition(definition: string): FilterDefinitionLike | null {
  try {
    const parsed = JSON.parse(definition) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) return null;
    const categoryIds = toStringArray(parsed.categoryIds);
    const oneCategory = typeof parsed.categoryId === "string" ? parsed.categoryId : undefined;
    if (oneCategory && !categoryIds.includes(oneCategory)) categoryIds.unshift(oneCategory);

    return {
      type: parsed.type === "INCOME" || parsed.type === "EXPENSE" ? parsed.type : undefined,
      accountId: typeof parsed.accountId === "string" ? parsed.accountId : undefined,
      categoryIds,
      startDate: typeof parsed.startDate === "string" ? parsed.startDate : undefined,
      endDate: typeof parsed.endDate === "string" ? parsed.endDate : undefined,
      specificDates: toStringArray(parsed.specificDates),
      nameQuery: typeof parsed.nameQuery === "string" ? parsed.nameQuery : undefined,
      amountMin: toNumberOrUndefined(parsed.amountMin),
      amountMax: toNumberOrUndefined(parsed.amountMax),
    };
  } catch {
    return null;
  }
}

function mergeFilterIntoConfig<T extends AnalysisWidget["config"]>(
  config: T,
  filter: FilterDefinitionLike,
): T {
  return {
    ...config,
    transactionType: filter.type,
    accountId: filter.accountId,
    categoryIds: filter.categoryIds ?? [],
    startDate: filter.startDate,
    endDate: filter.endDate,
    specificDates: filter.specificDates ?? [],
    nameQuery: filter.nameQuery ?? "",
    amountMin: filter.amountMin,
    amountMax: filter.amountMax,
  } as T;
}

function mapFrontendToBackend(widget: AnalysisWidget | WidgetDraft): {
  widgetType: BackendWidgetType;
  chartType: BackendChartType;
} {
  if (widget.type === "kpi") return { widgetType: "KPI", chartType: "KPI_CARD" };
  if (widget.type === "table") return { widgetType: "TABLE", chartType: "SUMMARY_TABLE" };
  if (widget.type === "donut") return { widgetType: "CHART", chartType: "DONUT" };
  if (widget.type === "stackedBar") return { widgetType: "CHART", chartType: "STACKED_BAR" };
  if (widget.type === "line") {
    if ("mode" in widget.config && widget.config.mode === "balanceTrend") {
      return { widgetType: "CHART", chartType: "AREA" };
    }
    return { widgetType: "CHART", chartType: "LINE" };
  }
  return { widgetType: "CHART", chartType: "BAR" };
}

function dateRangeStart(preset: AnalysisWidget["config"]["dateRange"]): string {
  const now = new Date();
  const start = new Date(now);
  if (preset === "30d") start.setDate(start.getDate() - 30);
  if (preset === "90d") start.setDate(start.getDate() - 90);
  if (preset === "365d") start.setDate(start.getDate() - 365);
  if (preset === "ytd") {
    start.setMonth(0);
    start.setDate(1);
  }
  return start.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildConfiguration(
  widget: AnalysisWidget | WidgetDraft,
  categoryIdsByName: Record<string, string>,
): string {
  const cfg = widget.config as unknown as Record<string, unknown>;
  const selectedCategoryIds = toStringArray(cfg.categoryIds);
  const legacyCategoryIds = toStringArray(cfg.categoryNames)
    .map((name) => categoryIdsByName[name.trim().toLowerCase()])
    .filter((id): id is string => Boolean(id));
  const categoryIds = selectedCategoryIds.length > 0 ? selectedCategoryIds : legacyCategoryIds;

  const commonFilter: Record<string, unknown> = {
    startDate: typeof cfg.startDate === "string" && cfg.startDate.length > 0
      ? cfg.startDate
      : dateRangeStart(widget.config.dateRange),
    endDate: typeof cfg.endDate === "string" && cfg.endDate.length > 0
      ? cfg.endDate
      : todayIso(),
  };

  if (cfg.transactionType === "INCOME" || cfg.transactionType === "EXPENSE") {
    commonFilter.type = cfg.transactionType;
  }

  if (typeof cfg.accountId === "string" && cfg.accountId.length > 0) {
    commonFilter.accountId = cfg.accountId;
  } else {
    const legacyAccounts = toStringArray(cfg.accountIds);
    if (legacyAccounts[0]) commonFilter.accountId = legacyAccounts[0];
  }

  if (categoryIds.length === 1) commonFilter.categoryId = categoryIds[0];
  if (categoryIds.length > 1) commonFilter.categoryIds = categoryIds;

  const specificDates = toStringArray(cfg.specificDates);
  if (specificDates.length > 0) commonFilter.specificDates = specificDates;

  const nameQuery = typeof cfg.nameQuery === "string" ? cfg.nameQuery.trim() : "";
  if (nameQuery) commonFilter.nameQuery = nameQuery;

  const amountMin = toNumberOrUndefined(cfg.amountMin);
  const amountMax = toNumberOrUndefined(cfg.amountMax);
  if (amountMin != null) commonFilter.amountMin = amountMin;
  if (amountMax != null) commonFilter.amountMax = amountMax;

  const backendSpecific: Record<string, unknown> = { filter: commonFilter };

  if (widget.type === "kpi" && "metric" in widget.config) {
    const kpiMap = {
      income: "TOTAL_INCOME",
      expense: "TOTAL_EXPENSE",
      balance: "NET_BALANCE",
      savingsRate: "NET_BALANCE",
    } as const;
    backendSpecific.kpiType = kpiMap[widget.config.metric];
  }

  if (widget.type === "table" && "groupBy" in widget.config) {
    backendSpecific.groupBy = widget.config.groupBy === "account" ? "ACCOUNT" : "CATEGORY";
    backendSpecific.metric = "SUM";
  }

  if (widget.type === "bar") {
    backendSpecific.groupBy = "CATEGORY";
    backendSpecific.metric = "SUM";
    backendSpecific.orientation = "VERTICAL";
  }

  if (widget.type === "line" && "mode" in widget.config) {
    backendSpecific.groupBy = "MONTH";
    backendSpecific.metric = widget.config.mode === "balanceTrend" ? "NET" : "SUM";
    backendSpecific.orientation = "VERTICAL";
  }

  if (widget.type === "donut") {
    backendSpecific.groupBy = "CATEGORY";
    backendSpecific.metric = "SUM";
  }

  if (widget.type === "stackedBar") {
    backendSpecific.groupBy = "MONTH";
    backendSpecific.metric = "SUM";
  }

  if (widget.type === "heatmap") {
    backendSpecific.groupBy = "DAY";
    backendSpecific.metric = "SUM";
  }

  if (widget.type === "comparison") {
    backendSpecific.groupBy = "MONTH";
    backendSpecific.metric = "NET";
  }

  return JSON.stringify({
    ...backendSpecific,
    frontendType: widget.type,
    description: widget.description,
    widgetConfig: widget.config,
    importedFilterId: "importedFilterId" in widget ? widget.importedFilterId : undefined,
  });
}

function mapBackendToFrontend(
  dto: ChartWidgetResponseDto,
  categoryIdsByName: Record<string, string>,
): AnalysisWidget {
  let parsedConfig: Record<string, unknown> = {};
  try {
    parsedConfig = JSON.parse(dto.configuration ?? "{}");
  } catch {
    parsedConfig = {};
  }

  const frontendType = (parsedConfig.frontendType as WidgetType | undefined)
    ?? (() => {
      if (dto.widgetType === "KPI") return "kpi";
      if (dto.widgetType === "TABLE") return "table";
      if (dto.chartType === "DONUT") return "donut";
      if (dto.chartType === "STACKED_BAR") return "stackedBar";
      if (dto.chartType === "LINE" || dto.chartType === "AREA") return "line";
      return "bar";
    })();

  const fallback = emptyDraftFromType(frontendType);
  const widgetConfig = (parsedConfig.widgetConfig as Record<string, unknown> | undefined) ?? {};
  const rawFilter = parsedConfig.filter as Record<string, unknown> | undefined;

  const categoryIdsFromWidget = toStringArray(widgetConfig.categoryIds);
  const categoryIdsFromLegacyNames = toStringArray(widgetConfig.categoryNames)
    .map((name) => categoryIdsByName[name.trim().toLowerCase()])
    .filter((id): id is string => Boolean(id));
  const categoryIdsFromFilter = [
    ...(typeof rawFilter?.categoryId === "string" ? [rawFilter.categoryId] : []),
    ...toStringArray(rawFilter?.categoryIds),
  ];
  const mergedCategoryIds = categoryIdsFromWidget.length > 0
    ? categoryIdsFromWidget
    : categoryIdsFromLegacyNames.length > 0
      ? categoryIdsFromLegacyNames
      : categoryIdsFromFilter;

  const config = {
    ...fallback.config,
    ...(widgetConfig as object),
    transactionType:
      widgetConfig.transactionType === "INCOME" || widgetConfig.transactionType === "EXPENSE"
        ? widgetConfig.transactionType
        : rawFilter?.type === "INCOME" || rawFilter?.type === "EXPENSE"
          ? rawFilter.type
          : undefined,
    accountId:
      typeof widgetConfig.accountId === "string"
        ? widgetConfig.accountId
        : toStringArray(widgetConfig.accountIds)[0]
          ?? (typeof rawFilter?.accountId === "string" ? rawFilter.accountId : undefined),
    categoryIds: Array.from(new Set(mergedCategoryIds)),
    startDate:
      typeof widgetConfig.startDate === "string"
        ? widgetConfig.startDate
        : typeof rawFilter?.startDate === "string"
          ? rawFilter.startDate
          : undefined,
    endDate:
      typeof widgetConfig.endDate === "string"
        ? widgetConfig.endDate
        : typeof rawFilter?.endDate === "string"
          ? rawFilter.endDate
          : undefined,
    specificDates:
      toStringArray(widgetConfig.specificDates).length > 0
        ? toStringArray(widgetConfig.specificDates)
        : toStringArray(rawFilter?.specificDates),
    nameQuery:
      typeof widgetConfig.nameQuery === "string"
        ? widgetConfig.nameQuery
        : typeof rawFilter?.nameQuery === "string"
          ? rawFilter.nameQuery
          : "",
    amountMin:
      toNumberOrUndefined(widgetConfig.amountMin)
      ?? toNumberOrUndefined(rawFilter?.amountMin),
    amountMax:
      toNumberOrUndefined(widgetConfig.amountMax)
      ?? toNumberOrUndefined(rawFilter?.amountMax),
  };

  const size = dto.layoutSize?.toLowerCase();
  const mappedSize = size === "lg" || size === "md" || size === "sm" ? size : fallback.size;

  return {
    id: dto.id,
    title: dto.name,
    description: (parsedConfig.description as string | undefined) ?? fallback.description,
    type: frontendType,
    size: mappedSize,
    order: dto.displayOrder ?? 0,
    config: config as AnalysisWidget["config"],
  };
}

function isLocalWidgetId(widgetId: string): boolean {
  return widgetId.startsWith("wdg-");
}

export default function AnalysisPage() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [widgets, setWidgets] = useState<AnalysisWidget[]>([]);
  const [transactions, setTransactions] = useState<AnalysisTransaction[]>([]);
  const [savedFilters, setSavedFilters] = useState<FilterSummaryDto[]>([]);
  const [previewsByWidgetId, setPreviewsByWidgetId] = useState<Record<string, unknown>>({});
  const [draftPreviewData, setDraftPreviewData] = useState<unknown>(undefined);
  const [categoryIdsByName, setCategoryIdsByName] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [draft, setDraft] = useState<WidgetDraft | null>(null);
  const [activeWidgetId, setActiveWidgetId] = useState<string | undefined>(undefined);

  const sortedWidgets = useMemo(() => normalizeOrder(widgets), [widgets]);

  const loadAnalysisData = useCallback(async () => {
    setLoading(true);
    try {
      const [txPage, backendWidgets, categories, accounts, filters] = await Promise.all([
        transactionService.getAll({}, 0, 10000),
        chartService.getAll(),
        categoryService.getAll(),
        accountService.getAll(),
        filterService.getAll(),
      ]);

      const nextCategoryIdsByName = categories.reduce((acc, category: CategorySummaryDto) => {
        acc[category.name.trim().toLowerCase()] = category.id;
        return acc;
      }, {} as Record<string, string>);

      const nextAccountIdsByName = accounts.reduce((acc, account: AccountSummaryDto) => {
        acc[account.name.trim().toLowerCase()] = account.id;
        return acc;
      }, {} as Record<string, string>);

      setCategoryIdsByName(nextCategoryIdsByName);
      setSavedFilters(filters);
      setTransactions(mapTransactions(txPage.content, nextAccountIdsByName));

      if (backendWidgets.length === 0) {
        setWidgets(normalizeOrder(buildInitialWidgets()));
        setPreviewsByWidgetId({});
      } else {
        const details = await Promise.all(
          backendWidgets.map((widget: ChartWidgetSummaryDto) => chartService.getById(widget.id)),
        );

        const mappedWidgets = normalizeOrder(
          details.map((dto) => mapBackendToFrontend(dto, nextCategoryIdsByName)),
        );
        setWidgets(mappedWidgets);

        const previews = await Promise.all(
          mappedWidgets.map(async (widget) => {
            try {
              const response = await chartService.previewSaved(widget.id);
              return [widget.id, response.data] as const;
            } catch {
              return [widget.id, undefined] as const;
            }
          }),
        );

        setPreviewsByWidgetId(
          previews.reduce((acc, [id, data]) => {
            if (data !== undefined) acc[id] = data;
            return acc;
          }, {} as Record<string, unknown>),
        );
      }
    } catch {
      setTransactions([]);
      setSavedFilters([]);
      setWidgets(normalizeOrder(buildInitialWidgets()));
      setPreviewsByWidgetId({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalysisData();
  }, [loadAnalysisData]);

  const synchronizeAndReload = async () => {
    setSyncing(true);
    try {
      await chartService.synchronizeCache();
      await loadAnalysisData();
      setDraftPreviewData(undefined);
      setToastMessage("Panel sincronizado. Los widgets se han recalculado.");
    } catch {
      setToastMessage("No se pudo sincronizar ahora. Vuelve a intentarlo.");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!draft) {
      setDraftPreviewData(undefined);
      return;
    }

    const timer = setTimeout(() => {
      const backendKind = mapFrontendToBackend(draft);
      const configuration = buildConfiguration(draft, categoryIdsByName);
      chartService.previewFromConfig({
        widgetType: backendKind.widgetType,
        chartType: backendKind.chartType,
        configuration,
        importFilterId: draft.importedFilterId,
      }).then((response) => {
        setDraftPreviewData(response.data);
      }).catch(() => {
        setDraftPreviewData(undefined);
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [draft, categoryIdsByName]);

  const startCreate = (templateId?: string) => {
    const template = templateId
      ? widgetTemplates.find((tpl) => tpl.id === templateId)
      : widgetTemplates[0];

    if (!template) {
      setDraft(emptyDraftFromType("kpi"));
      return;
    }

    setDraft(draftFromTemplate(template));
    setActiveWidgetId(undefined);
  };

  const startEdit = (widgetId: string) => {
    const widget = widgets.find((item) => item.id === widgetId);
    if (!widget) return;

    setDraft({
      mode: "edit",
      baseId: widget.id,
      importedFilterId: undefined,
      title: widget.title,
      description: widget.description,
      type: widget.type,
      size: widget.size,
      config: copyConfig(widget.config),
    });
    setActiveWidgetId(widget.id);
  };

  const handleDraftChange = useCallback((next: WidgetDraft) => {
    setDraft((prev) => {
      if (!prev) return next;
      const changedConfig = JSON.stringify(prev.config) !== JSON.stringify(next.config);
      if (changedConfig && prev.importedFilterId && next.importedFilterId === prev.importedFilterId) {
        return { ...next, importedFilterId: undefined };
      }
      return next;
    });
  }, []);

  const importSavedFilter = async (filterId: string) => {
    if (!draft) return;
    let filterDetails: FilterResponseDto;
    try {
      filterDetails = await filterService.getById(filterId);
    } catch {
      setToastMessage("No se pudo cargar el filtro seleccionado.");
      return;
    }

    const definition = parseFilterDefinition(filterDetails.definition);
    if (!definition) {
      setToastMessage("El filtro guardado no tiene un formato compatible.");
      return;
    }

    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        importedFilterId: filterId,
        config: mergeFilterIntoConfig(prev.config, definition),
      };
    });
    setToastMessage(`Filtro "${filterDetails.name}" importado al grafico.`);
  };

  const saveDraft = async () => {
    if (!draft) return;

    const payloadBase = {
      name: draft.title,
      ...mapFrontendToBackend(draft),
      configuration: buildConfiguration(draft, categoryIdsByName),
      importFilterId: draft.importedFilterId,
      displayOrder: draft.mode === "create"
        ? widgets.length
        : widgets.find((w) => w.id === draft.baseId)?.order ?? 0,
      layoutSize: draft.size.toUpperCase(),
      visible: true,
      pinned: false,
    };

    if (draft.mode === "create") {
      try {
        const created = await chartService.create(payloadBase);
        const mapped = mapBackendToFrontend(created, categoryIdsByName);
        setWidgets((prev) => normalizeOrder([...prev, mapped]));
        setActiveWidgetId(mapped.id);
        try {
          const preview = await chartService.previewSaved(mapped.id);
          setPreviewsByWidgetId((prev) => ({ ...prev, [mapped.id]: preview.data }));
        } catch {
          // No bloqueamos guardado si falla preview.
        }
      } catch {
        setToastMessage("No se pudo guardar el grafico.");
        return;
      }
    } else {
      if (!draft.baseId) return;
      const baseId = draft.baseId;
      try {
        const updated = await chartService.update(baseId, payloadBase);
        const mapped = mapBackendToFrontend(updated, categoryIdsByName);
        setWidgets((prev) =>
          normalizeOrder(prev.map((widget) => (widget.id === baseId ? mapped : widget))),
        );
        setActiveWidgetId(baseId);
        try {
          const preview = await chartService.previewSaved(baseId);
          setPreviewsByWidgetId((prev) => ({ ...prev, [baseId]: preview.data }));
        } catch {
          // No bloqueamos guardado si falla preview.
        }
      } catch {
        setToastMessage("No se pudo actualizar el grafico.");
        return;
      }
    }

    setDraft(null);
  };

  const deleteWidget = async (widgetId: string) => {
    let removedRemotely = false;
    try {
      await chartService.remove(widgetId);
      removedRemotely = true;
    } catch {
      removedRemotely = false;
    }

    if (!removedRemotely && !isLocalWidgetId(widgetId)) {
      setToastMessage("No se pudo borrar el grafico.");
      return;
    }

    setWidgets((prev) => normalizeOrder(prev.filter((widget) => widget.id !== widgetId)));
    setPreviewsByWidgetId((prev) => {
      const copy = { ...prev };
      delete copy[widgetId];
      return copy;
    });
    if (activeWidgetId === widgetId) {
      setActiveWidgetId(undefined);
      setDraft(null);
    }
  };

  const persistOrder = async (orderedWidgets: AnalysisWidget[]) => {
    await Promise.all(
      orderedWidgets
        .filter((item) => !isLocalWidgetId(item.id))
        .map((item) => chartService.update(item.id, { displayOrder: item.order })),
    ).catch(() => {
      setToastMessage("Se movio el grafico localmente, pero no se pudo guardar el orden.");
    });
  };

  const reorderWidgets = async (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const ordered = normalizeOrder(widgets);
    const fromIndex = ordered.findIndex((item) => item.id === fromId);
    const toIndex = ordered.findIndex((item) => item.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;

    const copy = ordered.slice();
    const [moved] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, moved);

    const normalized = normalizeOrder(copy);
    setWidgets(normalized);
    await persistOrder(normalized);
  };

  const moveWidget = async (widgetId: string, direction: "up" | "down") => {
    const ordered = normalizeOrder(widgets);
    const index = ordered.findIndex((item) => item.id === widgetId);
    if (index < 0) return;

    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= ordered.length) return;

    await reorderWidgets(widgetId, ordered[target].id);
  };

  if (loading) {
    return <div className="py-8 text-sm text-slate-500">Cargando analisis...</div>;
  }

  return (
    <>
      <div className="space-y-5">
        <PageHeader
          left={<ChartNoAxesCombined className="h-6 w-6 text-sky-600" />}
          title="Análisis"
          subtitle="Crea, previsualiza y ordena tus gráficos con los mismos filtros que usas en transacciones."
          actions={(
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  void synchronizeAndReload();
                }}
                disabled={syncing || loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Sincronizando..." : "Sincronizar"}
              </Button>

              <Button onClick={() => startCreate()}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo gráfico
              </Button>
            </div>
          )}
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <AnalysisBoard
            widgets={sortedWidgets}
            transactions={transactions}
            previewsByWidgetId={previewsByWidgetId}
            activeWidgetId={activeWidgetId}
            onCreate={() => startCreate()}
            onEdit={startEdit}
            onDelete={deleteWidget}
            onMove={moveWidget}
            onReorder={reorderWidgets}
          />

          <AnalysisConfigurator
            draft={draft}
            draftPreviewData={draftPreviewData}
            templates={widgetTemplates}
            transactions={transactions}
            savedFilters={savedFilters}
            onStartCreate={startCreate}
            onDraftChange={handleDraftChange}
            onImportFilter={(filterId) => {
              void importSavedFilter(filterId);
            }}
            onSave={() => {
              void saveDraft();
            }}
            onCancel={() => setDraft(null)}
          />
        </div>
      </div>

      {toastMessage ? (
        <ToastBanner
          tone="info"
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      ) : null}
    </>
  );
}
