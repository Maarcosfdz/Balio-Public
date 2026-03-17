import type {
  AnalysisTransaction,
  AnalysisWidget,
  DateRangePreset,
  WidgetConfig,
  WidgetDraft,
  WidgetTemplate,
} from "./types";

const TODAY = new Date();

function dateDaysAgo(days: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export const mockTransactions: AnalysisTransaction[] = [
  { id: "tx-1", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Nomina", name: "Nomina", type: "INCOME", amount: 1850, date: dateDaysAgo(2) },
  { id: "tx-2", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Alquiler", name: "Alquiler", type: "EXPENSE", amount: 720, date: dateDaysAgo(1) },
  { id: "tx-3", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Supermercado", name: "Supermercado", type: "EXPENSE", amount: 83.4, date: dateDaysAgo(3) },
  { id: "tx-4", accountId: "acc-card", accountName: "Tarjeta", categoryName: "Restaurantes", name: "Restaurantes", type: "EXPENSE", amount: 27.9, date: dateDaysAgo(4) },
  { id: "tx-5", accountId: "acc-card", accountName: "Tarjeta", categoryName: "Ocio", name: "Ocio", type: "EXPENSE", amount: 59, date: dateDaysAgo(7) },
  { id: "tx-6", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Freelance", name: "Freelance", type: "INCOME", amount: 420, date: dateDaysAgo(9) },
  { id: "tx-7", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Transporte", name: "Transporte", type: "EXPENSE", amount: 36.2, date: dateDaysAgo(10) },
  { id: "tx-8", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Supermercado", name: "Supermercado", type: "EXPENSE", amount: 91.5, date: dateDaysAgo(13) },
  { id: "tx-9", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Nomina", name: "Nomina", type: "INCOME", amount: 1850, date: dateDaysAgo(33) },
  { id: "tx-10", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Alquiler", name: "Alquiler", type: "EXPENSE", amount: 720, date: dateDaysAgo(31) },
  { id: "tx-11", accountId: "acc-card", accountName: "Tarjeta", categoryName: "Restaurantes", name: "Restaurantes", type: "EXPENSE", amount: 41.9, date: dateDaysAgo(39) },
  { id: "tx-12", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Freelance", name: "Freelance", type: "INCOME", amount: 260, date: dateDaysAgo(46) },
  { id: "tx-13", accountId: "acc-savings", accountName: "Ahorros", categoryName: "Interes", name: "Interes", type: "INCOME", amount: 11.1, date: dateDaysAgo(52) },
  { id: "tx-14", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Luz", name: "Luz", type: "EXPENSE", amount: 68.2, date: dateDaysAgo(55) },
  { id: "tx-15", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Internet", name: "Internet", type: "EXPENSE", amount: 39.9, date: dateDaysAgo(58) },
  { id: "tx-16", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Seguro", name: "Seguro", type: "EXPENSE", amount: 45, date: dateDaysAgo(70) },
  { id: "tx-17", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Nomina", name: "Nomina", type: "INCOME", amount: 1820, date: dateDaysAgo(65) },
  { id: "tx-18", accountId: "acc-card", accountName: "Tarjeta", categoryName: "Compras", name: "Compras", type: "EXPENSE", amount: 116.2, date: dateDaysAgo(76) },
  { id: "tx-19", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Viajes", name: "Viajes", type: "EXPENSE", amount: 210, date: dateDaysAgo(88) },
  { id: "tx-20", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Nomina", name: "Nomina", type: "INCOME", amount: 1820, date: dateDaysAgo(95) },
  { id: "tx-21", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Alquiler", name: "Alquiler", type: "EXPENSE", amount: 700, date: dateDaysAgo(97) },
  { id: "tx-22", accountId: "acc-card", accountName: "Tarjeta", categoryName: "Ocio", name: "Ocio", type: "EXPENSE", amount: 74, date: dateDaysAgo(102) },
  { id: "tx-23", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Supermercado", name: "Supermercado", type: "EXPENSE", amount: 96.4, date: dateDaysAgo(119) },
  { id: "tx-24", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Freelance", name: "Freelance", type: "INCOME", amount: 390, date: dateDaysAgo(121) },
  { id: "tx-25", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Nomina", name: "Nomina", type: "INCOME", amount: 1800, date: dateDaysAgo(125) },
  { id: "tx-26", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Gasolina", name: "Gasolina", type: "EXPENSE", amount: 62, date: dateDaysAgo(132) },
  { id: "tx-27", accountId: "acc-savings", accountName: "Ahorros", categoryName: "Interes", name: "Interes", type: "INCOME", amount: 9.8, date: dateDaysAgo(140) },
  { id: "tx-28", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Alquiler", name: "Alquiler", type: "EXPENSE", amount: 700, date: dateDaysAgo(150) },
  { id: "tx-29", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Nomina", name: "Nomina", type: "INCOME", amount: 1790, date: dateDaysAgo(155) },
  { id: "tx-30", accountId: "acc-card", accountName: "Tarjeta", categoryName: "Restaurantes", name: "Restaurantes", type: "EXPENSE", amount: 39.5, date: dateDaysAgo(170) },
  { id: "tx-31", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Viajes", name: "Viajes", type: "EXPENSE", amount: 160, date: dateDaysAgo(184) },
  { id: "tx-32", accountId: "acc-main", accountName: "Cuenta principal", categoryName: "Nomina", name: "Nomina", type: "INCOME", amount: 1780, date: dateDaysAgo(187) },
];

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
    label: "KPI: Balance neto",
    description: "Ingreso - gasto en el periodo seleccionado.",
    type: "kpi",
    size: "sm",
    config: { ...defaultConfig, metric: "balance" },
  },
  {
    id: "tpl-table-category",
    label: "Tabla por categoria",
    description: "Top categorias por importe.",
    type: "table",
    size: "md",
    config: { ...defaultConfig, groupBy: "category", limit: 6 },
  },
  {
    id: "tpl-bar-expenses",
    label: "Barras de gastos",
    description: "Distribucion de gastos por categoria.",
    type: "bar",
    size: "md",
    config: { ...defaultConfig, mode: "expensesByCategory" },
  },
  {
    id: "tpl-line-trend",
    label: "Linea de balance",
    description: "Evolucion del balance acumulado.",
    type: "line",
    size: "lg",
    config: { ...defaultConfig, mode: "balanceTrend" },
  },
  {
    id: "tpl-donut",
    label: "Donut de gastos",
    description: "Peso de cada categoria en tus gastos.",
    type: "donut",
    size: "md",
    config: { ...defaultConfig, mode: "expensesByCategory" },
  },
  {
    id: "tpl-stacked",
    label: "Barras apiladas",
    description: "Ingreso y gasto por cuenta y mes.",
    type: "stackedBar",
    size: "lg",
    config: { ...defaultConfig, mode: "monthlyIncomeExpenseByAccount" },
  },
  {
    id: "tpl-heatmap",
    label: "Mapa de calor",
    description: "Concentracion de gastos diarios.",
    type: "heatmap",
    size: "md",
    config: { ...defaultConfig, mode: "dailyExpenses" },
  },
  {
    id: "tpl-comparison",
    label: "Comparativa periodos",
    description: "Periodo actual frente al anterior.",
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

