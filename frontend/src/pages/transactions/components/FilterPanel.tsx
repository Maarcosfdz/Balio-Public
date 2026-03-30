import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Filter,
  Save,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  AccountSummaryDto,
  CategorySummaryDto,
  TransactionType,
} from "@/types";
import { accountService } from "@/backend/accountService";
import { categoryService } from "@/backend/categoryService";
import { filterService } from "@/backend/filterService";
import SaveFilterDialog from "./SaveFilterDialog";
import DateRangePicker from "@/components/ui/DateRangePicker";

export interface ActiveFilters {
  type?: TransactionType;
  accountId?: string;
  categoryIds?: string[];
  startDate?: string;
  endDate?: string;
  specificDates?: string[];
  nameQuery?: string;
  amountMin?: number;
  amountMax?: number;
}

interface FilterPanelProps {
  open: boolean;
  onToggle: () => void;
  onApply: (filters: ActiveFilters) => void;
  defaultAccountId?: string;
  maxTransactionAmount?: number;
  /** Pre-populated from a saved filter when entering edit mode */
  initialFilters?: ActiveFilters;
  /** Present when the user is editing an existing saved filter */
  editFilterId?: string;
  editFilterName?: string;
  onUpdated?: () => void;
  /** When true, the built-in toggle button is hidden (toggle is handled externally) */
  hideToggleButton?: boolean;
}

interface SelectOption {
  value: string;
  label: string;
}

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
  const domainMax = Math.max(max, valueMax, valueMin + step);
  const safeMin = Math.max(min, Math.min(valueMin, domainMax - step));
  const safeMax = Math.min(domainMax, Math.max(valueMax, safeMin + step));
  const pctMin = domainMax > min ? ((safeMin - min) / (domainMax - min)) * 100 : 0;
  const pctMax = domainMax > min ? ((safeMax - min) / (domainMax - min)) * 100 : 100;
  const rangeGradient = `linear-gradient(90deg, hsl(${204 - pctMin * 0.2} 92% 60%), hsl(${154 + pctMax * 0.08} 72% 46%))`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-500">{labelMin}</label>
          <input
            type="number"
            min={min}
            max={valueMax}
            step={step}
            value={valueMin}
            onChange={(e) => {
              const next = Number.parseFloat(e.target.value);
              if (Number.isNaN(next)) {
                onChangeMin(min);
                return;
              }
              onChangeMin(Math.min(Math.max(next, min), valueMax));
            }}
            placeholder="0.00"
            className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
        </div>
        <span className="mt-5 text-slate-400">-</span>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-500">{labelMax}</label>
          <input
            type="number"
            min={valueMin}
            step={step}
            value={valueMax}
            onChange={(e) => {
              const next = Number.parseFloat(e.target.value);
              if (Number.isNaN(next)) {
                onChangeMax(domainMax);
                return;
              }
              onChangeMax(Math.max(next, valueMin));
            }}
            placeholder={domainMax.toFixed(2)}
            className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
        </div>
      </div>

      <div className="relative h-2 w-full rounded-full bg-slate-200">
        <div
          className="absolute h-full rounded-full"
          style={{
            left: `${pctMin}%`,
            width: `${Math.max(pctMax - pctMin, 0)}%`,
            background: rangeGradient,
          }}
        />
        <input
          type="range"
          min={min}
          max={domainMax}
          step={step}
          value={safeMin}
          onChange={(e) =>
            onChangeMin(
              Math.min(
                Math.max(Number.parseFloat(e.target.value), min),
                Math.max(safeMax - step, min),
              ),
            )
          }
          className="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-sky-500 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sky-500 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
          aria-label={labelMin}
        />
        <input
          type="range"
          min={min}
          max={domainMax}
          step={step}
          value={safeMax}
          onChange={(e) =>
            onChangeMax(
              Math.max(
                Number.parseFloat(e.target.value),
                Math.min(safeMin + step, domainMax),
              ),
            )
          }
          className="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-emerald-500 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-emerald-500 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
          aria-label={labelMax}
        />
      </div>

      <div className="flex justify-between text-xs text-slate-400">
        <span>{valueMin.toFixed(2)} €</span>
        <span>{valueMax.toFixed(2)} €</span>
      </div>
    </div>
  );
}

