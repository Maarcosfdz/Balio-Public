import { useCallback, useEffect, useState } from "react";
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
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
  categoryId?: string;
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
}

export default function FilterPanel({
  open,
  onToggle,
  onApply,
  onApplySavedFilter,
  defaultAccountId,
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
  const [categoryId, setCategoryId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  // Save filter dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const buildFilters = useCallback((): ActiveFilters => {
    const f: ActiveFilters = {};
    if (type) f.type = type as TransactionType;
    if (accountId) f.accountId = accountId;
    if (categoryId) f.categoryId = categoryId;
    if (startDate) f.startDate = startDate;
    if (endDate) f.endDate = endDate;
    if (nameQuery.trim()) f.nameQuery = nameQuery.trim();
    if (amountMin) f.amountMin = parseFloat(amountMin);
    if (amountMax) f.amountMax = parseFloat(amountMax);
    return f;
  }, [type, accountId, categoryId, startDate, endDate, nameQuery, amountMin, amountMax]);

  const handleApply = () => onApply(buildFilters());

  const handleClear = () => {
    setType("");
    setAccountId("");
    setCategoryId("");
    setStartDate("");
    setEndDate("");
    setNameQuery("");
    setAmountMin("");
    setAmountMax("");
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
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <Filter className="h-4 w-4" />
        {t("txPage.filters")}
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
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
                    className="group inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                  >
                    <button onClick={() => onApplySavedFilter(sf.id)}>
                      <Bookmark className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => onApplySavedFilter(sf.id)}>{sf.name}</button>
                    <button
                      onClick={() => handleDeleteSavedFilter(sf.id)}
                      className="ml-1 hidden text-red-400 hover:text-red-600 group-hover:inline"
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
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">{t("transactions.type")}</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType | "")}
                className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                <option value="">{t("txPage.allTypes")}</option>
                <option value="EXPENSE">{t("transactions.expense")}</option>
                <option value="INCOME">{t("transactions.income")}</option>
              </select>
            </div>

            {/* Account */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">{t("transactions.account")}</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                <option value="">{t("txPage.allAccounts")}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">{t("transactions.category")}</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                <option value="">{t("txPage.allCategories")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Name search */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">{t("txPage.searchByName")}</label>
              <input
                type="text"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                placeholder={t("txPage.searchByNamePlaceholder")}
                className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>

            {/* Start date */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">{t("txPage.dateFrom")}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>

            {/* End date */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">{t("txPage.dateTo")}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>

            {/* Amount min */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">{t("txPage.amountMin")}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                placeholder="0.00"
                className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>

            {/* Amount max */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">{t("txPage.amountMax")}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                placeholder="0.00"
                className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>

          {/* Action row */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={handleApply}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <Filter className="h-4 w-4" />
              {t("txPage.applyFilters")}
            </button>
            <button
              onClick={() => setShowSaveDialog(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
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
      )}

      <SaveFilterDialog
        open={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSaveFilter}
      />
    </>
  );
}
