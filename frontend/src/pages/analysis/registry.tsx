import { useMemo, useState, type ReactNode } from "react";
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
  HeatmapWidgetConfig,
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

export const CHART_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#a855f7"];

export function getDefaultSeriesColor(key: string, allKeys: string[]): string {
  const idx = allKeys.indexOf(key);
  return CHART_COLORS[Math.max(0, idx) % CHART_COLORS.length];
}

function chartH(size: AnalysisWidget["size"]): number {
  if (size === "lg") return 400;
  return 168;
}

const axisTick = { fill: "#94a3b8", fontSize: 11 };
const axisProps = { axisLine: false as const, tickLine: false as const, tick: axisTick };
const gridProps = { vertical: false as const, strokeDasharray: "3 3", stroke: "#e2e8f0" };
const legendStyle = { fontSize: 11, paddingTop: 2 };

let _preferredCurrency = "EUR";

export function setChartCurrency(currency: string) {
  _preferredCurrency = currency || "EUR";
}

function toMoney(value: number, currency?: string): string {
  return new Intl.NumberFormat(i18n.resolvedLanguage, {
    style: "currency",
    currency: currency ?? _preferredCurrency,
    maximumFractionDigits: 0,
  }).format(value);
}

function toCompactMoney(value: number, currency?: string): string {
  try {
    return new Intl.NumberFormat(i18n.resolvedLanguage, {
      style: "currency",
      currency: currency ?? _preferredCurrency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return toMoney(value, currency);
  }
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

const DONUT_LEGEND_COLLAPSE_THRESHOLD = 6;

function DonutPercentLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}) {
  if (
    typeof cx !== "number"
    || typeof cy !== "number"
    || typeof midAngle !== "number"
    || typeof innerRadius !== "number"
    || typeof outerRadius !== "number"
    || typeof percent !== "number"
  ) {
    return null;
  }
  if (percent < 0.04) return null; // hide only very tiny slices
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={800} style={{ textShadow: "0 1px 3px rgba(0,0,0,0.55)" }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
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
  const isLarge = widget.size === "lg";
  const isMedium = widget.size === "md";
  const manyItems = data.length > DONUT_LEGEND_COLLAPSE_THRESHOLD;

  const pieContent = (innerR: string, outerR: string) => (
    <PieChart margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        innerRadius={innerR}
        outerRadius={outerR}
        isAnimationActive
        animationDuration={420}
        animationEasing="ease-out"
        onMouseLeave={() => setActiveIndex(null)}
        onMouseEnter={(_, index) => setActiveIndex(index)}
        label={DonutPercentLabel}
        labelLine={false}
      >
        {data.map((entry, index) => {
          const isActive = activeIndex === null ? true : index === activeIndex;
          return (
            <Cell
              key={`${entry.name}-${index}`}
              fill={getSeriesColor(config.seriesColors, entry.name, index)}
              fillOpacity={isActive ? 1 : 0.38}
            />
          );
        })}
      </Pie>
      <Tooltip
        formatter={(value) => {
          const numericValue = Number(value ?? 0);
          const percent = total <= 0 ? 0 : (numericValue / total) * 100;
          return `${formatTooltipByMode(numericValue, config.valueMode)} (${percent.toFixed(1)}%)`;
        }}
        contentStyle={chartTooltipStyle}
      />
    </PieChart>
  );

  const legendItem = (entry: DonutDatum, index: number) => {
    const pct = total <= 0 ? 0 : (entry.value / total) * 100;
    const isActive = activeIndex === null ? true : index === activeIndex;
    return (
      <div
        key={entry.name}
        className={`flex cursor-default items-center gap-1.5 rounded-md px-1 py-[3px] transition-all duration-150 ${isActive ? "opacity-100" : "opacity-35"}`}
        onMouseEnter={() => setActiveIndex(index)}
        onMouseLeave={() => setActiveIndex(null)}
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: getSeriesColor(config.seriesColors, entry.name, index) }}
        />
        <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600">{entry.name}</span>
        <span className="shrink-0 text-[11px] font-bold tabular-nums text-slate-700">{pct.toFixed(1)}%</span>
      </div>
    );
  };

  if (isLarge || isMedium) {
    return (
      <div className="flex h-full w-full flex-row items-stretch gap-3">
        <div className={`min-h-0 ${isLarge ? "w-[62%]" : "w-[58%]"}`}>
          <ResponsiveContainer width="100%" height="100%">
            {pieContent(isLarge ? "40%" : "36%", isLarge ? "86%" : "84%")}
          </ResponsiveContainer>
        </div>

        <div
          className={[
            "style-1 min-w-0 flex-1 overflow-y-auto rounded-md border border-slate-200 bg-slate-50/50 px-2 py-1",
            isLarge ? "max-h-[360px]" : "max-h-[230px]",
            manyItems ? "space-y-0.5" : "space-y-0",
          ].join(" ")}
        >
          <div className={isLarge ? "grid grid-cols-1 gap-y-0.5" : "grid grid-cols-1 gap-y-0.5"}>
            {data.map((entry, index) => legendItem(entry, index))}
          </div>
        </div>
      </div>
    );
  }

  // sm: donut left, legend right
  return (
    <div className="flex h-full w-full flex-row items-stretch gap-2">
      <div className={`h-full shrink-0 ${isMedium ? "w-[52%]" : "w-[50%]"}`}>
        <ResponsiveContainer width="100%" height="100%">
          {pieContent(isMedium ? "34%" : "32%", isMedium ? "80%" : "76%")}
        </ResponsiveContainer>
      </div>
      <div className="style-1 flex min-w-0 flex-1 flex-col justify-center gap-0.5 overflow-y-auto py-1">
        {data.map((entry, index) => legendItem(entry, index))}
      </div>
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

function HeatmapNavigator({ data, size, baseColor }: { data: HeatmapDatum[]; size: AnalysisWidget["size"]; baseColor?: string }) {
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
  const [selectedDay, setSelectedDay] = useState<string>("");
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

  const monthLabel = currentMonth ? monthLabelFromKey(currentMonth) : "";
  const isLarge = size === "lg";
  const isMedium = size === "md";
  const cellHeightClass = isLarge ? "h-12" : isMedium ? "h-8" : "h-[18px]";
  const gridGapClass = isLarge ? "gap-1.5" : isMedium ? "gap-1" : "gap-px";
  const navPaddingClass = isLarge ? "px-3 py-2" : "px-2 py-0.5";
  const monthTextClass = isLarge ? "text-sm" : "text-[10px]";
  const weekdayTextClass = isLarge ? "text-[10px]" : "text-[7px]";
  const dayTextClass = isLarge ? "text-xs" : isMedium ? "text-[10px]" : "text-[8px]";
  const selectedCell = cells.find((item) => item.day === selectedDay);
  const fallbackCell = [...cells].reverse().find((item) => item.inRange);
  const infoCell = selectedCell ?? fallbackCell;

  return (
    <div className="style-1 flex h-full w-full flex-col gap-1 overflow-y-auto pr-1">
      {/* Navigation header */}
      <div className={`flex shrink-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/80 ${navPaddingClass}`}>
        <button
          type="button"
          className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30"
          onClick={() => setSelectedMonth(monthsInYear[Math.max(0, monthIndex - 1)] ?? currentMonth)}
          disabled={monthIndex <= 0}
        >
          ‹
        </button>

        <div className="flex flex-col items-center gap-0">
          <span className={`${monthTextClass} font-semibold capitalize text-slate-700`}>{monthLabel}</span>
          {years.length > 1 && (
            <select
              className="h-4 border-0 bg-transparent text-[9px] text-slate-400 focus:outline-none"
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
          className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30"
          onClick={() => setSelectedMonth(monthsInYear[Math.min(monthsInYear.length - 1, monthIndex + 1)] ?? currentMonth)}
          disabled={monthIndex >= monthsInYear.length - 1}
        >
          ›
        </button>
      </div>

      {isLarge && infoCell && (
        <div className="shrink-0 rounded-md border border-slate-200 bg-white/90 px-2 py-1 text-[11px] text-slate-600">
          <span className="font-semibold text-slate-700">{infoCell.day}</span>
          <span className="mx-1.5 text-slate-300">|</span>
          <span className="font-semibold text-slate-800">
            {infoCell.inRange ? toMoney(infoCell.value) : tA("outOfRange")}
          </span>
        </div>
      )}

      {/* Calendar grid */}
      <div className={`grid min-h-0 flex-1 grid-cols-7 content-start pb-1 ${gridGapClass}`}>
        {/* Weekday headers */}
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className={`${weekdayTextClass} py-0 text-center font-semibold uppercase tracking-wide text-slate-400`}>
            {label}
          </div>
        ))}

        {/* Empty offset cells for first week */}
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Day cells */}
        {cells.map((item) => {
          const alpha = Math.round(item.intensity * 220);
          const bgStyle = baseColor && item.inRange && item.intensity > 0
            ? { backgroundColor: `${baseColor}${alpha.toString(16).padStart(2, "0")}`, borderColor: baseColor }
            : undefined;

          // Determine if the cell background is "light" so we use dark text
          const isLightCell = item.inRange && item.intensity > 0 && item.intensity < 0.5;

          const bgClass = !item.inRange
            ? "bg-slate-100 border-slate-100 text-slate-300"
            : item.intensity === 0
              ? "bg-white border-slate-200 text-slate-500"
              : baseColor
                ? `border ${isLightCell ? "text-slate-800" : "text-white"}`
                : item.intensity < 0.25
                  ? "bg-violet-100 border-violet-200 text-violet-800"
                  : item.intensity < 0.55
                    ? "bg-violet-300 border-violet-400 text-violet-900"
                    : item.intensity < 0.8
                      ? "bg-violet-500 border-violet-600 text-white"
                      : "bg-violet-800 border-violet-900 text-white";

          const compactAmount = item.inRange
            ? item.value > 0
              ? toCompactMoney(item.value)
              : "-"
            : "";
          const showAmount = (isLarge || isMedium) && item.inRange;
          const isSelected = selectedDay === item.day;

          return (
            <div
              key={item.day}
              role="button"
              tabIndex={item.inRange ? 0 : -1}
              className={`${cellHeightClass} flex flex-col items-center justify-center overflow-hidden rounded border p-0 text-center transition hover:opacity-85 ${isSelected ? "ring-2 ring-sky-400" : ""} ${item.inRange ? "cursor-pointer" : "cursor-default"} ${bgClass}`}
              style={bgStyle}
              title={`${item.day}: ${item.inRange ? toMoney(item.value) : tA("outOfRange")}`}
              onClick={() => {
                if (item.inRange) setSelectedDay(item.day);
              }}
              onKeyDown={(event) => {
                if (!item.inRange) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedDay(item.day);
                }
              }}
            >
              <span className={`${dayTextClass} font-semibold leading-none`}>{item.dayNumber}</span>
              {showAmount && (
                <span className={`mt-0.5 leading-none ${isLarge ? "text-[10px]" : "text-[9px]"} ${compactAmount === "-" ? "font-bold opacity-100" : "font-semibold opacity-90"}`}>
                  {compactAmount}
                </span>
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

function barGradDefs(colors: string[]) {
  return (
    <defs>
      {colors.map((color) => {
        const id = `bgrad-${color.replace(/[^a-f0-9]/gi, "")}`;
        return (
          <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.9} />
            <stop offset="100%" stopColor={color} stopOpacity={0.3} />
          </linearGradient>
        );
      })}
    </defs>
  );
}

function barFill(color: string, useGradient: boolean): string {
  if (!useGradient) return color;
  return `url(#bgrad-${color.replace(/[^a-f0-9]/gi, "")})`;
}

function areaGradDefs(colors: string[], blurFill: boolean) {
  return (
    <defs>
      {colors.map((color) => {
        const id = `ag-${color.replace(/[^a-f0-9]/gi, "")}`;
        return (
          <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={blurFill ? 0.72 : 0.25} />
            <stop offset="55%" stopColor={color} stopOpacity={blurFill ? 0.22 : 0.08} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        );
      })}
    </defs>
  );
}

function areaFill(color: string): string {
  return `url(#ag-${color.replace(/[^a-f0-9]/gi, "")})`;
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
        const useGradient = (config as BarWidgetConfig).gradientFill === true;
        const barColors = data.map((entry, idx) => getSeriesColor(config.seriesColors, String(entry.name), idx));
        return (
          <ResponsiveContainer width="100%" height={chartH(widget.size)}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
              {useGradient && barGradDefs(barColors)}
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip formatter={(value) => formatTooltipByMode(value as number, config.valueMode)} contentStyle={chartTooltipStyle} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
              <Bar dataKey="value" radius={[6, 6, 2, 2]} isAnimationActive={false}>
                {data.map((entry, idx) => (
                  <Cell key={`${entry.name}-${idx}`} fill={barFill(getSeriesColor(config.seriesColors, String(entry.name), idx), useGradient)} />
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
          : config.mode === "expensesByAccount"
            ? groupByAccount(filtered, config.transactionType)
            : monthlyIncomeExpense(filtered).map((row) => ({
                name: row.month,
                amount: row.income,
                count: row.incomeCount,
              }));

      const data = grouped.map((row) => ({
        name: row.name,
        value: config.valueMode === "count" ? row.count : row.amount,
      }));

      const useGradientLocal = (config as BarWidgetConfig).gradientFill === true;
      const barColorsLocal = data.map((entry, idx) => getSeriesColor(config.seriesColors, String(entry.name), idx));

      return (
        <ResponsiveContainer width="100%" height={chartH(widget.size)}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            {useGradientLocal && barGradDefs(barColorsLocal)}
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip formatter={(value) => formatTooltipByMode(value as number, config.valueMode)} contentStyle={chartTooltipStyle} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
            <Bar dataKey="value" radius={[6, 6, 2, 2]} isAnimationActive={false}>
              {data.map((entry, idx) => (
                <Cell key={`${entry.name}-${idx}`} fill={barFill(getSeriesColor(config.seriesColors, String(entry.name), idx), useGradientLocal)} />
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

        const multiSeries = preview.datasets.length > 1;

        if (!multiSeries) {
          const color = getSeriesColor(config.seriesColors, preview.datasets[0].label, 0);
          const neonGlow = config.neonGlow === true;
          const blurFill = config.blurFill === true;
          return (
            <div className="h-full w-full">
              <ResponsiveContainer width="100%" height={chartH(widget.size)}>
                {config.visualization === "area" ? (
                <AreaChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                  {areaGradDefs([color], blurFill)}
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="month" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip formatter={(value) => formatTooltipByMode(value as number, config.valueMode)} contentStyle={chartTooltipStyle} />
                  <Area type="monotone" dataKey={preview.datasets[0].label} stroke={color} strokeWidth={neonGlow ? 3 : 2} style={neonGlow ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined} fill={areaFill(color)} fillOpacity={1} isAnimationActive={false} dot={false} />
                </AreaChart>
                ) : (
                <LineChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="month" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip formatter={(value) => formatTooltipByMode(value as number, config.valueMode)} contentStyle={chartTooltipStyle} />
                  <Line type="monotone" dataKey={preview.datasets[0].label} stroke={color} strokeWidth={neonGlow ? 3 : 2.5} style={neonGlow ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined} dot={false} isAnimationActive={false} />
                </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          );
        }

        const neonGlowMulti = config.neonGlow === true;
        const blurFillMulti = config.blurFill === true;
        const multiColors = preview.datasets.map((dataset, idx) => getSeriesColor(config.seriesColors, dataset.label, idx));
        return (
          <div className="h-full w-full">
            <ResponsiveContainer width="100%" height={chartH(widget.size)}>
              {config.visualization === "area" ? (
              <AreaChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                {areaGradDefs(multiColors, blurFillMulti)}
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip formatter={(value) => formatTooltipByMode(value as number, config.valueMode)} contentStyle={chartTooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
                {preview.datasets.map((dataset, idx) => {
                  const c = multiColors[idx];
                  return <Area key={dataset.label} type="monotone" dataKey={dataset.label} stroke={c} fill={areaFill(c)} fillOpacity={1} strokeWidth={neonGlowMulti ? 3 : 2} style={neonGlowMulti ? { filter: `drop-shadow(0 0 6px ${c})` } : undefined} isAnimationActive={false} dot={false} />;
                })}
              </AreaChart>
              ) : (
              <LineChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip formatter={(value) => formatTooltipByMode(value as number, config.valueMode)} contentStyle={chartTooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
                {preview.datasets.map((dataset, idx) => {
                  const c = multiColors[idx];
                  return <Line key={dataset.label} type="monotone" dataKey={dataset.label} stroke={c} strokeWidth={neonGlowMulti ? 3 : 2.5} style={neonGlowMulti ? { filter: `drop-shadow(0 0 6px ${c})` } : undefined} isAnimationActive={false} dot={false} />;
                })}
              </LineChart>
              )}
            </ResponsiveContainer>
          </div>
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

      const multiSeries = seriesKeys.length > 1;
      const neonGlowLocal = config.neonGlow === true;
      const blurFillLocal = config.blurFill === true;
      const localColors = seriesKeys.map((key, idx) => getSeriesColor(config.seriesColors, key, idx));
      const renderSeries = (asArea: boolean) =>
        seriesKeys.map((seriesKey, idx) => {
          const color = localColors[idx];
          return asArea ? (
            <Area key={seriesKey} type="monotone" dataKey={seriesKey} stroke={color} fill={areaFill(color)} fillOpacity={1} strokeWidth={neonGlowLocal ? 3 : 2} style={neonGlowLocal ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined} isAnimationActive={false} dot={false} />
          ) : (
            <Line key={seriesKey} type="monotone" dataKey={seriesKey} stroke={color} strokeWidth={neonGlowLocal ? 3 : 2.5} style={neonGlowLocal ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined} isAnimationActive={false} dot={false} />
          );
        });

      return (
        <div className="h-full w-full">
          <ResponsiveContainer width="100%" height={chartH(widget.size)}>
            {config.visualization === "area" ? (
              <AreaChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                {areaGradDefs(localColors, blurFillLocal)}
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip formatter={(value) => formatTooltipByMode(value as number, config.valueMode)} contentStyle={chartTooltipStyle} />
                {multiSeries && <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />}
                {renderSeries(true)}
              </AreaChart>
            ) : (
              <LineChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip formatter={(value) => formatTooltipByMode(value as number, config.valueMode)} contentStyle={chartTooltipStyle} />
                {multiSeries && <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />}
                {renderSeries(false)}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
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

        const useGradientStacked = cfg.gradientFill === true;
        const stackedPreviewColors = preview.datasets.map((dataset, idx) => getSeriesColor(cfg.seriesColors, dataset.label, idx));

        return (
          <ResponsiveContainer width="100%" height={chartH(widget.size)}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
              {useGradientStacked && barGradDefs(stackedPreviewColors)}
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip formatter={(value) => formatTooltipByMode(value as number, cfg.valueMode)} contentStyle={chartTooltipStyle} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
              {preview.datasets.map((dataset, idx) => (
                <Bar key={dataset.label} dataKey={dataset.label} stackId="stack" fill={barFill(getSeriesColor(cfg.seriesColors, dataset.label, idx), useGradientStacked)} radius={idx === preview.datasets.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      }

      const filtered = applyCommonFilters(transactions, widget.config);
      const stack = stackedByMode(filtered, cfg);

      const useGradientStackedLocal = cfg.gradientFill === true;
      const stackedLocalColors = stack.keys.map((seriesKey, idx) => getSeriesColor(cfg.seriesColors, seriesKey, idx));

      return (
        <ResponsiveContainer width="100%" height={chartH(widget.size)}>
          <BarChart data={stack.rows} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            {useGradientStackedLocal && barGradDefs(stackedLocalColors)}
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip formatter={(value) => formatTooltipByMode(value as number, cfg.valueMode)} contentStyle={chartTooltipStyle} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
            {stack.keys.map((seriesKey, idx) => (
              <Bar key={seriesKey} dataKey={seriesKey} stackId="stack" fill={barFill(getSeriesColor(cfg.seriesColors, seriesKey, idx), useGradientStackedLocal)} radius={idx === stack.keys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} isAnimationActive={false} />
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

        const hmConfig = widget.config as HeatmapWidgetConfig;
        return (
          <div className="h-full w-full">
            <HeatmapNavigator data={normalized} size={widget.size} baseColor={hmConfig.baseColor} />
          </div>
        );
      }

      const filtered = applyCommonFilters(transactions, widget.config);
      const data = heatmapDailyExpenses(filtered);
      const hmCfg = widget.config as HeatmapWidgetConfig;

      return (
        <div className="h-full w-full">
          <HeatmapNavigator data={data} size={widget.size} baseColor={hmCfg.baseColor} />
        </div>
      );
    },
  },
  comparison: {
    label: "analysis.widgetTypes.comparison.label",
    render: ({ widget, transactions, previewData }) => {
      const cfg = widget.config as ComparisonWidgetConfig;
      const useGrad = cfg.gradientFill === true;
      const preview = toChartPreview(previewData);
      if (preview) {
        const data = preview.labels.map((label, idx) => {
          const row: Record<string, string | number> = { period: label };
          preview.datasets.forEach((dataset) => {
            row[dataset.label] = Number(dataset.data[idx] ?? 0);
          });
          return row;
        });

        const compColors = preview.datasets.map((dataset, idx) => getSeriesColor(cfg.seriesColors, dataset.label, idx));

        return (
          <ResponsiveContainer width="100%" height={chartH(widget.size)}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
              {useGrad && barGradDefs(compColors)}
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="period" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip formatter={formatTooltipValue} contentStyle={chartTooltipStyle} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
              {preview.datasets.map((dataset, idx) => {
                const c = getSeriesColor(cfg.seriesColors, dataset.label, idx);
                return <Bar key={dataset.label} dataKey={dataset.label} fill={barFill(c, useGrad)} radius={[6, 6, 2, 2]} isAnimationActive={false} />;
              })}
            </BarChart>
          </ResponsiveContainer>
        );
      }

      const filtered = applyCommonFilters(transactions, widget.config);
      const data = comparePeriods(filtered, cfg.compare);
      const incomeColor = getSeriesColor(cfg.seriesColors, "income", 0);
      const expenseColor = getSeriesColor(cfg.seriesColors, "expense", 1);
      const compLocalColors = [incomeColor, expenseColor];

      return (
        <ResponsiveContainer width="100%" height={chartH(widget.size)}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            {useGrad && barGradDefs(compLocalColors)}
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="period" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip formatter={formatTooltipValue} contentStyle={chartTooltipStyle} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
            <Bar dataKey="income" fill={barFill(incomeColor, useGrad)} radius={[6, 6, 2, 2]} isAnimationActive={false} />
            <Bar dataKey="expense" fill={barFill(expenseColor, useGrad)} radius={[6, 6, 2, 2]} isAnimationActive={false} />
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