function SingleSelectDropdown({
  value,
  onChange,
  label,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: SelectOption[];
  placeholder: string;
}) {
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

  const selected = options.find((opt) => opt.value === value);

  return (
    <div className="space-y-1" ref={ref}>
      <label className="text-xs font-semibold text-slate-500">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-xs transition hover:border-sky-300 hover:bg-sky-50/40 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        >
          <span className={`truncate ${selected ? "text-slate-700" : "text-slate-400"}`}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <div className="absolute left-0 top-full z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-slate-500 transition hover:bg-sky-50 hover:text-slate-700"
            >
              {placeholder}
              {!selected && <Check className="h-3.5 w-3.5 text-sky-500" />}
            </button>
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-sky-50 hover:text-slate-800"
              >
                {option.label}
                {value === option.value && <Check className="h-3.5 w-3.5 text-sky-500" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  };

  const displayLabel =
    selected.length === 0
      ? <span className="text-slate-400">{t("txPage.allCategories")}</span>
      : selected.length === 1
        ? options.find((opt) => opt.id === selected[0])?.name ?? label
        : t("txPage.selectedCategories", { count: selected.length });

  return (
    <div className="space-y-1" ref={ref}>
      <label className="text-xs font-semibold text-slate-500">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-xs transition hover:border-sky-300 hover:bg-sky-50/40 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown
            className={`ml-2 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <div className="absolute left-0 top-full z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            {options.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">{t("categories.noCategories")}</p>
            ) : (
              options.map((option) => (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-600 transition hover:bg-sky-50 hover:text-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option.id)}
                    onChange={() => toggle(option.id)}
                    className="h-3.5 w-3.5 rounded accent-sky-500"
                  />
                  {option.name}
                </label>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}


export default function FilterPanel({
  open,
  onToggle,
  onApply,
  defaultAccountId,
  maxTransactionAmount,
  initialFilters,
  editFilterId,
  editFilterName,
  onUpdated,
  hideToggleButton,
}: FilterPanelProps) {
  const { t } = useTranslation();

  const [accounts, setAccounts] = useState<AccountSummaryDto[]>([]);
  const [categories, setCategories] = useState<CategorySummaryDto[]>([]);

  useEffect(() => {
    accountService.getAll().then(setAccounts).catch(() => {});
    categoryService.getAll().then(setCategories).catch(() => {});
  }, []);

  const [type, setType] = useState<TransactionType | "">(initialFilters?.type ?? "");
  const [accountId, setAccountId] = useState(initialFilters?.accountId ?? defaultAccountId ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(initialFilters?.categoryIds ?? []);
  const [startDate, setStartDate] = useState(initialFilters?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialFilters?.endDate ?? "");
  const [specificDates, setSpecificDates] = useState<string[]>(initialFilters?.specificDates ?? []);
  const [nameQuery, setNameQuery] = useState(initialFilters?.nameQuery ?? "");

  const baseMax = Math.max(maxTransactionAmount ?? 0, 100);
  const [amountMin, setAmountMin] = useState(initialFilters?.amountMin ?? 0);
  const [amountMax, setAmountMax] = useState(initialFilters?.amountMax ?? baseMax);

  const filteredCategories = type
    ? categories.filter((category) => !category.type || category.type === type)
    : categories;

  const typeOptions: SelectOption[] = [
    { value: "EXPENSE", label: t("transactions.expense") },
    { value: "INCOME", label: t("transactions.income") },
  ];

  const accountOptions: SelectOption[] = accounts.map((account) => ({
    value: account.id,
    label: account.name,
  }));

  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const buildFilters = useCallback((): ActiveFilters => {
    const filters: ActiveFilters = {};
    if (type) filters.type = type as TransactionType;
    if (accountId) filters.accountId = accountId;
    if (categoryIds.length > 0) filters.categoryIds = categoryIds;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (specificDates.length > 0) filters.specificDates = specificDates;
    if (nameQuery.trim()) filters.nameQuery = nameQuery.trim();
    if (amountMin > 0) filters.amountMin = amountMin;
    if (amountMax < baseMax) filters.amountMax = amountMax;
    return filters;
  }, [
    type,
    accountId,
    categoryIds,
    startDate,
    endDate,
    specificDates,
    nameQuery,
    amountMin,
    amountMax,
    baseMax,
  ]);

  const handleApply = () => onApply(buildFilters());

  const handleClear = () => {
    setType("");
    setAccountId(defaultAccountId ?? "");
    setCategoryIds([]);
    setStartDate("");
    setEndDate("");
    setSpecificDates([]);
    setNameQuery("");
    setAmountMin(0);
    setAmountMax(Math.max(maxTransactionAmount ?? 0, 100));
    onApply({});
  };

  const handleSaveFilter = async (name: string) => {
    const definition = JSON.stringify(buildFilters());
    try {
      await filterService.create({ name, definition });
      setShowSaveDialog(false);
      try { window.dispatchEvent(new CustomEvent("balio:filters-updated")); } catch { /* no-op */ }
    } catch {
      // no-op
    }
  };

  const [updating, setUpdating] = useState(false);
  const [updateOk, setUpdateOk] = useState(false);

  const handleUpdateFilter = async () => {
    if (!editFilterId) return;
    setUpdating(true);
    const definition = JSON.stringify(buildFilters());
    try {
      await filterService.update(editFilterId, { definition });
      try { window.dispatchEvent(new CustomEvent("balio:filters-updated")); } catch { /* no-op */ }
      setUpdateOk(true);
      setTimeout(() => setUpdateOk(false), 2000);
      onUpdated?.();
    } catch {
      // no-op
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      {!hideToggleButton && (
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
      )}

      <div
        id="filter-panel"
        className={`transition-all duration-300 ease-in-out ${
          open ? "max-h-[2000px] opacity-100 overflow-visible" : "max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SingleSelectDropdown
              value={type}
              onChange={(nextValue) => setType(nextValue as TransactionType | "")}
              label={t("transactions.type")}
              placeholder={t("txPage.allTypes")}
              options={typeOptions}
            />

            <SingleSelectDropdown
              value={accountId}
              onChange={setAccountId}
              label={t("transactions.account")}
              placeholder={t("txPage.allAccounts")}
              options={accountOptions}
            />

            <MultiSelectDropdown
              label={t("transactions.category")}
              options={filteredCategories}
              selected={categoryIds}
              onChange={setCategoryIds}
            />

            <div className="space-y-1">
              <label htmlFor="filter-name" className="text-xs font-semibold text-slate-500">
                {t("txPage.searchByName")}
              </label>
              <input
                id="filter-name"
                type="text"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                placeholder={t("txPage.searchByNamePlaceholder")}
                className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition hover:border-slate-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
              />
            </div>

            <div className="sm:col-span-2">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChangeStart={setStartDate}
                onChangeEnd={setEndDate}
                specificDates={specificDates}
                onChangeSpecificDates={setSpecificDates}
              />
            </div>

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

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              onClick={handleApply}
              className="tx-apply-pastel-btn inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold"
            >
              <Filter className="h-4 w-4" />
              {t("txPage.applyFilters")}
            </button>

            {editFilterId ? (
              <button
                onClick={handleUpdateFilter}
                disabled={updating}
                className="tx-save-draw-btn inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {updateOk
                  ? t("common.saved", "¡Guardado!")
                  : updating
                    ? t("common.saving", "Guardando…")
                    : `${t("common.update", "Actualizar")} "${editFilterName}"`}
              </button>
            ) : (
              <button
                onClick={() => setShowSaveDialog(true)}
                className="tx-save-draw-btn inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium"
              >
                <Save className="h-4 w-4" />
                {t("txPage.saveFilter")}
              </button>
            )}

            <button
              onClick={handleClear}
              className="tx-clear-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500"
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
