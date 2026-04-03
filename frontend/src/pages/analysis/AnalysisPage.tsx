import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChartNoAxesCombined, LayoutDashboard, RefreshCw } from "lucide-react";
import { gsap } from "gsap";
import PageHeader from "@/components/layout/PageHeader";
import { GradientButton } from "@/components/ui/gradient-button";
import { ToastBanner, type ToastBannerTone } from "@/components/ui/toast-banner";
import InfoCard from "@/components/ui/InfoCard";
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
  buildConfigForType,
  buildInitialWidgets,
  copyConfig,
  draftFromTemplate,
  emptyDraftFromType,
  widgetTemplates,
} from "./mocks";
import { setChartCurrency } from "./registry";
import { useAuth } from "@/contexts/AuthContext";
import type { AnalysisTransaction, AnalysisWidget, LineWidgetConfig, WidgetDraft, WidgetSize, WidgetType } from "./types";
import type {
  BackendChartType,
  BackendWidgetType,
  ChartWidgetResponseDto,
  ChartWidgetSummaryDto,
} from "@/backend/chartService";
import { useTranslation } from "react-i18next";

interface FilterDefinitionLike {
  type?: "INCOME" | "EXPENSE";
  accountId?: string;
  accountIds?: string[];
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
  const visible = widgets
    .filter((widget) => widget.visible)
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((widget, idx) => ({ ...widget, order: idx }));

  const hidden = widgets
    .filter((widget) => !widget.visible)
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((widget, idx) => ({ ...widget, order: visible.length + idx }));

  return [...visible, ...hidden];
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
    const accountIds = toStringArray(parsed.accountIds);
    const oneAccount = typeof parsed.accountId === "string" ? parsed.accountId : undefined;
    if (oneAccount && !accountIds.includes(oneAccount)) accountIds.unshift(oneAccount);

    const categoryIds = toStringArray(parsed.categoryIds);
    const oneCategory = typeof parsed.categoryId === "string" ? parsed.categoryId : undefined;
    if (oneCategory && !categoryIds.includes(oneCategory)) categoryIds.unshift(oneCategory);

