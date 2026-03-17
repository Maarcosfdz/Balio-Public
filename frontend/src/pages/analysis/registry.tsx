import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalysisTransaction, AnalysisWidget, WidgetConfig, WidgetType } from "./types";

interface RendererInput {
  widget: AnalysisWidget;
  transactions: AnalysisTransaction[];
  previewData?: unknown;
}

interface WidgetRendererDefinition {
  label: string;
  render: (input: RendererInput) => ReactNode;
}

const CHART_COLORS = ["#0284c7", "#0f766e", "#2563eb", "#f59e0b", "#dc2626", "#7c3aed"];

function toMoney(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTooltipValue(value: number | string | undefined): string {
  if (typeof value === "number") return toMoney(value);
  if (typeof value === "string") return value;
  return "-";
}

interface ChartDataset {
  label: string;
  data: number[];
}

interface ChartPreview {
  labels: string[];
  datasets: ChartDataset[];
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
}

function toChartPreview(data: unknown): ChartPreview | null {
  const obj = toRecord(data);
  if (!obj) return null;
  const labelsRaw = obj.labels;
  const datasetsRaw = obj.datasets;
  if (!Array.isArray(labelsRaw) || !Array.isArray(datasetsRaw)) return null;

  const labels = labelsRaw.map((item) => String(item));
  const datasets: ChartDataset[] = datasetsRaw
    .map((item) => {
      const row = toRecord(item);
      if (!row || !Array.isArray(row.data)) return null;
      return {
        label: typeof row.label === "string" ? row.label : "Serie",
        data: row.data.map((n) => Number(n ?? 0)),
      };
    })
    .filter((item): item is ChartDataset => item !== null);

  if (datasets.length === 0) return null;
  return { labels, datasets };
}

function zipSeries(labels: string[], values: number[], key = "amount") {
  return labels.map((label, idx) => ({ name: label, [key]: Number(values[idx] ?? 0) }));
}

function rangeStart(preset: WidgetConfig["dateRange"]): Date {
  const now = new Date();
  const start = new Date(now);
  if (preset === "30d") start.setDate(start.getDate() - 30);
  if (preset === "90d") start.setDate(start.getDate() - 90);
  if (preset === "365d") start.setDate(start.getDate() - 365);
  if (preset === "ytd") {
    start.setMonth(0);
    start.setDate(1);
  }
  return start;
}

function applyCommonFilters(
  transactions: AnalysisTransaction[],
  config: WidgetConfig,
): AnalysisTransaction[] {
  const start = config.startDate ? new Date(config.startDate) : rangeStart(config.dateRange);
  const end = config.endDate ? new Date(config.endDate) : new Date();
  const specificDates = new Set(config.specificDates ?? []);
  const normalizedQuery = config.nameQuery.trim().toLowerCase();

  return transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    if (txDate < start) return false;
    if (txDate > end) return false;
    if (config.transactionType && tx.type !== config.transactionType) return false;
    if (config.accountId && tx.accountId !== config.accountId) return false;
    if (config.categoryIds.length > 0 && (!tx.categoryId || !config.categoryIds.includes(tx.categoryId))) return false;
    if (specificDates.size > 0 && !specificDates.has(tx.date.slice(0, 10))) return false;
    if (normalizedQuery && !tx.name.toLowerCase().includes(normalizedQuery)) return false;
    if (typeof config.amountMin === "number" && tx.amount < config.amountMin) return false;
    if (typeof config.amountMax === "number" && tx.amount > config.amountMax) return false;
    return true;
  });
}

function getMonthLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("es-ES", { month: "short" });
}

function groupByCategory(transactions: AnalysisTransaction[], txType?: "INCOME" | "EXPENSE") {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (txType && tx.type !== txType) continue;
    map.set(tx.categoryName, (map.get(tx.categoryName) ?? 0) + tx.amount);
  }
  return Array.from(map.entries())
    .map(([name, amount]) => ({ name, amount: Number(amount.toFixed(2)) }))
    .sort((a, b) => b.amount - a.amount);
}

