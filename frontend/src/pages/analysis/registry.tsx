import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import i18n from "@/i18n";

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
  return new Intl.NumberFormat(i18n.resolvedLanguage, {
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
  return mode === "count"
    ? i18n.t("analysis.registry.transactionsCount", { count: Math.round(value) })
    : toMoney(value);
}

function tA(key: string, options?: Record<string, unknown>): string {
  return i18n.t(`analysis.registry.${key}`, options);
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
        label: typeof row.label === "string" ? row.label : tA("series"),
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
  return d.toLocaleDateString(i18n.resolvedLanguage, { month: "short" });
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

function monthlyByDimension(
  transactions: AnalysisTransaction[],
  dimension: "account" | "category",
  valueMode: "amount" | "count",
  selectedKeys?: string[],
) {
  const monthRows = new Map<string, Record<string, string | number>>();
  const allKeys = new Set<string>();
  const selected = selectedKeys && selectedKeys.length > 0 ? new Set(selectedKeys) : null;

  for (const tx of transactions) {
    const monthKey = tx.date.slice(0, 7);
    const monthLabel = getMonthLabel(tx.date);
    const seriesKey =
      dimension === "account"
        ? tx.accountName
        : (tx.categoryName || tA("uncategorized"));
    if (selected && !selected.has(seriesKey)) continue;

    allKeys.add(seriesKey);
    const row = monthRows.get(monthKey) ?? { month: monthLabel };
    const current = Number(row[seriesKey] ?? 0);
    const nextValue = current + (valueMode === "count" ? 1 : tx.amount);
    row[seriesKey] = Number(nextValue.toFixed(2));
    monthRows.set(monthKey, row);
  }

  const keys = Array.from(allKeys).sort((a, b) => a.localeCompare(b));
  const rows = Array.from(monthRows.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, row]) => {
      const completed = { ...row };
      for (const key of keys) {
        if (typeof completed[key] !== "number") completed[key] = 0;
      }
      return completed;
    });

  return { rows, keys };
}