    return {
      type: parsed.type === "INCOME" || parsed.type === "EXPENSE" ? parsed.type : undefined,
      accountId: oneAccount,
      accountIds,
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
  const mergedAccountIds = filter.accountIds ?? (filter.accountId ? [filter.accountId] : []);

  return {
    ...config,
    dateRange: "custom",
    transactionType: filter.type,
    accountId: mergedAccountIds[0],
    accountIds: mergedAccountIds,
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
    const visualization = (widget.config as LineWidgetConfig).visualization;
    if (visualization) {
      return {
        widgetType: "CHART",
        chartType: visualization === "area" ? "AREA" : "LINE",
      };
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

  const commonFilter: Record<string, unknown> = {};
  const dateRange = typeof cfg.dateRange === "string" ? cfg.dateRange : "custom";
  const explicitStartDate = typeof cfg.startDate === "string" && cfg.startDate.length > 0
    ? cfg.startDate
    : undefined;
  const explicitEndDate = typeof cfg.endDate === "string" && cfg.endDate.length > 0
    ? cfg.endDate
    : undefined;
  const specificDates = toStringArray(cfg.specificDates);

  if (specificDates.length > 0) {
    commonFilter.specificDates = specificDates;
  } else if (explicitStartDate || explicitEndDate) {
    if (explicitStartDate) commonFilter.startDate = explicitStartDate;
    if (explicitEndDate) commonFilter.endDate = explicitEndDate;
  } else if (dateRange !== "custom") {
    commonFilter.startDate = dateRangeStart(widget.config.dateRange);
    commonFilter.endDate = todayIso();
  }

  if (cfg.transactionType === "INCOME" || cfg.transactionType === "EXPENSE") {
    commonFilter.type = cfg.transactionType;
  }

  const selectedAccountIds = toStringArray(cfg.accountIds);
  const mergedAccountIds = selectedAccountIds.length > 0
    ? selectedAccountIds
    : typeof cfg.accountId === "string" && cfg.accountId.length > 0
      ? [cfg.accountId]
      : [];

  if (mergedAccountIds.length === 1) {
    commonFilter.accountId = mergedAccountIds[0];
  }
  if (mergedAccountIds.length > 1) {
    commonFilter.accountIds = mergedAccountIds;
  }

  if (categoryIds.length === 1) commonFilter.categoryId = categoryIds[0];
  if (categoryIds.length > 1) commonFilter.categoryIds = categoryIds;

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
    backendSpecific.metric = widget.config.valueMode === "count" ? "COUNT" : "SUM";
  }

  if (widget.type === "bar" && "valueMode" in widget.config) {
    backendSpecific.groupBy = "CATEGORY";
    backendSpecific.metric = widget.config.valueMode === "count" ? "COUNT" : "SUM";
    backendSpecific.orientation = "VERTICAL";
  }

  if (widget.type === "line" && "mode" in widget.config && "valueMode" in widget.config) {
    backendSpecific.groupBy = "MONTH";
    backendSpecific.metric = widget.config.valueMode === "count"
      ? "COUNT"
      : widget.config.mode === "balanceTrend"
        ? "NET"
        : "SUM";
    backendSpecific.orientation = "VERTICAL";
  }

  if (widget.type === "donut" && "valueMode" in widget.config) {
    backendSpecific.groupBy = "CATEGORY";
    backendSpecific.metric = widget.config.valueMode === "count" ? "COUNT" : "SUM";
  }

  if (widget.type === "stackedBar") {
    backendSpecific.groupBy = "MONTH";
    backendSpecific.metric = "SUM";
  }

  if (widget.type === "heatmap") {
    backendSpecific.groupBy = "DAY";
    backendSpecific.metric = "SUM";
  }

  if (widget.type === "comparison" && "compare" in widget.config) {
    backendSpecific.groupBy =
      widget.config.compare === "weekVsPrevious"
        ? "DAY"
        : widget.config.compare === "yearVsPrevious"
          ? "MONTH"
          : "MONTH";
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
    dateRange:
      widgetConfig.dateRange === "30d"
      || widgetConfig.dateRange === "90d"
      || widgetConfig.dateRange === "365d"
      || widgetConfig.dateRange === "ytd"
      || widgetConfig.dateRange === "custom"
        ? widgetConfig.dateRange
        : toStringArray(widgetConfig.specificDates).length > 0
          || typeof widgetConfig.startDate === "string"
          || typeof widgetConfig.endDate === "string"
          || typeof rawFilter?.startDate === "string"
          || typeof rawFilter?.endDate === "string"
            ? "custom"
            : fallback.config.dateRange,
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
          ?? toStringArray(rawFilter?.accountIds)[0]
          ?? (typeof rawFilter?.accountId === "string" ? rawFilter.accountId : undefined),
    accountIds:
      toStringArray(widgetConfig.accountIds).length > 0
        ? toStringArray(widgetConfig.accountIds)
        : typeof widgetConfig.accountId === "string"
          ? [widgetConfig.accountId]
          : toStringArray(rawFilter?.accountIds).length > 0
            ? toStringArray(rawFilter?.accountIds)
          : typeof rawFilter?.accountId === "string"
            ? [rawFilter.accountId]
            : [],
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
    visible: dto.visible ?? true,
    order: dto.displayOrder ?? 0,
    config: config as AnalysisWidget["config"],
  };
}

function isLocalWidgetId(widgetId: string): boolean {
  return widgetId.startsWith("wdg-");
}

export default function AnalysisPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const infoCardItems = t("analysis.infoCardItems", { returnObjects: true }) as string[];
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChartCurrency(user?.preferredCurrency ?? "EUR");
  }, [user?.preferredCurrency]);

  // GSAP stagger entrance for page sections
  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    const sections = el.querySelectorAll<HTMLElement>(":scope > *");
    const ctx = gsap.context(() => {
      gsap.from(sections, {
        y: 20,
        opacity: 0,
        duration: 0.45,
        ease: "power2.out",
        stagger: 0.1,
        clearProps: "all",
      });
    }, el);
    return () => ctx.revert();
  }, []);
  const [toast, setToast] = useState<{ message: string; tone: ToastBannerTone } | null>(null);
  const [widgets, setWidgets] = useState<AnalysisWidget[]>([]);
  const [transactions, setTransactions] = useState<AnalysisTransaction[]>([]);
  const [savedFilters, setSavedFilters] = useState<FilterSummaryDto[]>([]);
  const [categoryCatalog, setCategoryCatalog] = useState<CategorySummaryDto[]>([]);
  const [previewsByWidgetId, setPreviewsByWidgetId] = useState<Record<string, unknown>>({});
  const [draftPreviewData, setDraftPreviewData] = useState<unknown>(undefined);
  const [refreshingDraftPreview, setRefreshingDraftPreview] = useState(false);
  const [categoryIdsByName, setCategoryIdsByName] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [draft, setDraft] = useState<WidgetDraft | null>(null);
  const [activeWidgetId, setActiveWidgetId] = useState<string | undefined>(undefined);

  const sortedWidgets = useMemo(() => normalizeOrder(widgets), [widgets]);
  const dashboardWidgets = useMemo(
    () => sortedWidgets.filter((widget) => widget.visible),
    [sortedWidgets],
  );

  const [editMode, setEditMode] = useState(false);

  const resizeWidget = (widgetId: string, size: WidgetSize) => {
    setWidgets((prev) =>
      normalizeOrder(prev.map((w) => (w.id === widgetId ? { ...w, size } : w))),
    );
  };

  const handleLayoutChange = (updates: { id: string; order: number; size: WidgetSize }[]) => {
    setWidgets((prev) => {
      const next = prev.map((w) => {
        const update = updates.find((u) => u.id === w.id);
        if (!update) return w;
        return { ...w, order: update.order, size: update.size };
      });
      return normalizeOrder(next);
    });
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    setWidgets((prev) => {
      const next = prev.map((widget) =>
        widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget,
      );
      return normalizeOrder(next);
    });

    if (activeWidgetId === widgetId) {
      const target = widgets.find((widget) => widget.id === widgetId);
      if (target?.visible) {
        setActiveWidgetId(undefined);
      }
    }
  };

  const saveEditChanges = useCallback(async () => {
    await Promise.allSettled(
      sortedWidgets
        .filter((w) => !isLocalWidgetId(w.id))
        .map((widget) => {
          const backendKind = mapFrontendToBackend(widget);
          return chartService.update(widget.id, {
            name: widget.title,
            ...backendKind,
            configuration: buildConfiguration(widget, categoryIdsByName),
            displayOrder: widget.order,
            layoutSize: widget.size.toUpperCase(),
            visible: widget.visible,
            pinned: false,
          });
        }),
    );
  }, [sortedWidgets, categoryIdsByName]);

  const toggleEditMode = () => {
    if (editMode) {
      void saveEditChanges().then(() => {
        setToast({ message: t("analysis.toasts.dashboardSaved"), tone: "success" });
      });
      setEditMode(false);
    } else {
      setEditMode(true);
    }
  };

  const loadAnalysisData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
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
      setCategoryCatalog(categories);
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
      setCategoryCatalog([]);
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
      await loadAnalysisData(true); // silent: don't show loading overlay, keep open forms intact
      setDraftPreviewData(undefined);
      setToast({ message: t("analysis.toasts.dashboardSynced"), tone: "success" });
    } catch {
      setToast({ message: t("analysis.toasts.syncError"), tone: "error" });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const refreshDraftPreview = useCallback(async () => {
    if (!draft) return;
    setRefreshingDraftPreview(true);
    try {
      const backendKind = mapFrontendToBackend(draft);
      const configuration = buildConfiguration(draft, categoryIdsByName);
      const response = await chartService.previewFromConfig({
        widgetType: backendKind.widgetType,
        chartType: backendKind.chartType,
        configuration,
        importFilterId: draft.importedFilterId,
      });
      setDraftPreviewData(response.data);
    } catch {
      setDraftPreviewData(undefined);
      setToast({ message: t("analysis.toasts.previewRefreshError"), tone: "error" });
    } finally {
      setRefreshingDraftPreview(false);
    }
  }, [draft, categoryIdsByName, t]);

  useEffect(() => {
    setDraftPreviewData(undefined);
    if (!draft) return;
    const timer = setTimeout(() => {
      void refreshDraftPreview();
    }, 350);
    return () => clearTimeout(timer);
  }, [draft, refreshDraftPreview]);

  const startCreate = (typeOrTemplateId?: string) => {
    // If called with a WidgetType (from type picker), create with empty title/description
    const isType = typeOrTemplateId && ["kpi", "table", "bar", "line", "donut", "stackedBar", "heatmap", "comparison"].includes(typeOrTemplateId);

    if (isType) {
      const type = typeOrTemplateId as WidgetType;
      setDraft({
        mode: "create",
        importedFilterId: undefined,
        title: "",
        description: "",
        type,
        size: "md",
        config: buildConfigForType(type),
      });
      setActiveWidgetId(undefined);
      return;
    }

    // Otherwise use template id
    const template = typeOrTemplateId
      ? widgetTemplates.find((tpl) => tpl.id === typeOrTemplateId)
      : widgetTemplates.find((tpl) => tpl.type === "table") ?? widgetTemplates[0];

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
      setToast({ message: t("analysis.toasts.filterLoadError"), tone: "error" });
      return;
    }

    const definition = parseFilterDefinition(filterDetails.definition);
    if (!definition) {
      setToast({ message: t("analysis.toasts.filterIncompatible"), tone: "warning" });
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
    setToast({ message: t("analysis.toasts.filterImported", { name: filterDetails.name }), tone: "success" });
  };

  const saveDraft = async () => {
    if (!draft) return;

    if (!draft.title.trim()) {
      setToast({ message: t("analysis.toasts.widgetTitleRequired"), tone: "error" });
      return;
    }

    const baseWidget = draft.mode === "edit"
      ? widgets.find((widget) => widget.id === draft.baseId)
      : undefined;

    const payloadBase = {
      name: draft.title,
      ...mapFrontendToBackend(draft),
      configuration: buildConfiguration(draft, categoryIdsByName),
      importFilterId: draft.importedFilterId,
      displayOrder: draft.mode === "create"
        ? widgets.length
        : widgets.find((w) => w.id === draft.baseId)?.order ?? 0,
      layoutSize: draft.size.toUpperCase(),
      visible: baseWidget?.visible ?? true,
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
        setToast({ message: t("analysis.toasts.widgetSaveError"), tone: "error" });
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
        setToast({ message: t("analysis.toasts.widgetUpdateError"), tone: "error" });
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
      setToast({ message: t("analysis.toasts.widgetDeleteError"), tone: "error" });
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

  if (loading) {
    return <div className="py-8 text-sm text-slate-500">{t("analysis.loading")}</div>;
  }

  return (
    <>
      <div ref={pageRef} className="space-y-5">
        <InfoCard
          id="analysis"
          accentColor="sky"
          title={t("analysis.infoCardTitle", "Analytics")}
          items={infoCardItems}
          description={t("analysis.infoCardDescription", "You can customize your dashboard with different charts.")}
        />
        <div className="analysis-hero-section">
          <div className="analysis-hero-inner">
            <PageHeader
              left={<ChartNoAxesCombined className="h-6 w-6 text-sky-600" />}
              title={t("analysis.title")}
              subtitle={t("analysis.subtitle")}
              actions={(
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="tx-sync-btn analysis-sync-btn"
                    onClick={() => {
                      void synchronizeAndReload();
                    }}
                    disabled={syncing || loading}
                    title={t("analysis.actions.sync")}
                  >
                    <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                  </button>

                  <GradientButton
                    size="sm"
                    iconVariant="other"
                    icon={<LayoutDashboard className="h-4 w-4" />}
                    onClick={toggleEditMode}
                  >
                    {editMode ? t("analysis.actions.exitEdit") : t("analysis.actions.editDashboard")}
                  </GradientButton>
                </div>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <AnalysisBoard
            widgets={dashboardWidgets}
            transactions={transactions}
            previewsByWidgetId={previewsByWidgetId}
            activeWidgetId={activeWidgetId}
            editMode={editMode}
            onCreate={() => startCreate()}
            onEdit={startEdit}
            onDelete={deleteWidget}
            onLayoutChange={handleLayoutChange}
          />

          <AnalysisConfigurator
            draft={draft}
            draftPreviewData={draftPreviewData}
            transactions={transactions}
            categories={categoryCatalog}
            savedFilters={savedFilters}
            editMode={editMode}
            widgets={sortedWidgets}
            onStartCreate={startCreate}
            onDraftChange={handleDraftChange}
            onImportFilter={(filterId) => {
              void importSavedFilter(filterId);
            }}
            onSave={() => {
              void saveDraft();
            }}
            onCancel={() => setDraft(null)}
            onEditWidget={startEdit}
            onDeleteWidget={(id) => {
              void deleteWidget(id);
            }}
            onResizeWidget={resizeWidget}
            onToggleWidgetVisibility={toggleWidgetVisibility}
            onRefreshPreview={() => {
              void refreshDraftPreview();
            }}
            refreshingPreview={refreshingDraftPreview}
          />
        </div>
      </div>

      {toast ? (
        <ToastBanner
          tone={toast.tone}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      ) : null}
    </>
  );
}
