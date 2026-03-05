import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bookmark,
  ChevronDown,
  Filter,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  AccountSummaryDto,
  CategorySummaryDto,
  FilterSummaryDto,
  TransactionType,
} from "@/types";
import { accountService } from "@/backend/accountService";
import { categoryService } from "@/backend/categoryService";
import { filterService } from "@/backend/filterService";
import SaveFilterDialog from "./SaveFilterDialog";

// ── Public filter shape (used by parent page) ──
export interface ActiveFilters {
  type?: TransactionType;
  accountId?: string;
  categoryIds?: string[];  // multi-select
  startDate?: string;
  endDate?: string;
  nameQuery?: string;
  amountMin?: number;
  amountMax?: number;
}

interface FilterPanelProps {
  open: boolean;
  onToggle: () => void;
  onApply: (filters: ActiveFilters) => void;
  onApplySavedFilter: (filterId: string) => void;
  defaultAccountId?: string;
  maxTransactionAmount?: number;
}

/* ── Dual Range Slider Component ── */
function DualRangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  onChangeMin,
  onChangeMax,
  step = 1,
  labelMin,
  labelMax,
}: {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChangeMin: (v: number) => void;
  onChangeMax: (v: number) => void;
  step?: number;
  labelMin: string;
  labelMax: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const pctMin = max > min ? ((valueMin - min) / (max - min)) * 100 : 0;
  const pctMax = max > min ? ((valueMax - min) / (max - min)) * 100 : 100;

  return (
    <div className="space-y-3">
      {/* Manual inputs */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-500">{labelMin}</label>
          <input
            type="number"
            min={min}
            max={valueMax}
            step={step}
            value={valueMin || ""}
            onChange={(e) => {
              const v = parseFloat(e.target.value) || min;
              onChangeMin(Math.min(v, valueMax));
            }}
            placeholder="0.00"
            className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
        </div>
        <span className="mt-5 text-slate-400">–</span>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-500">{labelMax}</label>
          <input
            type="number"
            min={valueMin}
            max={max}
            step={step}
            value={valueMax || ""}
            onChange={(e) => {
              const v = parseFloat(e.target.value) || max;
              onChangeMax(Math.max(v, valueMin));
            }}
            placeholder={max.toFixed(2)}
            className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
        </div>
      </div>

      {/* Slider track */}
      <div ref={trackRef} className="relative h-2 w-full rounded-full bg-slate-200">
        {/* Active range */}
        <div
          className="absolute h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"
          style={{ left: `${pctMin}%`, width: `${pctMax - pctMin}%` }}
        />
        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueMin}
          onChange={(e) => onChangeMin(Math.min(parseFloat(e.target.value), valueMax - step))}
          className="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-sky-500 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sky-500 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
          aria-label={labelMin}
        />
        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueMax}
          onChange={(e) => onChangeMax(Math.max(parseFloat(e.target.value), valueMin + step))}
          className="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-emerald-500 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-emerald-500 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
          aria-label={labelMax}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs text-slate-400">
        <span>{valueMin.toFixed(2)} €</span>
        <span>{valueMax.toFixed(2)} €</span>
      </div>
    </div>
  );
}