function groupByAccount(transactions: AnalysisTransaction[], txType?: "INCOME" | "EXPENSE") {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (txType && tx.type !== txType) continue;
    map.set(tx.accountName, (map.get(tx.accountName) ?? 0) + tx.amount);
  }
  return Array.from(map.entries()).map(([name, amount]) => ({
    name,
    amount: Number(amount.toFixed(2)),
  }));
}

function monthlyIncomeExpense(transactions: AnalysisTransaction[]) {
  const map = new Map<string, { month: string; income: number; expense: number }>();
  for (const tx of transactions) {
    const key = tx.date.slice(0, 7);
    const existing = map.get(key) ?? { month: getMonthLabel(tx.date), income: 0, expense: 0 };
    if (tx.type === "INCOME") existing.income += tx.amount;
    if (tx.type === "EXPENSE") existing.expense += tx.amount;
    map.set(key, existing);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => ({
      month: value.month,
      income: Number(value.income.toFixed(2)),
      expense: Number(value.expense.toFixed(2)),
      balance: Number((value.income - value.expense).toFixed(2)),
    }));
}

function stackedByAccountAndMonth(transactions: AnalysisTransaction[]) {
  const months = monthlyIncomeExpense(transactions);
  const accounts = Array.from(new Set(transactions.map((tx) => tx.accountName)));
  const result = months.map((month) => ({ month: month.month } as Record<string, string | number>));

  for (const monthRow of result) {
    for (const account of accounts) {
      monthRow[`${account} ingreso`] = 0;
      monthRow[`${account} gasto`] = 0;
    }
  }

  const monthKeyOrder = monthlyIncomeExpense(transactions).map((m) => m.month);

  for (const tx of transactions) {
    const monthLabel = getMonthLabel(tx.date);
    const idx = monthKeyOrder.indexOf(monthLabel);
    if (idx < 0) continue;
    const row = result[idx];
    const key = `${tx.accountName} ${tx.type === "INCOME" ? "ingreso" : "gasto"}`;
    row[key] = Number(((row[key] as number) + tx.amount).toFixed(2));
  }

  return { rows: result, accounts };
}

function heatmapDailyExpenses(transactions: AnalysisTransaction[]) {
  const expenses = transactions.filter((tx) => tx.type === "EXPENSE");
  const map = new Map<number, number>();
  for (const tx of expenses) {
    const day = new Date(tx.date).getDate();
    map.set(day, (map.get(day) ?? 0) + tx.amount);
  }
  const max = Math.max(1, ...map.values());

  return Array.from({ length: 31 }, (_, idx) => {
    const day = idx + 1;
    const value = map.get(day) ?? 0;
    return {
      day,
      value: Number(value.toFixed(2)),
      intensity: value === 0 ? 0 : Math.min(1, value / max),
    };
  });
}

function comparePeriods(transactions: AnalysisTransaction[], compare: "monthVsPrevious" | "quarterVsPrevious") {
  const now = new Date();
  const currentStart = new Date(now);
  const previousStart = new Date(now);
  const previousEnd = new Date(now);

  if (compare === "monthVsPrevious") {
    currentStart.setMonth(now.getMonth(), 1);
    previousStart.setMonth(now.getMonth() - 1, 1);
    previousEnd.setMonth(now.getMonth(), 0);
  } else {
    currentStart.setMonth(now.getMonth() - 2, 1);
    previousStart.setMonth(now.getMonth() - 5, 1);
    previousEnd.setMonth(now.getMonth() - 2, 0);
  }

  let currentIncome = 0;
  let currentExpense = 0;
  let previousIncome = 0;
  let previousExpense = 0;

  for (const tx of transactions) {
    const date = new Date(tx.date);
    const isCurrent = date >= currentStart && date <= now;
    const isPrevious = date >= previousStart && date <= previousEnd;
    if (!isCurrent && !isPrevious) continue;

    if (isCurrent) {
      if (tx.type === "INCOME") currentIncome += tx.amount;
      else currentExpense += tx.amount;
    } else {
      if (tx.type === "INCOME") previousIncome += tx.amount;
      else previousExpense += tx.amount;
    }
  }

  return [
    { period: "Actual", income: currentIncome, expense: currentExpense },
    { period: "Anterior", income: previousIncome, expense: previousExpense },
  ];
}

