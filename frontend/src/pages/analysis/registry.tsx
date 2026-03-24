import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  AnalysisTransaction,
  AnalysisWidget,
  BarWidgetConfig,
  ComparisonWidgetConfig,
  DonutWidgetConfig,
  LineWidgetConfig,
  StackedBarWidgetConfig,
  TableWidgetConfig,
  WidgetConfig,
  WidgetType,
} from "./types";

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

function chartH(size: AnalysisWidget["size"]): number {
  if (size === "lg") return 440;
  if (size === "md") return 180;
  return 180;
}

function toMoney(value: number, currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTooltipValue(value: number | string | undefined): string {
  if (typeof value === "number") return toMoney(value);
  if (typeof value === "string") return value;
  return "-";
}

function formatTooltipByMode(value: number | string | undefined, mode: "amount" | "count"): string {
  if (typeof value !== "number") return formatTooltipValue(value);
  return mode === "count" ? `${Math.round(value)} transactions` : toMoney(value);
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
        label: typeof row.label === "string" ? row.label : "Series",
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

function toIsoDay(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function applyCommonFilters(
  transactions: AnalysisTransaction[],
  config: WidgetConfig,
): AnalysisTransaction[] {
  const specificDates = new Set(config.specificDates ?? []);
  const hasSpecificDates = specificDates.size > 0;
  const startDay = hasSpecificDates
    ? undefined
    : config.startDate
      ? config.startDate.slice(0, 10)
      : config.dateRange !== "custom"
        ? toIsoDay(rangeStart(config.dateRange))
        : undefined;
  const endDay = hasSpecificDates
    ? undefined
    : config.endDate
      ? config.endDate.slice(0, 10)
      : config.dateRange !== "custom"
        ? toIsoDay(new Date())
        : undefined;
  const normalizedQuery = config.nameQuery.trim().toLowerCase();

  return transactions.filter((tx) => {
    const txDay = tx.date.slice(0, 10);
    if (startDay && txDay < startDay) return false;
    if (endDay && txDay > endDay) return false;
    if (config.transactionType && tx.type !== config.transactionType) return false;
    if (config.accountId && tx.accountId !== config.accountId) return false;
    if (config.categoryIds.length > 0 && (!tx.categoryId || !config.categoryIds.includes(tx.categoryId))) return false;
    if (specificDates.size > 0 && !specificDates.has(txDay)) return false;
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
  const map = new Map<string, { amount: number; count: number }>();
  for (const tx of transactions) {
    if (txType && tx.type !== txType) continue;
    const current = map.get(tx.categoryName) ?? { amount: 0, count: 0 };
    current.amount += tx.amount;
    current.count += 1;
    map.set(tx.categoryName, current);
  }
  return Array.from(map.entries())
    .map(([name, agg]) => ({
      name,
      amount: Number(agg.amount.toFixed(2)),
      count: agg.count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function groupByAccount(transactions: AnalysisTransaction[], txType?: "INCOME" | "EXPENSE") {
  const map = new Map<string, { amount: number; count: number }>();
  for (const tx of transactions) {
    if (txType && tx.type !== txType) continue;
    const current = map.get(tx.accountName) ?? { amount: 0, count: 0 };
    current.amount += tx.amount;
    current.count += 1;
    map.set(tx.accountName, current);
  }
  return Array.from(map.entries()).map(([name, agg]) => ({
    name,
    amount: Number(agg.amount.toFixed(2)),
    count: agg.count,
  }));
}

function monthlyIncomeExpense(transactions: AnalysisTransaction[]) {
  const map = new Map<string, {
    month: string;
    income: number;
    expense: number;
    incomeCount: number;
    expenseCount: number;
  }>();
  for (const tx of transactions) {
    const key = tx.date.slice(0, 7);
    const existing = map.get(key) ?? {
      month: getMonthLabel(tx.date),
      income: 0,
      expense: 0,
      incomeCount: 0,
      expenseCount: 0,
    };
    if (tx.type === "INCOME") {
      existing.income += tx.amount;
      existing.incomeCount += 1;
    }
    if (tx.type === "EXPENSE") {
      existing.expense += tx.amount;
      existing.expenseCount += 1;
    }
    map.set(key, existing);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => ({
      month: value.month,
      income: Number(value.income.toFixed(2)),
      expense: Number(value.expense.toFixed(2)),
      incomeCount: value.incomeCount,
      expenseCount: value.expenseCount,
      totalCount: value.incomeCount + value.expenseCount,
      balance: Number((value.income - value.expense).toFixed(2)),
      balanceCount: value.incomeCount - value.expenseCount,
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

function stackByAccountAndMonth(transactions: AnalysisTransaction[]) {
  const months = monthlyIncomeExpense(transactions);
  const accounts = Array.from(new Set(transactions.map((tx) => tx.accountName)));
  const result = months.map((month) => ({ month: month.month } as Record<string, string | number>));

  for (const monthRow of result) {
    for (const account of accounts) {
      monthRow[account] = 0;
    }
  }

  const monthKeyOrder = months.map((m) => m.month);
  for (const tx of transactions) {
    const monthLabel = getMonthLabel(tx.date);
    const idx = monthKeyOrder.indexOf(monthLabel);
    if (idx < 0) continue;
    const row = result[idx];
    row[tx.accountName] = Number(((row[tx.accountName] as number) + tx.amount).toFixed(2));
  }

  return { rows: result, accounts };
}

function heatmapDailyExpenses(transactions: AnalysisTransaction[]) {
  const expenses = transactions.filter((tx) => tx.type === "EXPENSE");
  const map = new Map<string, number>();
  const dates = expenses.map((tx) => new Date(tx.date));
  const minDate = dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : new Date();
  const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : new Date();

  for (const tx of expenses) {
    const dayKey = tx.date.slice(0, 10);
    map.set(dayKey, (map.get(dayKey) ?? 0) + tx.amount);
  }
  const max = Math.max(1, ...map.values());

  const rows: Array<{ day: string; value: number; intensity: number; dayLabel: string }> = [];
  const cursor = new Date(minDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(maxDate);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    const isoDay = toIsoDay(cursor);
    const value = map.get(isoDay) ?? 0;
    rows.push({
      day: isoDay,
      value: Number(value.toFixed(2)),
      intensity: value === 0 ? 0 : Math.min(1, value / max),
      dayLabel: new Date(isoDay).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  if (rows.length === 0) {
    const isoToday = toIsoDay(new Date());
    rows.push({ day: isoToday, value: 0, intensity: 0, dayLabel: isoToday });
  }

  return rows;
}

function getSeriesColor(seriesColors: Record<string, string> | undefined, key: string, index: number): string {
  return seriesColors?.[key] ?? CHART_COLORS[index % CHART_COLORS.length];
}

interface DonutDatum {
  name: string;
  value: number;
}

interface HeatmapDatum {
  day: string;
  dayLabel: string;
  value: number;
  intensity: number;
}

interface HeatmapCell {
  day: string;
  dayNumber: string;
  value: number;
  intensity: number;
  inRange: boolean;
}

function monthLabelFromKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, (month || 1) - 1, 1).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
}

function DonutWithAdaptiveLegend({
  data,
  widget,
  config,
}: {
  data: DonutDatum[];
  widget: AnalysisWidget;
  config: DonutWidgetConfig;
}) {
  const [legendOpen, setLegendOpen] = useState(false);
  const total = Math.max(1, data.reduce((sum, row) => sum + row.value, 0));

  const isLarge = widget.size === "lg";
  const isPreview = widget.id === "preview";
  // Use right-side recharts legend only for lg non-preview with few items
  const useSideLegend = isLarge && !isPreview && data.length <= 6;
  // All other cases: hover legend button (never inline recharts Legend)
  const useHoverLegend = !useSideLegend;

  const donutInner = isLarge ? 50 : widget.size === "md" ? 38 : 28;
  const donutOuter = isLarge ? 100 : widget.size === "md" ? 68 : 50;
  const chartHeight = isLarge ? 420 : 170;

  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <PieChart
          margin={useSideLegend
            ? { top: 8, right: 140, left: 8, bottom: 8 }
            : { top: 8, right: 8, left: 8, bottom: 8 }}
        >
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={donutInner}
            outerRadius={donutOuter}
            isAnimationActive={false}
            label={useSideLegend && data.length <= 5 ? ({ percent }) => (percent && percent > 0.08 ? `${(percent * 100).toFixed(0)}%` : "") : undefined}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`${entry.name}-${index}`} fill={getSeriesColor(config.seriesColors, entry.name, index)} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => {
              const numericValue = Number(value ?? 0);
              const percent = total <= 0 ? 0 : (numericValue / total) * 100;
              const valueText = formatTooltipByMode(numericValue, config.valueMode);
              return `${valueText} (${percent.toFixed(1)}%)`;
            }}
          />
          {useSideLegend && (
            <Legend
              layout="vertical"
              verticalAlign="middle"
              align="right"
              wrapperStyle={{ fontSize: 12 }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>

      {useHoverLegend && (
        <div className="group absolute right-2 top-2 z-20">
          <button
            type="button"
            className="cursor-pointer rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm"
            onClick={() => setLegendOpen((prev) => !prev)}
            aria-expanded={legendOpen}
            aria-label="Mostrar leyenda"
          >
            Leyenda
          </button>
          <div
            className={`absolute right-0 mt-1 max-h-44 min-w-[180px] overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-lg transition ${
              legendOpen ? "visible opacity-100" : "invisible opacity-0 group-hover:visible group-hover:opacity-100"
            }`}
          >
            {data.map((entry, idx) => {
              const color = getSeriesColor(config.seriesColors, entry.name, idx);
              const pct = ((entry.value / total) * 100).toFixed(1);
              return (
                <div key={entry.name} className="mb-1 flex items-center justify-between gap-2 last:mb-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="truncate text-slate-700">{entry.name}</span>
                  </div>
                  <span className="font-semibold text-slate-500">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

function HeatmapNavigator({ data }: { data: HeatmapDatum[] }) {
  const months = useMemo(
    () => Array.from(new Set(data.map((row) => row.day.slice(0, 7)))).sort((a, b) => a.localeCompare(b)),
    [data],
  );
  const years = useMemo(
    () => Array.from(new Set(months.map((month) => month.slice(0, 4)))).sort((a, b) => a.localeCompare(b)),
    [months],
  );
  const [selectedYear, setSelectedYear] = useState(years[years.length - 1] ?? "");
  const monthsInYear = useMemo(
    () => months.filter((month) => month.startsWith(selectedYear)),
    [months, selectedYear],
  );

  const [selectedMonth, setSelectedMonth] = useState(months[months.length - 1] ?? "");
  const currentMonth = monthsInYear.includes(selectedMonth)
    ? selectedMonth
    : (monthsInYear[monthsInYear.length - 1] ?? months[months.length - 1] ?? "");

  const { cells, firstWeekday } = useMemo(() => {
    if (!currentMonth) return { cells: [] as HeatmapCell[], firstWeekday: 0 };
    const [yearStr, monthStr] = currentMonth.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Spanish convention: week starts on Monday (Mon=0, Sun=6)
    const rawDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const firstWeekday = rawDay === 0 ? 6 : rawDay - 1;

    const byDay = new Map<string, HeatmapDatum>(data.map((row) => [row.day, row]));
    const minDay = data[0]?.day ?? "";
    const maxDay = data[data.length - 1]?.day ?? "";

    const cells: HeatmapCell[] = [];
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dayIso = `${currentMonth}-${String(day).padStart(2, "0")}`;
      const row = byDay.get(dayIso);
      const inRange = minDay !== "" && maxDay !== "" && dayIso >= minDay && dayIso <= maxDay;
      cells.push({
        day: dayIso,
        dayNumber: String(day),
        value: row?.value ?? 0,
        intensity: row?.intensity ?? 0,
        inRange,
      });
    }
    return { cells, firstWeekday };
  }, [data, currentMonth]);

  const monthIndex = Math.max(0, monthsInYear.indexOf(currentMonth));

  useEffect(() => {
    if (selectedMonth.startsWith(selectedYear)) return;
    if (monthsInYear.length > 0) {
      setSelectedMonth(monthsInYear[monthsInYear.length - 1]);
    }
  }, [selectedYear, selectedMonth, monthsInYear]);

  const monthLabel = currentMonth ? monthLabelFromKey(currentMonth) : "";

  return (
    <div className="space-y-2">
      {/* Navigation header */}
      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <button
          type="button"
          className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          onClick={() => setSelectedMonth(monthsInYear[Math.max(0, monthIndex - 1)] ?? currentMonth)}
          disabled={monthIndex <= 0}
        >
          ‹
        </button>

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-sm font-semibold capitalize text-slate-700">{monthLabel}</span>
          {years.length > 1 && (
            <select
              className="h-5 border-0 bg-transparent text-[10px] text-slate-400 focus:outline-none"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          )}
        </div>

        <button
          type="button"
          className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          onClick={() => setSelectedMonth(monthsInYear[Math.min(monthsInYear.length - 1, monthIndex + 1)] ?? currentMonth)}
          disabled={monthIndex >= monthsInYear.length - 1}
        >
          ›
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Weekday headers */}
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </div>
        ))}

        {/* Empty offset cells for first week */}
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Day cells */}
        {cells.map((item) => {
          const bg =
            !item.inRange
              ? "bg-slate-100 border-slate-200 text-slate-300"
              : item.intensity === 0
                ? "bg-slate-50 border-slate-200 text-slate-600"
                : item.intensity < 0.3
                  ? "bg-cyan-100 border-cyan-200 text-cyan-800"
                  : item.intensity < 0.6
                    ? "bg-cyan-300 border-cyan-400 text-cyan-900"
                    : "bg-cyan-600 border-cyan-700 text-white";

          const amountLabel = item.inRange && item.value > 0
            ? new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 0 }).format(item.value)
            : "";

          return (
            <div
              key={item.day}
              className={`aspect-square rounded-md border p-0.5 text-center flex flex-col items-center justify-center overflow-hidden ${bg}`}
              title={`${item.day}: ${item.inRange ? toMoney(item.value) : "Fuera de rango"}`}
            >
              <span className="text-[10px] font-semibold leading-none">{item.dayNumber}</span>
              {amountLabel && (
                <span className="mt-0.5 text-[8px] leading-none opacity-80">{amountLabel}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function comparePeriods(
  transactions: AnalysisTransaction[],
  compare: "weekVsPrevious" | "monthVsPrevious" | "quarterVsPrevious" | "yearVsPrevious",
) {
  const now = new Date();
  const currentStart = new Date(now);
  const previousStart = new Date(now);
  const previousEnd = new Date(now);

  if (compare === "weekVsPrevious") {
    currentStart.setDate(now.getDate() - 6);
    previousEnd.setDate(currentStart.getDate() - 1);
    previousStart.setDate(previousEnd.getDate() - 6);
  } else if (compare === "monthVsPrevious") {
    currentStart.setMonth(now.getMonth(), 1);
    previousStart.setMonth(now.getMonth() - 1, 1);
    previousEnd.setMonth(now.getMonth(), 0);
  } else if (compare === "quarterVsPrevious") {
    currentStart.setMonth(now.getMonth() - 2, 1);
    previousStart.setMonth(now.getMonth() - 5, 1);
    previousEnd.setMonth(now.getMonth() - 2, 0);
  } else {
    currentStart.setMonth(0, 1);
    previousStart.setFullYear(now.getFullYear() - 1, 0, 1);
    previousEnd.setFullYear(now.getFullYear() - 1, 11, 31);
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
      const config = widget.config as TableWidgetConfig;

      const preview = toRecord(previewData);
      if (config.valueMode === "amount" && preview && Array.isArray(preview.rows)) {
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
                <th className="px-3 py-2 text-right">{config.valueMode === "count" ? "Transacciones" : "Importe"}</th>
              </tr>
            </thead>
            <tbody>
              {limitedRows.map((row) => (
                <tr key={row.name} className="border-t border-slate-100">
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2 text-right font-medium">
                    {config.valueMode === "count" ? row.count : toMoney(row.amount)}
                  </td>
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
      const config = widget.config as BarWidgetConfig;

      const preview = toChartPreview(previewData);
      if (config.valueMode === "amount" && preview) {
        const dataset = preview.datasets[0];
        const data = zipSeries(preview.labels, dataset.data, "value");
        return (
          <ResponsiveContainer width="100%" height={chartH(widget.size)}>
            <BarChart data={data}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatTooltipByMode(value as number, config.valueMode)} />
              <Bar dataKey="value" radius={6} isAnimationActive={false}>
                {data.map((entry, idx) => (
                  <Cell key={`${entry.name}-${idx}`} fill={getSeriesColor(config.seriesColors, String(entry.name), idx)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      }

      const filtered = applyCommonFilters(transactions, widget.config);
      const grouped =
        config.mode === "expensesByCategory"
          ? groupByCategory(filtered, config.transactionType)
          : monthlyIncomeExpense(filtered).map((row) => ({
              name: row.month,
              amount: row.income,
              count: row.incomeCount,
            }));

      const data = grouped.map((row) => ({
        name: row.name,
        value: config.valueMode === "count" ? row.count : row.amount,
      }));

      return (
        <ResponsiveContainer width="100%" height={chartH(widget.size)}>
          <BarChart data={data}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => formatTooltipByMode(value as number, config.valueMode)} />
            <Bar dataKey="value" radius={6} isAnimationActive={false}>
              {data.map((entry, idx) => (
                <Cell key={`${entry.name}-${idx}`} fill={getSeriesColor(config.seriesColors, String(entry.name), idx)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    },
  },
  line: {
    label: "Linea",
    render: ({ widget, transactions, previewData }) => {
      const config = widget.config as LineWidgetConfig;

      const preview = toChartPreview(previewData);
      if (config.valueMode === "amount" && preview) {
        const data = preview.labels.map((label, idx) => {
          const row: Record<string, string | number> = { month: label };
          preview.datasets.forEach((dataset) => {
            row[dataset.label] = Number(dataset.data[idx] ?? 0);
          });
          return row;
        });

        if (preview.datasets.length === 1) {
          return (
            <ResponsiveContainer width="100%" height={chartH(widget.size)}>
              <AreaChart data={data}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatTooltipByMode(value as number, config.valueMode)} />
                <Area type="monotone" dataKey={preview.datasets[0].label} stroke="#0284c7" fill="#bae6fd" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          );
        }

        return (
          <ResponsiveContainer width="100%" height={chartH(widget.size)}>
            <LineChart data={data}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatTooltipByMode(value as number, config.valueMode)} />
              {preview.datasets.map((dataset, idx) => (
                <Line
                  key={dataset.label}
                  type="monotone"
                  dataKey={dataset.label}
                  stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                  strokeWidth={2}
                    isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      }

      const filtered = applyCommonFilters(transactions, widget.config);
      const monthlyBase = monthlyIncomeExpense(filtered);
      const monthly = monthlyBase.map((row) => ({
        month: row.month,
        income: config.valueMode === "count" ? row.incomeCount : row.income,
        expense: config.valueMode === "count" ? row.expenseCount : row.expense,
        balance: config.valueMode === "count" ? row.balanceCount : row.balance,
      }));

      return (
        <ResponsiveContainer width="100%" height={chartH(widget.size)}>
          {config.mode === "balanceTrend" ? (
            <AreaChart data={monthly}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatTooltipByMode(value as number, config.valueMode)} />
              <Area type="monotone" dataKey="balance" stroke="#0284c7" fill="#bae6fd" isAnimationActive={false} />
            </AreaChart>
          ) : (
            <LineChart data={monthly}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatTooltipByMode(value as number, config.valueMode)} />
              <Line type="monotone" dataKey="income" stroke="#0f766e" strokeWidth={2} isAnimationActive={false} />
              <Line type="monotone" dataKey="expense" stroke="#dc2626" strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      );
    },
  },
  donut: {
    label: "Donut",
    render: ({ widget, transactions, previewData }) => {
      const config = widget.config as DonutWidgetConfig;

      const preview = toChartPreview(previewData);
      if (config.valueMode === "amount" && preview) {
        const dataset = preview.datasets[0];
        const data = preview.labels.map((label, idx) => ({
          name: label,
          value: Number(dataset.data[idx] ?? 0),
        }));
        return <DonutWithAdaptiveLegend data={data} widget={widget} config={config} />;
      }

      const filtered = applyCommonFilters(transactions, widget.config);
      const data =
        config.mode === "expensesByCategory"
          ? groupByCategory(filtered, config.transactionType)
          : groupByAccount(filtered, config.transactionType);

      const normalizedData = data.map((entry) => ({
        name: entry.name,
        value: config.valueMode === "count" ? entry.count : entry.amount,
      }));
      return <DonutWithAdaptiveLegend data={normalizedData} widget={widget} config={config} />;
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
          <ResponsiveContainer width="100%" height={chartH(widget.size)}>
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
      const cfg = widget.config as StackedBarWidgetConfig;
      const stack = cfg.stackBy === "account"
        ? stackByAccountAndMonth(filtered)
        : stackedByAccountAndMonth(filtered);

      return (
        <ResponsiveContainer width="100%" height={chartH(widget.size)}>
          <BarChart data={stack.rows}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={formatTooltipValue} />
            {cfg.stackBy === "account"
              ? stack.accounts.map((account, idx) => (
                  <Bar
                    key={account}
                    dataKey={account}
                    stackId="account"
                    fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    isAnimationActive={false}
                  />
                ))
              : (
                <>
                  {stack.accounts.map((account) => (
                    <Bar key={`${account}-in`} dataKey={`${account} ingreso`} stackId="income" fill="#0f766e" isAnimationActive={false} />
                  ))}
                  {stack.accounts.map((account) => (
                    <Bar key={`${account}-out`} dataKey={`${account} gasto`} stackId="expense" fill="#dc2626" isAnimationActive={false} />
                  ))}
                </>
              )}
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
          <div className="grid grid-cols-7 gap-1">
            {data.map((item) => {
              const bg =
                item.intensity === 0
                  ? "bg-slate-50 border-slate-200 text-slate-600"
                  : item.intensity < 0.3
                    ? "bg-cyan-100 border-cyan-200 text-cyan-800"
                    : item.intensity < 0.6
                      ? "bg-cyan-300 border-cyan-400 text-cyan-900"
                      : "bg-cyan-600 border-cyan-700 text-white";

              const amountLabel = item.value > 0
                ? new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 0 }).format(item.value)
                : "";

              return (
                <div
                  key={item.label}
                  className={`aspect-square rounded-md border flex flex-col items-center justify-center overflow-hidden p-0.5 text-center ${bg}`}
                  title={`${item.label}: ${toMoney(item.value)}`}
                >
                  <div className="text-[10px] font-semibold leading-none truncate w-full text-center">{item.label}</div>
                  {amountLabel && (
                    <div className="mt-0.5 text-[8px] leading-none opacity-80">{amountLabel}</div>
                  )}
                </div>
              );
            })}
          </div>
        );
      }

      const filtered = applyCommonFilters(transactions, widget.config);
      const data = heatmapDailyExpenses(filtered);

      return <HeatmapNavigator data={data} />;
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
          <ResponsiveContainer width="100%" height={chartH(widget.size)}>
            <BarChart data={data}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={formatTooltipValue} />
              {preview.datasets.map((dataset, idx) => (
                <Bar key={dataset.label} dataKey={dataset.label} fill={CHART_COLORS[idx % CHART_COLORS.length]} radius={6} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      }

      const filtered = applyCommonFilters(transactions, widget.config);
      const config = widget.config as ComparisonWidgetConfig;
      const data = comparePeriods(filtered, config.compare);

      return (
        <ResponsiveContainer width="100%" height={chartH(widget.size)}>
          <BarChart data={data}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip formatter={formatTooltipValue} />
            <Bar dataKey="income" fill="#0f766e" radius={6} isAnimationActive={false} />
            <Bar dataKey="expense" fill="#dc2626" radius={6} isAnimationActive={false} />
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
