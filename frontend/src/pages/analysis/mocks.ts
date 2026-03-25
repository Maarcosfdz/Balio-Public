import type {
  AnalysisWidget,
  DateRangePreset,
  WidgetConfig,
  WidgetDraft,
  WidgetTemplate,
} from "./types";
import i18n from "@/i18n";

const defaultConfig = {
  dateRange: "90d" as DateRangePreset,
  transactionType: undefined as "INCOME" | "EXPENSE" | undefined,
  accountId: undefined as string | undefined,
  categoryIds: [] as string[],
  startDate: undefined as string | undefined,
  endDate: undefined as string | undefined,
  specificDates: [] as string[],
  nameQuery: "",
  amountMin: undefined as number | undefined,
  amountMax: undefined as number | undefined,
};

export const widgetTemplates: WidgetTemplate[] = [
  {
    id: "tpl-kpi-balance",
    label: i18n.t("analysis.templates.tpl-kpi-balance.label"),
    description: i18n.t("analysis.templates.tpl-kpi-balance.description"),
    type: "kpi",
    size: "sm",
    config: { ...defaultConfig, metric: "balance" },
  },
  {
    id: "tpl-table-category",
    label: i18n.t("analysis.templates.tpl-table-category.label"),
    description: i18n.t("analysis.templates.tpl-table-category.description"),
    type: "table",
    size: "md",
    config: { ...defaultConfig, groupBy: "category", limit: 6, valueMode: "amount" },
  },
  {
    id: "tpl-bar-expenses",
    label: i18n.t("analysis.templates.tpl-bar-expenses.label"),
    description: i18n.t("analysis.templates.tpl-bar-expenses.description"),
    type: "bar",
    size: "md",
    config: { ...defaultConfig, mode: "expensesByCategory", valueMode: "amount", seriesColors: {} },
  },
  {
    id: "tpl-line-trend",
    label: i18n.t("analysis.templates.tpl-line-trend.label"),
    description: i18n.t("analysis.templates.tpl-line-trend.description"),
    type: "line",
    size: "lg",
    config: {
      ...defaultConfig,
      mode: "balanceTrend",
      valueMode: "amount",
      visualization: "area",
      splitBy: "none",
      seriesKeys: [],
      seriesColors: {},
    },
  },
  {
    id: "tpl-donut",
    label: i18n.t("analysis.templates.tpl-donut.label"),
    description: i18n.t("analysis.templates.tpl-donut.description"),
    type: "donut",
    size: "md",
    config: { ...defaultConfig, mode: "expensesByCategory", valueMode: "amount", seriesColors: {} },
  },
  {
    id: "tpl-stacked",
    label: i18n.t("analysis.templates.tpl-stacked.label"),
    description: i18n.t("analysis.templates.tpl-stacked.description"),
    type: "stackedBar",
    size: "lg",
    config: {
      ...defaultConfig,
      mode: "monthlyIncomeExpenseByAccount",
      stackBy: "type",
      valueMode: "amount",
      seriesKeys: [],
      seriesColors: {},
    },
  },
  {
    id: "tpl-heatmap",
    label: i18n.t("analysis.templates.tpl-heatmap.label"),
    description: i18n.t("analysis.templates.tpl-heatmap.description"),
    type: "heatmap",
    size: "md",
    config: { ...defaultConfig, mode: "dailyExpenses" },
  },
  {
    id: "tpl-comparison",
    label: i18n.t("analysis.templates.tpl-comparison.label"),
    description: i18n.t("analysis.templates.tpl-comparison.description"),
    type: "comparison",
    size: "sm",
    config: { ...defaultConfig, compare: "monthVsPrevious", seriesColors: {} },
  },
];

export function buildInitialWidgets(): AnalysisWidget[] {
  const source = ["tpl-kpi-balance", "tpl-line-trend"];

  return source
    .map((templateId, idx) => {
      const template = widgetTemplates.find((tpl) => tpl.id === templateId);
      if (!template) {
        return null;
      }
      return {
        id: `wdg-${idx + 1}`,
        title: template.label,
        description: template.description,
        type: template.type,
        size: template.size,
        visible: true,
        order: idx,
        config: template.config,
      } as AnalysisWidget;
    })
    .filter((widget): widget is AnalysisWidget => widget !== null);
}

export function draftFromTemplate(template: WidgetTemplate): WidgetDraft {
  return {
    mode: "create",
    importedFilterId: undefined,
    title: template.label,
    description: template.description,
    type: template.type,
    size: template.size,
    config: structuredClone(template.config),
  };
}

export function emptyDraftFromType(type: AnalysisWidget["type"]): WidgetDraft {
  const fallback = widgetTemplates.find((tpl) => tpl.type === "table") ?? widgetTemplates[0];
  const match = widgetTemplates.find((tpl) => tpl.type === type) ?? fallback;
  return draftFromTemplate(match);
}

export function copyConfig(config: WidgetConfig): WidgetConfig {
  return structuredClone(config);
}

/**
 * Build a fresh config for the given type, preserving the common filter fields
 * from the previous config so the user doesn't lose filter selections when
 * switching chart types.
 */
export function buildConfigForType(
  type: AnalysisWidget["type"],
  previousConfig?: WidgetConfig,
): WidgetConfig {
  const fallback = widgetTemplates.find((tpl) => tpl.type === "table") ?? widgetTemplates[0];
  const template = widgetTemplates.find((tpl) => tpl.type === type) ?? fallback;
  const base = structuredClone(template.config);

  if (!previousConfig) return base;

  // Carry over the common filter fields
  return {
    ...base,
    dateRange: previousConfig.dateRange,
    transactionType: previousConfig.transactionType,
    accountId: previousConfig.accountId,
    categoryIds: [...previousConfig.categoryIds],
    startDate: previousConfig.startDate,
    endDate: previousConfig.endDate,
    specificDates: [...previousConfig.specificDates],
    nameQuery: previousConfig.nameQuery,
    amountMin: previousConfig.amountMin,
    amountMax: previousConfig.amountMax,
  } as WidgetConfig;
}