const widgetRegistry: Record<WidgetType, WidgetRendererDefinition> = {
  kpi: {
    label: "KPI",
    render: ({ widget, transactions, previewData }) => {
      const preview = toRecord(previewData);
      if (preview && typeof preview.value === "number") {
        const kpiType = typeof preview.kpiType === "string" ? preview.kpiType : "KPI";
        const isPercent = kpiType === "SAVINGS_RATE";
        return (
          <div className="h-full rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">{kpiType}</p>
            <p className="mt-2 text-4xl font-semibold text-slate-800">
              {isPercent ? `${Number(preview.value).toFixed(1)}%` : toMoney(Number(preview.value))}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Basado en {Number(preview.transactionCount ?? 0)} movimientos
            </p>
          </div>
        );
      }

      const filtered = applyCommonFilters(transactions, widget.config);
      const income = filtered.filter((tx) => tx.type === "INCOME").reduce((sum, tx) => sum + tx.amount, 0);
      const expense = filtered.filter((tx) => tx.type === "EXPENSE").reduce((sum, tx) => sum + tx.amount, 0);

      const config = widget.config;
      if (!("metric" in config)) return null;

      const metricMap = {
        income: { label: "Ingresos", value: income },
        expense: { label: "Gastos", value: expense },
        balance: { label: "Balance", value: income - expense },
        savingsRate: {
          label: "Tasa de ahorro",
          value: income <= 0 ? 0 : ((income - expense) / income) * 100,
        },
      };

      const metric = metricMap[config.metric];
      const isPercent = config.metric === "savingsRate";

      return (
        <div className="h-full rounded-xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">{metric.label}</p>
          <p className="mt-2 text-4xl font-semibold text-slate-800">
            {isPercent ? `${metric.value.toFixed(1)}%` : toMoney(metric.value)}
          </p>
          <p className="mt-3 text-xs text-slate-500">Basado en {filtered.length} movimientos</p>
        </div>
      );
    },
  },
  table: {
    label: "Tabla",
    render: ({ widget, transactions, previewData }) => {
      const preview = toRecord(previewData);
      if (preview && Array.isArray(preview.rows)) {
        const rows = preview.rows
          .map((item) => toRecord(item))
          .filter((item): item is Record<string, unknown> => item !== null);

        return (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2 text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={`${String(row.id ?? idx)}`} className="border-t border-slate-100">
                    <td className="px-3 py-2">{String(row.name ?? row.category ?? row.account ?? "-")}</td>
                    <td className="px-3 py-2 text-right font-medium">{toMoney(Number(row.amount ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      const filtered = applyCommonFilters(transactions, widget.config);
      const config = widget.config;
      if (!("groupBy" in config)) return null;

      const rows =
        config.groupBy === "category"
          ? groupByCategory(filtered)
          : groupByAccount(filtered);

      const limitedRows = rows.slice(0, config.limit);

      return (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">{config.groupBy === "category" ? "Categoria" : "Cuenta"}</th>
                <th className="px-3 py-2 text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              {limitedRows.map((row) => (
                <tr key={row.name} className="border-t border-slate-100">
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2 text-right font-medium">{toMoney(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    },
  },
  bar: {
    label: "Barras",
    render: ({ widget, transactions, previewData }) => {
      const preview = toChartPreview(previewData);
      if (preview) {
        const dataset = preview.datasets[0];
        const data = zipSeries(preview.labels, dataset.data);
        return (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={formatTooltipValue} />
              <Bar dataKey="amount" fill="#0f766e" radius={6} />
            </BarChart>
          </ResponsiveContainer>
        );
      }

      const filtered = applyCommonFilters(transactions, widget.config);
      const config = widget.config;
      if (!("mode" in config)) return null;
      const data =
        config.mode === "expensesByCategory"
          ? groupByCategory(filtered, "EXPENSE")
          : monthlyIncomeExpense(filtered).map((row) => ({ name: row.month, amount: row.income }));

      return (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={formatTooltipValue} />
            <Bar dataKey="amount" fill="#0f766e" radius={6} />
          </BarChart>
        </ResponsiveContainer>
      );
    },
  },
  line: {
    label: "Linea",
    render: ({ widget, transactions, previewData }) => {
      const preview = toChartPreview(previewData);
      if (preview) {
        const data = preview.labels.map((label, idx) => {
          const row: Record<string, string | number> = { month: label };
          preview.datasets.forEach((dataset) => {
            row[dataset.label] = Number(dataset.data[idx] ?? 0);
          });
          return row;
        });

        if (preview.datasets.length === 1) {
          return (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={formatTooltipValue} />
                <Area type="monotone" dataKey={preview.datasets[0].label} stroke="#0284c7" fill="#bae6fd" />
              </AreaChart>
            </ResponsiveContainer>
          );
        }

        return (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={formatTooltipValue} />
              {preview.datasets.map((dataset, idx) => (
                <Line
                  key={dataset.label}
                  type="monotone"
                  dataKey={dataset.label}
                  stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      }

      const filtered = applyCommonFilters(transactions, widget.config);
      const config = widget.config;
      if (!("mode" in config)) return null;
      const monthly = monthlyIncomeExpense(filtered);

      return (
        <ResponsiveContainer width="100%" height={240}>
          {config.mode === "balanceTrend" ? (
            <AreaChart data={monthly}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={formatTooltipValue} />
              <Area type="monotone" dataKey="balance" stroke="#0284c7" fill="#bae6fd" />
            </AreaChart>
          ) : (
            <LineChart data={monthly}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={formatTooltipValue} />
              <Line type="monotone" dataKey="income" stroke="#0f766e" strokeWidth={2} />
              <Line type="monotone" dataKey="expense" stroke="#dc2626" strokeWidth={2} />
            </LineChart>
          )}
        </ResponsiveContainer>
      );
    },
  },
  donut: {
    label: "Donut",
    render: ({ widget, transactions, previewData }) => {
      const preview = toChartPreview(previewData);
      if (preview) {
        const dataset = preview.datasets[0];
        const data = preview.labels.map((label, idx) => ({
          name: label,
          amount: Number(dataset.data[idx] ?? 0),
        }));

        return (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data} dataKey="amount" nameKey="name" innerRadius={50} outerRadius={86}>
                {data.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={formatTooltipValue} />
            </PieChart>
          </ResponsiveContainer>
        );
      }

      const filtered = applyCommonFilters(transactions, widget.config);
      const config = widget.config;
      if (!("mode" in config)) return null;
      const data =
        config.mode === "expensesByCategory"
          ? groupByCategory(filtered, "EXPENSE")
          : groupByAccount(filtered, "EXPENSE");

      return (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data} dataKey="amount" nameKey="name" innerRadius={50} outerRadius={86}>
              {data.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={formatTooltipValue} />
          </PieChart>
        </ResponsiveContainer>
      );
    },
  },
  stackedBar: {
    label: "Barras apiladas",
    render: ({ widget, transactions, previewData }) => {
      const preview = toChartPreview(previewData);
      if (preview) {
        const data = preview.labels.map((label, idx) => {
          const row: Record<string, string | number> = { month: label };
          preview.datasets.forEach((dataset) => {
            row[dataset.label] = Number(dataset.data[idx] ?? 0);
          });
          return row;
        });

        return (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={formatTooltipValue} />
              {preview.datasets.map((dataset, idx) => (
                <Bar
                  key={dataset.label}
                  dataKey={dataset.label}
                  stackId={idx % 2 === 0 ? "in" : "out"}
                  fill={CHART_COLORS[idx % CHART_COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      }

      const filtered = applyCommonFilters(transactions, widget.config);
      const stack = stackedByAccountAndMonth(filtered);

      return (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={stack.rows}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={formatTooltipValue} />
            {stack.accounts.map((account, idx) => (
              <Bar key={`${account}-in`} dataKey={`${account} ingreso`} stackId={`in-${idx}`} fill="#0f766e" />
            ))}
            {stack.accounts.map((account, idx) => (
              <Bar key={`${account}-out`} dataKey={`${account} gasto`} stackId={`out-${idx}`} fill="#dc2626" />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    },
  },
  heatmap: {
    label: "Heatmap",
    render: ({ widget, transactions, previewData }) => {
      const preview = toChartPreview(previewData);
      if (preview) {
        const values = preview.datasets[0]?.data ?? [];
        const max = Math.max(1, ...values);
        const data = preview.labels.map((label, idx) => ({
          label,
          value: Number(values[idx] ?? 0),
          intensity: Number(values[idx] ?? 0) === 0 ? 0 : Math.min(1, Number(values[idx] ?? 0) / max),
        }));

        return (
          <div className="grid grid-cols-7 gap-2">
            {data.map((item) => {
              const bg =
                item.intensity === 0
                  ? "bg-slate-100"
                  : item.intensity < 0.3
                    ? "bg-cyan-200"
                    : item.intensity < 0.6
                      ? "bg-cyan-400"
                      : "bg-cyan-600";

              return (
                <div
                  key={item.label}
                  className={`rounded-lg border border-slate-200 p-2 text-center text-xs ${bg}`}
                  title={`${item.label}: ${toMoney(item.value)}`}
                >
                  <div className="font-medium">{item.label}</div>
                  <div className="text-[10px] text-slate-700">{item.value > 0 ? toMoney(item.value) : "-"}</div>
                </div>
              );
            })}
          </div>
        );
      }

      const filtered = applyCommonFilters(transactions, widget.config);
      const data = heatmapDailyExpenses(filtered);

      return (
        <div className="grid grid-cols-7 gap-2">
          {data.map((item) => {
            const bg =
              item.intensity === 0
                ? "bg-slate-100"
                : item.intensity < 0.3
                  ? "bg-cyan-200"
                  : item.intensity < 0.6
                    ? "bg-cyan-400"
                    : "bg-cyan-600";

            return (
              <div
                key={item.day}
                className={`rounded-lg border border-slate-200 p-2 text-center text-xs ${bg}`}
                title={`Dia ${item.day}: ${toMoney(item.value)}`}
              >
                <div className="font-medium">{item.day}</div>
                <div className="text-[10px] text-slate-700">{item.value > 0 ? toMoney(item.value) : "-"}</div>
              </div>
            );
          })}
        </div>
      );
    },
  },
  comparison: {
    label: "Comparacion",
    render: ({ widget, transactions, previewData }) => {
      const preview = toChartPreview(previewData);
      if (preview) {
        const data = preview.labels.map((label, idx) => {
          const row: Record<string, string | number> = { period: label };
          preview.datasets.forEach((dataset) => {
            row[dataset.label] = Number(dataset.data[idx] ?? 0);
          });
          return row;
        });

        return (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={formatTooltipValue} />
              {preview.datasets.map((dataset, idx) => (
                <Bar key={dataset.label} dataKey={dataset.label} fill={CHART_COLORS[idx % CHART_COLORS.length]} radius={6} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      }

      const filtered = applyCommonFilters(transactions, widget.config);
      const config = widget.config;
      if (!("compare" in config)) return null;
      const data = comparePeriods(filtered, config.compare);

      return (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip formatter={formatTooltipValue} />
            <Bar dataKey="income" fill="#0f766e" radius={6} />
            <Bar dataKey="expense" fill="#dc2626" radius={6} />
          </BarChart>
        </ResponsiveContainer>
      );
    },
  },
};

export function getWidgetRenderer(type: WidgetType): WidgetRendererDefinition {
  return widgetRegistry[type];
}

export function renderWidget(widget: AnalysisWidget, transactions: AnalysisTransaction[], previewData?: unknown): ReactNode {
  return widgetRegistry[widget.type].render({ widget, transactions, previewData });
}
