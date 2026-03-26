export type DateRangePreset = "30d" | "90d" | "365d" | "ytd" | "custom";

export type WidgetType =
  | "kpi"
  | "table"
  | "bar"
  | "line"
  | "donut"
  | "stackedBar"
  | "heatmap"
  | "comparison";

export type WidgetSize = "sm" | "md" | "lg";

export interface WidgetCommonConfig {
  dateRange: DateRangePreset;
  transactionType?: "INCOME" | "EXPENSE";
  accountId?: string;
  categoryIds: string[];
  startDate?: string;
  endDate?: string;
  specificDates: string[];
  nameQuery: string;
  amountMin?: number;
  amountMax?: number;
}

export interface KpiWidgetConfig extends WidgetCommonConfig {
  metric: "income" | "expense" | "balance" | "savingsRate";
}

export interface TableWidgetConfig extends WidgetCommonConfig {
  groupBy: "category" | "account";
  limit: number;
  valueMode: "amount" | "count";
}

export interface BarWidgetConfig extends WidgetCommonConfig {
  mode: "expensesByCategory" | "expensesByAccount" | "incomeByMonth";
  valueMode: "amount" | "count";
  seriesColors?: Record<string, string>;
  gradientFill?: boolean;
}

export interface LineWidgetConfig extends WidgetCommonConfig {
  mode: "balanceTrend" | "incomeVsExpense" | "byCategory" | "byAccount";
  valueMode: "amount" | "count";
  visualization: "line" | "area";
  splitBy: "none" | "category" | "account";
  seriesKeys?: string[];
  seriesColors?: Record<string, string>;
  neonGlow?: boolean;
  blurFill?: boolean;
}

export interface DonutWidgetConfig extends WidgetCommonConfig {
  mode: "expensesByCategory" | "expensesByAccount";
  valueMode: "amount" | "count";
  seriesColors?: Record<string, string>;
}

export interface StackedBarWidgetConfig extends WidgetCommonConfig {
  mode: "monthlyIncomeExpenseByAccount";
  stackBy: "type" | "account" | "category";
  valueMode: "amount" | "count";
  seriesKeys?: string[];
  seriesColors?: Record<string, string>;
  gradientFill?: boolean;
}

export interface HeatmapWidgetConfig extends WidgetCommonConfig {
  mode: "dailyExpenses";
  baseColor?: string;
}

export interface ComparisonWidgetConfig extends WidgetCommonConfig {
  compare: "weekVsPrevious" | "monthVsPrevious" | "quarterVsPrevious" | "yearVsPrevious";
  seriesColors?: Record<string, string>;
  gradientFill?: boolean;
}

export type WidgetConfig =
  | KpiWidgetConfig
  | TableWidgetConfig
  | BarWidgetConfig
  | LineWidgetConfig
  | DonutWidgetConfig
  | StackedBarWidgetConfig
  | HeatmapWidgetConfig
  | ComparisonWidgetConfig;

export interface AnalysisWidget {
  id: string;
  title: string;
  description: string;
  type: WidgetType;
  size: WidgetSize;
  visible: boolean;
  order: number;
  config: WidgetConfig;
}

export interface WidgetTemplate {
  id: string;
  label: string;
  description: string;
  type: WidgetType;
  size: WidgetSize;
  config: WidgetConfig;
}

export interface AnalysisTransaction {
  id: string;
  name: string;
  accountId: string;
  accountName: string;
  categoryId?: string | null;
  categoryName: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  date: string;
}

export interface WidgetDraft {
  mode: "create" | "edit";
  baseId?: string;
  importedFilterId?: string;
  title: string;
  description: string;
  type: WidgetType;
  size: WidgetSize;
  config: WidgetConfig;
}
