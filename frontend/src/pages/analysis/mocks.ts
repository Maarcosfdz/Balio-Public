import type {
  AnalysisWidget,
  DateRangePreset,
  WidgetConfig,
  WidgetDraft,
  WidgetTemplate,
} from "./types";

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
    label: "KPI: Net balance",
    description: "Income - expenses in the selected period.",
    type: "kpi",
    size: "sm",
    config: { ...defaultConfig, metric: "balance" },
  },
  {
    id: "tpl-table-category",
    label: "Table by category",
    description: "Top categories by amount.",
    type: "table",
    size: "md",
    config: { ...defaultConfig, groupBy: "category", limit: 6, valueMode: "amount" },
  },
  {
    id: "tpl-bar-expenses",
    label: "Expense bars",
    description: "Distribution of expenses by category.",
    type: "bar",
    size: "md",
    config: { ...defaultConfig, mode: "expensesByCategory", valueMode: "amount", seriesColors: {} },
  },
  {
    id: "tpl-line-trend",
    label: "Balance line",
    description: "Evolution of accumulated balance.",
    type: "line",
    size: "lg",
    config: { ...defaultConfig, mode: "balanceTrend", valueMode: "amount" },
  },
  {
    id: "tpl-donut",
    label: "Expenses donut",
    description: "Weight of each category in your expenses.",
    type: "donut",
    size: "md",
    config: { ...defaultConfig, mode: "expensesByCategory", valueMode: "amount", seriesColors: {} },
  },
  {
    id: "tpl-stacked",
    label: "Stacked bars",
    description: "Income and expense by account and month.",
    type: "stackedBar",
    size: "lg",
    config: { ...defaultConfig, mode: "monthlyIncomeExpenseByAccount", stackBy: "type" },
  },
  {
    id: "tpl-heatmap",
    label: "Heatmap",
    description: "Concentration of daily expenses.",
    type: "heatmap",
    size: "md",
    config: { ...defaultConfig, mode: "dailyExpenses" },
  },
  {
    id: "tpl-comparison",
    label: "Period comparison",
    description: "Current period vs previous.",
    type: "comparison",
    size: "sm",
    config: { ...defaultConfig, compare: "monthVsPrevious" },
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
  const match = widgetTemplates.find((tpl) => tpl.type === type) ?? widgetTemplates[0];
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
  const template = widgetTemplates.find((tpl) => tpl.type === type) ?? widgetTemplates[0];
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