/* ── Multi-Select Category Dropdown ── */
function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: CategorySummaryDto[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id: string) => {
    onChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
    );
  };

  const displayLabel =
    selected.length === 0
      ? <span className="text-slate-400">{t("txPage.allCategories")}</span>
      : selected.length === 1
        ? options.find((o) => o.id === selected[0])?.name ?? label
        : `${selected.length} categorías`;

  return (
    <div className="space-y-1" ref={ref}>
      <label className="text-xs font-semibold text-slate-500">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-300 bg-slate-50 pl-3 pr-3 text-sm text-slate-700 transition hover:border-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown
            className={`ml-2 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
        {open && (
          <div className="absolute left-0 top-full z-10 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {options.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">
                {t("categories.noCategories")}
              </p>
            ) : (
              options.map((opt) => (
                <label
                  key={opt.id}
                  className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-slate-600 transition hover:bg-sky-50"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(opt.id)}
                    onChange={() => toggle(opt.id)}
                    className="h-3.5 w-3.5 rounded accent-sky-500"
                  />
                  {opt.name}
                </label>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Styled Select Wrapper ── */
function StyledSelect({
  value,
  onChange,
  label,
  children,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-semibold text-slate-500">{label}</label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-slate-50 pl-3 pr-9 text-sm outline-none transition hover:border-slate-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

export default function FilterPanel({
  open,
  onToggle,
  onApply,
  onApplySavedFilter,
  defaultAccountId,
  maxTransactionAmount,
}: FilterPanelProps) {
  const { t } = useTranslation();

  // Lists
  const [accounts, setAccounts] = useState<AccountSummaryDto[]>([]);
  const [categories, setCategories] = useState<CategorySummaryDto[]>([]);
  const [savedFilters, setSavedFilters] = useState<FilterSummaryDto[]>([]);

  useEffect(() => {
    accountService.getAll().then(setAccounts).catch(() => {});
    categoryService.getAll().then(setCategories).catch(() => {});
    filterService.getAll().then(setSavedFilters).catch(() => {});
  }, []);

  // Filter state
  const [type, setType] = useState<TransactionType | "">("");
  const [accountId, setAccountId] = useState(defaultAccountId ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [nameQuery, setNameQuery] = useState("");

  // Amount range — default max comes from real transaction data
  const defaultMax = Math.max(maxTransactionAmount ?? 0, 100);
  const [amountMin, setAmountMin] = useState(0);
  const [amountMax, setAmountMax] = useState(defaultMax);

  // Update amountMax when parent provides real max
  useEffect(() => {
    if (maxTransactionAmount && maxTransactionAmount > amountMax) {
      setAmountMax(maxTransactionAmount);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxTransactionAmount]);

  // Categories filtered by selected type
  const filteredCategories = type
    ? categories.filter((c) => !c.type || c.type === type)
    : categories;

  // Save filter dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const buildFilters = useCallback((): ActiveFilters => {
    const f: ActiveFilters = {};
    if (type) f.type = type as TransactionType;
    if (accountId) f.accountId = accountId;
    if (categoryIds.length > 0) f.categoryIds = categoryIds;
    if (startDate) f.startDate = startDate;
    if (endDate) f.endDate = endDate;
    if (nameQuery.trim()) f.nameQuery = nameQuery.trim();
    if (amountMin > 0) f.amountMin = amountMin;
    const currentMax = Math.max(maxTransactionAmount ?? 0, 100);
    if (amountMax < currentMax) f.amountMax = amountMax;
    return f;
  }, [type, accountId, categoryIds, startDate, endDate, nameQuery, amountMin, amountMax, maxTransactionAmount]);

  const handleApply = () => onApply(buildFilters());

  const handleClear = () => {
    setType("");
    setAccountId("");
    setCategoryIds([]);
    setStartDate("");
    setEndDate("");
    setNameQuery("");
    setAmountMin(0);
    setAmountMax(Math.max(maxTransactionAmount ?? 0, 100));
    onApply({});
  };

  const handleSaveFilter = async (name: string) => {
    const definition = JSON.stringify(buildFilters());
    try {
      const created = await filterService.create({ name, definition });
      setSavedFilters((prev) => [...prev, { id: created.id, name: created.name }]);
      setShowSaveDialog(false);
    } catch {
      // ignore
    }
  };

  const handleDeleteSavedFilter = async (id: string) => {
    try {
      await filterService.remove(id);
      setSavedFilters((prev) => prev.filter((f) => f.id !== id));
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* Toggle button with animation */}
      <button
        onClick={onToggle}
        className="group inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 hover:shadow-sm"
        aria-expanded={open}
        aria-controls="filter-panel"
      >
        <Filter className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
        {t("txPage.filters")}
        <span className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>

      {/* Animated panel */}
      <div
        id="filter-panel"
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {/* Saved filters row */}
          {savedFilters.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t("txPage.savedFilters")}
              </p>
              <div className="flex flex-wrap gap-2">
                {savedFilters.map((sf) => (
                  <div
                    key={sf.id}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 transition hover:bg-sky-100"
                  >
                    <button
                      onClick={() => onApplySavedFilter(sf.id)}
                      className="inline-flex items-center gap-1.5"
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      {sf.name}
                    </button>
                    <button
                      onClick={() => handleDeleteSavedFilter(sf.id)}
                      className="ml-1 hidden text-red-400 transition hover:text-red-600 group-hover:inline"
                      aria-label={`${t("common.delete")} ${sf.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Type */}
            <StyledSelect
              id="filter-type"
              value={type}
              onChange={(v) => setType(v as TransactionType | "")}
              label={t("transactions.type")}
            >
              <option value="">{t("txPage.allTypes")}</option>
              <option value="EXPENSE">{t("transactions.expense")}</option>
              <option value="INCOME">{t("transactions.income")}</option>
            </StyledSelect>

            {/* Account */}
            <StyledSelect
              id="filter-account"
              value={accountId}
              onChange={setAccountId}
              label={t("transactions.account")}
            >
              <option value="">{t("txPage.allAccounts")}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </StyledSelect>

            {/* Category — multi-select dropdown */}
            <MultiSelectDropdown
              label={t("transactions.category")}
              options={filteredCategories}
              selected={categoryIds}
              onChange={setCategoryIds}
            />

            {/* Name search */}
            <div className="space-y-1">
              <label htmlFor="filter-name" className="text-xs font-semibold text-slate-500">{t("txPage.searchByName")}</label>
              <input
                id="filter-name"
                type="text"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                placeholder={t("txPage.searchByNamePlaceholder")}
                className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition hover:border-slate-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
              />
            </div>

            {/* Date range — modern inputs */}
            <div className="space-y-1">
              <label htmlFor="filter-start-date" className="text-xs font-semibold text-slate-500">{t("txPage.dateFrom")}</label>
              <input
                id="filter-start-date"
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition hover:border-slate-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="filter-end-date" className="text-xs font-semibold text-slate-500">{t("txPage.dateTo")}</label>
              <input
                id="filter-end-date"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition hover:border-slate-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
              />
            </div>

            {/* Amount range slider — spans 2 columns */}
            <div className="sm:col-span-2">
              <DualRangeSlider
                min={0}
                max={Math.max(maxTransactionAmount ?? 0, 100)}
                step={1}
                valueMin={amountMin}
                valueMax={amountMax}
                onChangeMin={setAmountMin}
                onChangeMax={setAmountMax}
                labelMin={t("txPage.amountMin")}
                labelMax={t("txPage.amountMax")}
              />
            </div>
          </div>

          {/* Action row */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              onClick={handleApply}
              className="btn-login-hover inline-flex items-center gap-1.5 !rounded-lg !px-4 !py-2 !text-sm !font-semibold"
            >
              <Filter className="h-4 w-4" />
              {t("txPage.applyFilters")}
            </button>
            <button
              onClick={() => setShowSaveDialog(true)}
              className="btn-save-filter inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600"
            >
              <Save className="h-4 w-4" />
              {t("txPage.saveFilter")}
            </button>
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
              {t("txPage.clearFilters")}
            </button>
          </div>
        </div>
      </div>

      <SaveFilterDialog
        open={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSaveFilter}
      />
    </>
  );
}