function stackedByMode(
  transactions: AnalysisTransaction[],
  cfg: StackedBarWidgetConfig,
) {
  if (cfg.stackBy === "type") {
    const monthly = monthlyIncomeExpense(transactions).map((row) => ({
      month: row.month,
      income: cfg.valueMode === "count" ? row.incomeCount : row.income,
      expense: cfg.valueMode === "count" ? row.expenseCount : row.expense,
    }));
    return { rows: monthly, keys: ["income", "expense"] };
  }

  if (cfg.stackBy === "account") {
    return monthlyByDimension(transactions, "account", cfg.valueMode, cfg.seriesKeys);
  }

  return monthlyByDimension(transactions, "category", cfg.valueMode, cfg.seriesKeys);
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
      dayLabel: new Date(isoDay).toLocaleDateString(i18n.resolvedLanguage, { day: "2-digit", month: "short" }),
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

const chartTooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(148, 163, 184, 0.35)",
  background: "rgba(255, 255, 255, 0.74)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
  padding: "8px 10px",
  fontSize: 12,
};

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
  return new Date(year, (month || 1) - 1, 1).toLocaleDateString(i18n.resolvedLanguage, {
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const total = Math.max(1, data.reduce((sum, row) => sum + row.value, 0));
  const average = data.length > 0 ? total / data.length : 0;

  const isLarge = widget.size === "lg";
  const isMedium = widget.size === "md";

  const chartHeight = isLarge ? 320 : isMedium ? 220 : 170;
  const minPctLabel = isLarge ? 0.06 : isMedium ? 0.1 : 0.14;
  const innerRadius = widget.size === "lg" ? "47%" : widget.size === "md" ? "42%" : "36%";
  const outerRadius = widget.size === "lg" ? "79%" : widget.size === "md" ? "74%" : "68%";
  const activeItem = activeIndex !== null ? data[activeIndex] : null;
  const activeValue = activeItem?.value ?? total;
  const deltaVsAverage = average > 0 ? ((activeValue - average) / average) * 100 : 0;
  const deltaPositive = deltaVsAverage >= 0;

  const chartNode = (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            isAnimationActive
            animationDuration={420}
            animationEasing="ease-out"
            label={({ percent }) => (percent && percent >= minPctLabel ? `${(percent * 100).toFixed(0)}%` : "")}
            labelLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
            onMouseLeave={() => setActiveIndex(null)}
            onMouseEnter={(_, index) => setActiveIndex(index)}
          >
            {data.map((entry, index) => {
              const isActive = activeIndex === null ? true : index === activeIndex;
              return (
                <Cell
                  key={`${entry.name}-${index}`}
                  fill={getSeriesColor(config.seriesColors, entry.name, index)}
                  fillOpacity={isActive ? 1 : 0.42}
                />
              );
            })}
          </Pie>
          <Tooltip
            formatter={(value) => {
              const numericValue = Number(value ?? 0);
              const percent = total <= 0 ? 0 : (numericValue / total) * 100;
              const valueText = formatTooltipByMode(numericValue, config.valueMode);
              return `${valueText} (${percent.toFixed(1)}%)`;
            }}
            contentStyle={chartTooltipStyle}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="h-full w-full">
      {chartNode}

      {activeItem && (
        <div className={`mt-1 flex ${isMedium ? "justify-start" : "justify-center"}`}>
          <div className="rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 text-center shadow-sm backdrop-blur transition-all duration-200 ease-out">
            <p className="text-[11px] font-medium text-slate-500">{activeItem.name}</p>
            <p className="text-sm font-semibold text-slate-800">
              {formatTooltipByMode(activeValue, config.valueMode)}
            </p>
            <p className="text-[11px] text-slate-500">{((activeItem.value / total) * 100).toFixed(1)}%</p>
            {data.length > 1 && (
              <p className={`text-[11px] font-medium ${deltaPositive ? "text-emerald-600" : "text-rose-600"}`}>
                {deltaPositive ? "+" : ""}{deltaVsAverage.toFixed(1)}% vs media
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const WEEKDAY_LABELS = [
  tA("weekdays.mon"),
  tA("weekdays.tue"),
  tA("weekdays.wed"),
  tA("weekdays.thu"),
  tA("weekdays.fri"),
  tA("weekdays.sat"),
  tA("weekdays.sun"),
];

function HeatmapNavigator({ data, size }: { data: HeatmapDatum[]; size: AnalysisWidget["size"] }) {
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
  const isLarge = size === "lg";
  const isMedium = size === "md";
  const cellHeightClass = isLarge ? "h-14" : isMedium ? "h-10" : "h-8";
  const showAmountLabel = isLarge;

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
            ? new Intl.NumberFormat(i18n.resolvedLanguage, { notation: "compact", maximumFractionDigits: 0 }).format(item.value)
            : "";

          return (
            <div
              key={item.day}
              className={`${cellHeightClass} rounded-md border p-0.5 text-center flex flex-col items-center justify-center overflow-hidden ${bg}`}
              title={`${item.day}: ${item.inRange ? toMoney(item.value) : tA("outOfRange")}`}
            >
              <span className="text-[10px] font-semibold leading-none">{item.dayNumber}</span>
              {showAmountLabel && amountLabel && (
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
    { period: tA("period.current"), income: currentIncome, expense: currentExpense },
    { period: tA("period.previous"), income: previousIncome, expense: previousExpense },
  ];
}

const widgetRegistry: Record<WidgetType, WidgetRendererDefinition> = {
  kpi: {
    label: "analysis.widgetTypes.kpi.label",
    render: ({ widget, transactions, previewData }) => {
      const preview = toRecord(previewData);
      if (preview && typeof preview.value === "number") {
        const kpiType = typeof preview.kpiType === "string" ? preview.kpiType : "KPI";
        const kpiTypeLabel = kpiType === "TOTAL_INCOME"
          ? tA("kpiType.income")
          : kpiType === "TOTAL_EXPENSE"
            ? tA("kpiType.expense")
            : kpiType === "NET_BALANCE"
              ? tA("kpiType.balance")
              : kpiType === "SAVINGS_RATE"
                ? tA("kpiType.savingsRate")
                : kpiType;
        const isPercent = kpiType === "SAVINGS_RATE";
        const safeValue = Number(preview.value);
        return (
          <div className="h-full rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">{kpiTypeLabel}</p>
            <p className="mt-2 text-4xl font-semibold text-slate-800">
              {isPercent ? `${safeValue.toFixed(1)}%` : toMoney(safeValue)}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              {tA("basedOnTransactions", { count: Number(preview.transactionCount ?? 0) })}
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
        income: { label: tA("kpiType.income"), value: income },
        expense: { label: tA("kpiType.expense"), value: expense },
        balance: { label: tA("kpiType.balance"), value: income - expense },
        savingsRate: {
          label: tA("kpiType.savingsRate"),
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
          <p className="mt-3 text-xs text-slate-500">{tA("basedOnTransactions", { count: filtered.length })}</p>
        </div>
      );
    },
  },
  table: {
    label: "analysis.widgetTypes.table.label",
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
                  <th className="px-3 py-2">{tA("table.name")}</th>
                  <th className="px-3 py-2 text-right">{tA("table.amount")}</th>
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
                <th className="px-3 py-2">{config.groupBy === "category" ? tA("table.category") : tA("table.account")}</th>
                <th className="px-3 py-2 text-right">{config.valueMode === "count" ? tA("table.transactions") : tA("table.amount")}</th>
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
    label: "analysis.widgetTypes.bar.label",
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
              <Tooltip formatter={(value) => formatTooltipByMode(value as number, config.valueMode)} contentStyle={chartTooltipStyle} />
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
            <Tooltip formatter={(value) => formatTooltipByMode(value as number, config.valueMode)} contentStyle={chartTooltipStyle} />
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
    label: "analysis.widgetTypes.line.label",
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
              {config.visualization === "area" ? (
              <AreaChart data={data}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatTooltipByMode(value as number, config.valueMode)} contentStyle={chartTooltipStyle} />
                <Area
                  type="monotone"
                  dataKey={preview.datasets[0].label}
                  stroke={getSeriesColor(config.seriesColors, preview.datasets[0].label, 0)}
                  fill={getSeriesColor(config.seriesColors, preview.datasets[0].label, 0)}
                  fillOpacity={0.2}
                  isAnimationActive={false}
                />
              </AreaChart>
              ) : (
              <LineChart data={data}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatTooltipByMode(value as number, config.valueMode)} contentStyle={chartTooltipStyle} />
                <Line
                  type="monotone"
                  dataKey={preview.datasets[0].label}
                  stroke={getSeriesColor(config.seriesColors, preview.datasets[0].label, 0)}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </LineChart>
              )}
            </ResponsiveContainer>
          );
        }

        return (
          <ResponsiveContainer width="100%" height={chartH(widget.size)}>
            {config.visualization === "area" ? (
            <AreaChart data={data}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatTooltipByMode(value as number, config.valueMode)} contentStyle={chartTooltipStyle} />
              {preview.datasets.map((dataset, idx) => (
                <Area
                  key={dataset.label}
                  type="monotone"
                  dataKey={dataset.label}
                  stroke={getSeriesColor(config.seriesColors, dataset.label, idx)}
                  fill={getSeriesColor(config.seriesColors, dataset.label, idx)}
                  fillOpacity={0.2}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
            ) : (
            <LineChart data={data}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatTooltipByMode(value as number, config.valueMode)} contentStyle={chartTooltipStyle} />
              {preview.datasets.map((dataset, idx) => (
                <Line
                  key={dataset.label}
                  type="monotone"
                  dataKey={dataset.label}
                  stroke={getSeriesColor(config.seriesColors, dataset.label, idx)}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
            )}
          </ResponsiveContainer>
        );
      }

      const filtered = applyCommonFilters(transactions, widget.config);
      const monthlyBase = monthlyIncomeExpense(filtered);

      let data: Array<Record<string, string | number>> = [];
      let seriesKeys: string[] = [];

      if (config.mode === "balanceTrend") {
        data = monthlyBase.map((row) => ({
          month: row.month,
          balance: config.valueMode === "count" ? row.balanceCount : row.balance,
        }));
        seriesKeys = ["balance"];
      } else if (config.mode === "incomeVsExpense") {
        data = monthlyBase.map((row) => ({
          month: row.month,
          income: config.valueMode === "count" ? row.incomeCount : row.income,
          expense: config.valueMode === "count" ? row.expenseCount : row.expense,
        }));
        seriesKeys = ["income", "expense"];
      } else if (config.mode === "byAccount") {
        const grouped = monthlyByDimension(filtered, "account", config.valueMode, config.seriesKeys);
        data = grouped.rows;
        seriesKeys = grouped.keys;
      } else {
        const grouped = monthlyByDimension(filtered, "category", config.valueMode, config.seriesKeys);
        data = grouped.rows;
        seriesKeys = grouped.keys;
      }

      const renderSeries = (asArea: boolean) =>
        seriesKeys.map((seriesKey, idx) =>
          asArea ? (
            <Area
              key={seriesKey}
              type="monotone"
              dataKey={seriesKey}
              stroke={getSeriesColor(config.seriesColors, seriesKey, idx)}
              fill={getSeriesColor(config.seriesColors, seriesKey, idx)}
              fillOpacity={0.2}
              isAnimationActive={false}
            />
          ) : (
            <Line
              key={seriesKey}
              type="monotone"
              dataKey={seriesKey}
              stroke={getSeriesColor(config.seriesColors, seriesKey, idx)}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ),
        );

      return (
        <ResponsiveContainer width="100%" height={chartH(widget.size)}>
          {config.visualization === "area" ? (
            <AreaChart data={data}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatTooltipByMode(value as number, config.valueMode)} contentStyle={chartTooltipStyle} />
              {renderSeries(true)}
            </AreaChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatTooltipByMode(value as number, config.valueMode)} contentStyle={chartTooltipStyle} />
              {renderSeries(false)}
            </LineChart>
          )}
        </ResponsiveContainer>
      );
    },
  },
  donut: {
    label: "analysis.widgetTypes.donut.label",
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
    label: "analysis.widgetTypes.stackedBar.label",
    render: ({ widget, transactions, previewData }) => {
      const cfg = widget.config as StackedBarWidgetConfig;
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
              <Tooltip formatter={(value) => formatTooltipByMode(value as number, cfg.valueMode)} contentStyle={chartTooltipStyle} />
              {preview.datasets.map((dataset, idx) => (
                <Bar
                  key={dataset.label}
                  dataKey={dataset.label}
                  stackId="stack"
                  fill={getSeriesColor(cfg.seriesColors, dataset.label, idx)}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      }

      const filtered = applyCommonFilters(transactions, widget.config);
      const stack = stackedByMode(filtered, cfg);

      return (
        <ResponsiveContainer width="100%" height={chartH(widget.size)}>
          <BarChart data={stack.rows}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => formatTooltipByMode(value as number, cfg.valueMode)} contentStyle={chartTooltipStyle} />
            {stack.keys.map((seriesKey, idx) => (
              <Bar
                key={seriesKey}
                dataKey={seriesKey}
                stackId="stack"
                fill={getSeriesColor(cfg.seriesColors, seriesKey, idx)}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    },
  },
  heatmap: {
    label: "analysis.widgetTypes.heatmap.label",
    render: ({ widget, transactions, previewData }) => {
      const preview = toChartPreview(previewData);
      if (preview) {
        const values = preview.datasets[0]?.data ?? [];
        const max = Math.max(1, ...values);
        const normalized = preview.labels
          .map((label, idx) => {
            const maybeDate = new Date(label);
            const isIso = /^\d{4}-\d{2}-\d{2}$/.test(label);
            const day = isIso
              ? label
              : Number.isNaN(maybeDate.getTime())
                ? toIsoDay(new Date())
                : toIsoDay(maybeDate);
            return {
              day,
              dayLabel: day,
              value: Number(values[idx] ?? 0),
              intensity: Number(values[idx] ?? 0) === 0 ? 0 : Math.min(1, Number(values[idx] ?? 0) / max),
            };
          })
          .sort((a, b) => a.day.localeCompare(b.day));

        return (
          <div className="w-full max-w-full overflow-hidden">
            <HeatmapNavigator data={normalized} size={widget.size} />
          </div>
        );
      }

      const filtered = applyCommonFilters(transactions, widget.config);
      const data = heatmapDailyExpenses(filtered);

      return (
        <div className="w-full max-w-full overflow-hidden">
            <HeatmapNavigator data={data} size={widget.size} />
        </div>
      );
    },
  },
  comparison: {
    label: "analysis.widgetTypes.comparison.label",
    render: ({ widget, transactions, previewData }) => {
      const cfg = widget.config as ComparisonWidgetConfig;
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
              <Tooltip formatter={formatTooltipValue} contentStyle={chartTooltipStyle} />
              {preview.datasets.map((dataset, idx) => (
                <Bar
                  key={dataset.label}
                  dataKey={dataset.label}
                  fill={getSeriesColor(cfg.seriesColors, dataset.label, idx)}
                  radius={6}
                  isAnimationActive={false}
                />
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
            <Tooltip formatter={formatTooltipValue} contentStyle={chartTooltipStyle} />
            <Bar dataKey="income" fill={getSeriesColor(cfg.seriesColors, "income", 0)} radius={6} isAnimationActive={false} />
            <Bar dataKey="expense" fill={getSeriesColor(cfg.seriesColors, "expense", 1)} radius={6} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      );
    },
  },
};

export function getWidgetRenderer(type: WidgetType): WidgetRendererDefinition {
  const renderer = widgetRegistry[type];
  return {
    ...renderer,
    label: i18n.t(renderer.label),
  };
}

export function renderWidget(widget: AnalysisWidget, transactions: AnalysisTransaction[], previewData?: unknown): ReactNode {
  return widgetRegistry[widget.type].render({ widget, transactions, previewData });
}
