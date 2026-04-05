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

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetCommonConfig {
  dateRange: DateRangePreset;
  transactionType?: "INCOME" | "EXPENSE";
  accountId?: string;
  accountIds: string[];
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
  // Optional visual/splitting options used by configurator/UI
  splitBy?: "none" | "category" | "account" | "type";
  seriesKeys?: string[];
}

export interface TableWidgetConfig extends WidgetCommonConfig {
  groupBy: "category" | "account";
  limit: number;
  valueMode: "amount" | "count";
  splitBy?: "none" | "category" | "account" | "type";
  seriesKeys?: string[];
}

export interface BarWidgetConfig extends WidgetCommonConfig {
  // Several components compare against multiple mode strings — use open string
  mode: string;
  valueMode: "amount" | "count";
  seriesColors?: Record<string, string>;
  seriesKeys?: string[];
  gradientFill?: boolean;
}

export interface LineWidgetConfig extends WidgetCommonConfig {
  mode: string;
  valueMode: "amount" | "count";
  seriesKeys?: string[];
  seriesColors?: Record<string, string>;
  visualization?: "line" | "area";
  blurFill?: boolean;
  neonGlow?: boolean;
  gradientFill?: boolean;
}

export interface DonutWidgetConfig extends WidgetCommonConfig {
  mode: string;
  valueMode: "amount" | "count";
  seriesColors?: Record<string, string>;
  seriesKeys?: string[];
}

export interface StackedBarWidgetConfig extends WidgetCommonConfig {
  mode: string;
  stackBy: "type" | "account" | "category";
  valueMode: "amount" | "count";
  seriesKeys?: string[];
  seriesColors?: Record<string, string>;
  gradientFill?: boolean;
}

export interface HeatmapWidgetConfig extends WidgetCommonConfig {
  mode: string;
  baseColor?: string;
}

export interface ComparisonWidgetConfig extends WidgetCommonConfig {
  compare: "weekVsPrevious" | "monthVsPrevious" | "quarterVsPrevious" | "yearVsPrevious";
  seriesKeys?: string[];
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
  layout?: WidgetLayout;
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
