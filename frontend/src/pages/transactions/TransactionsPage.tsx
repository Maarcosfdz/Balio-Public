import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  Bookmark,
  Loader2,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import type {
  FilterSummaryDto,
  TransactionFilters,
  TransactionSummaryDto,
  TransactionType,
} from "@/types";
import { transactionService } from "@/backend/transactionService";
import { filterService } from "@/backend/filterService";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";
import Pagination from "@/components/transactions/Pagination";
import FilterPanel, {
  type ActiveFilters,
} from "./components/FilterPanel";
import { ROUTES } from "@/config/routes";

const PAGE_SIZE = 20;
const AUTO_REFRESH_INTERVAL = 30_000; // 30 seconds

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, "");
}

export default function TransactionsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const stateAccountId = (location.state as { accountId?: string; filterId?: string } | null)?.accountId;
  const stateFilterId  = (location.state as { accountId?: string; filterId?: string } | null)?.filterId;

  // ── Data ──
  const [transactions, setTransactions] = useState<TransactionSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Filters — pre-populate from navigation state ──
  const [filters, setFilters] = useState<ActiveFilters>(() =>
    stateAccountId ? { accountId: stateAccountId } : {}
  );
  const [filtersOpen, setFiltersOpen] = useState(!!stateAccountId);

  // ── Modals ──
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);

  // ── Pagination ──
  const [page, setPage] = useState(1);

  // ── Quick Access Tabs ──
  const [pinnedFilters, setPinnedFilters] = useState<FilterSummaryDto[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [allSavedFilters, setAllSavedFilters] = useState<FilterSummaryDto[]>([]);
  const addPickerRef = useRef<HTMLDivElement>(null);

  // Load pinned filters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("balio_pinned_filters");
    if (saved) {
      try {
        setPinnedFilters(JSON.parse(saved));
      } catch { /* ignore */ }
    }
  }, []);

  // Save pinned filters to localStorage
  useEffect(() => {
    localStorage.setItem("balio_pinned_filters", JSON.stringify(pinnedFilters));
  }, [pinnedFilters]);

  // Close add picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addPickerRef.current && !addPickerRef.current.contains(e.target as Node)) {
        setShowAddPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Fetch data ──
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchTransactions = useCallback(
    async (f: ActiveFilters = filtersRef.current, showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const backendFilters: TransactionFilters = {};
        if (f.type) backendFilters.type = f.type;
        if (f.accountId) backendFilters.accountId = f.accountId;
        // Send single categoryId to backend for optimal query; multiple = client-side only
        if (f.categoryIds && f.categoryIds.length === 1) {
          backendFilters.categoryId = f.categoryIds[0];
        }
        if (f.startDate) backendFilters.startDate = f.startDate;
        if (f.endDate) backendFilters.endDate = f.endDate;

        const data = await transactionService.getAll(backendFilters);
        setTransactions(data);
        if (showLoading) setPage(1);
      } catch {
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    if (stateFilterId) {
      handleApplySavedFilter(stateFilterId);
    } else {
      fetchTransactions(filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-refresh: polling + visibility change ──
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTransactions(filtersRef.current, false);
    }, AUTO_REFRESH_INTERVAL);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchTransactions(filtersRef.current, false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchTransactions]);

  // ── Client-side extra filtering (name, amount range, multiple categories) ──
  const displayedTransactions = useMemo(() => {
    let list = [...transactions];

    if (filters.nameQuery) {
      const q = normalize(filters.nameQuery);
      list = list.filter((tx) => normalize(tx.name).includes(q));
    }
    if (filters.amountMin != null) {
      list = list.filter((tx) => tx.amount >= filters.amountMin!);
    }
    if (filters.amountMax != null) {
      list = list.filter((tx) => tx.amount <= filters.amountMax!);
    }
    // multi-category: when > 1 selected, backend returned all so filter here
    if (filters.categoryIds && filters.categoryIds.length > 1) {
      list = list.filter(
        (tx) => tx.categoryId && filters.categoryIds!.includes(tx.categoryId)
      );
    }

    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [transactions, filters.nameQuery, filters.amountMin, filters.amountMax, filters.categoryIds]);

  const totalPages = Math.max(1, Math.ceil(displayedTransactions.length / PAGE_SIZE));
  const paged = displayedTransactions.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  // Max amount for slider initial value in FilterPanel
  const maxTxAmount = useMemo(
    () => transactions.reduce((m, tx) => Math.max(m, tx.amount), 0),
    [transactions]
  );

  // ── Handlers ──
  const handleApplyFilters = (f: ActiveFilters) => {
    setFilters(f);
    setActiveTabId(null);
    fetchTransactions(f);
  };

  const handleApplySavedFilter = async (filterId: string) => {
    setLoading(true);
    setActiveTabId(filterId);
    try {
      const data = await filterService.apply(filterId);
      setTransactions(data);
      setPage(1);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionCreated = () => {
    setExpenseOpen(false);
    setIncomeOpen(false);
    fetchTransactions(filtersRef.current);
  };

  const handleRemoveTab = (id: string) => {
    setPinnedFilters((prev) => prev.filter((f) => f.id !== id));
    if (activeTabId === id) {
      setActiveTabId(null);
      fetchTransactions(filtersRef.current);
    }
  };

  const handleDeletePinnedFilter = async (id: string) => {
    try {
      await filterService.remove(id);
      setPinnedFilters((prev) => prev.filter((f) => f.id !== id));
      if (activeTabId === id) {
        setActiveTabId(null);
        fetchTransactions(filtersRef.current);
      }
    } catch { /* ignore */ }
  };

  const handleAddToTabs = async () => {
    try {
      const all = await filterService.getAll();
      setAllSavedFilters(all);
      setShowAddPicker(true);
    } catch { /* ignore */ }
  };

  const handlePickFilter = (sf: FilterSummaryDto) => {
    if (pinnedFilters.length >= 10) return;
    if (pinnedFilters.some((p) => p.id === sf.id)) return;
    setPinnedFilters((prev) => [...prev, sf]);
    setShowAddPicker(false);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatAmount = (amount: number, type: TransactionType) => {
    const sign = type === "EXPENSE" ? "-" : "+";
    return `${sign}${amount.toFixed(2)} €`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-800">
          <ArrowLeftRight className="h-7 w-7 text-sky-500" />
          {t("transactions.title")}
        </h1>

        <div className="flex items-center gap-2">
          {/* Categories button — icon wiggle on hover */}
          <button
            onClick={() => navigate(ROUTES.CATEGORIES)}
            title={t("nav.categories")}
            className="group inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 transition-all duration-200 hover:border-slate-400 hover:shadow-sm"
          >
            <Tag className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            <span className="hidden sm:inline">{t("nav.categories")}</span>
          </button>

          {/* Filters button — icon wiggle on hover */}
          <button
            onClick={() => navigate(ROUTES.FILTERS)}
            title={t("nav.filters")}
            className="group inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 transition-all duration-200 hover:border-slate-400 hover:shadow-sm"
          >
            <Bookmark className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            <span className="hidden sm:inline">{t("nav.filters")}</span>
          </button>

          {/* New Expense — outline red, fill from both sides toward center */}
          <button
            onClick={() => setExpenseOpen(true)}
            className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-lg border-2 border-red-400 bg-white px-4 py-2 text-sm font-semibold text-red-500 transition-colors duration-500 hover:text-white"
          >
            <span className="absolute left-0 top-0 h-full w-1/2 origin-left scale-x-0 bg-red-500 transition-transform duration-500 group-hover:scale-x-100" />
            <span className="absolute right-0 top-0 h-full w-1/2 origin-right scale-x-0 bg-red-500 transition-transform duration-500 group-hover:scale-x-100" />
            <Plus className="relative z-10 h-4 w-4" />
            <span className="relative z-10">{t("txPage.addExpense")}</span>
          </button>

          {/* New Income — green gradient, fill from both sides toward center */}
          <button
            onClick={() => setIncomeOpen(true)}
            className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-lg border-2 border-emerald-500 bg-white px-4 py-2 text-sm font-semibold text-emerald-600 transition-colors duration-500 hover:text-white"
          >
            <span className="absolute left-0 top-0 h-full w-1/2 origin-left scale-x-0 bg-gradient-to-r from-emerald-600 to-emerald-500 transition-transform duration-500 group-hover:scale-x-100" />
            <span className="absolute right-0 top-0 h-full w-1/2 origin-right scale-x-0 bg-gradient-to-l from-green-600 to-emerald-500 transition-transform duration-500 group-hover:scale-x-100" />
            <Plus className="relative z-10 h-4 w-4" />
            <span className="relative z-10">{t("txPage.addIncome")}</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <FilterPanel
        open={filtersOpen}
        onToggle={() => setFiltersOpen((v) => !v)}
        onApply={handleApplyFilters}
        onApplySavedFilter={handleApplySavedFilter}
        defaultAccountId={stateAccountId}
        maxTransactionAmount={maxTxAmount || undefined}
      />

      {/* Transaction list — browser-chrome card (tabs built in) */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        {/* Quick Access Tab bar — inside the card */}
        {pinnedFilters.length > 0 && (
          <div className="flex items-end border-b border-slate-200 bg-slate-100 px-3 pt-2">
            {/* Scrollable tabs */}
            <div className="flex flex-1 items-end gap-0 overflow-x-auto">
              {pinnedFilters.map((pf) => (
                <div
                  key={pf.id}
                  className={`group relative flex shrink-0 items-center gap-1.5 rounded-t-lg border-l border-r border-t px-3 py-2 text-xs font-medium transition-all duration-200 ${
                    activeTabId === pf.id
                      ? "border-slate-200 bg-white text-sky-600 -mb-[1px] z-10"
                      : "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  {deleteMode ? (
                    <button
                      onClick={() => handleDeletePinnedFilter(pf.id)}
                      className="text-red-400 transition hover:text-red-600"
                      aria-label={`${t("common.delete")} ${pf.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}

                  <button
                    onClick={() => handleApplySavedFilter(pf.id)}
                    className="truncate max-w-[120px]"
                  >
                    {pf.name}
                  </button>

                  {!deleteMode && (
                    <button
                      onClick={() => handleRemoveTab(pf.id)}
                      className="text-slate-300 transition hover:text-slate-500"
                      aria-label={`Quitar ${pf.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Tab action buttons */}
            <div className="relative flex items-end gap-1 pb-1 pl-2" ref={addPickerRef}>
              <button
                onClick={handleAddToTabs}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                title="Añadir filtro"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDeleteMode((v) => !v)}
                className={`flex h-7 w-7 items-center justify-center rounded-md border transition ${
                  deleteMode
                    ? "border-red-300 bg-red-50 text-red-500"
                    : "border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
                title="Eliminar filtros"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              {showAddPicker && (
                <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-slate-200 bg-white shadow-lg">
                  <div className="max-h-48 overflow-auto p-1">
                    {allSavedFilters.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-slate-400">{t("filters.noFilters")}</p>
                    ) : (
                      allSavedFilters
                        .filter((sf) => !pinnedFilters.some((p) => p.id === sf.id))
                        .map((sf) => (
                          <button
                            key={sf.id}
                            onClick={() => handlePickFilter(sf)}
                            disabled={pinnedFilters.length >= 10}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-slate-600 transition hover:bg-sky-50 hover:text-sky-700 disabled:opacity-40"
                          >
                            <Bookmark className="h-3.5 w-3.5" />
                            {sf.name}
                          </button>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Table header — 6 columns: tipo, concepto, fecha, cuenta, categoría, importe */}
        <div className="hidden grid-cols-12 gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:grid">
          <div className="col-span-1">{t("transactions.type")}</div>
          <div className="col-span-3">{t("txPage.name")}</div>
          <div className="col-span-2">{t("txPage.date")}</div>
          <div className="col-span-2">{t("transactions.account")}</div>
          <div className="col-span-2">{t("transactions.category")}</div>
          <div className="col-span-2 text-right">{t("transactions.amount")}</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : paged.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            {t("txPage.noTransactions")}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {paged.map((tx) => (
              <li
                key={tx.id}
                className="grid grid-cols-12 items-center gap-2 px-5 py-3 transition-colors duration-150 hover:bg-slate-50/60"
              >
                {/* 1. Type icon */}
                <div className="col-span-1 flex items-center">
                  {tx.type === "EXPENSE" ? (
                    <ArrowDownCircle className="h-5 w-5 text-red-400" />
                  ) : (
                    <ArrowUpCircle className="h-5 w-5 text-emerald-400" />
                  )}
                </div>

                {/* 2. Concepto */}
                <div className="col-span-3 truncate text-sm font-medium text-slate-700">
                  {tx.name}
                </div>

                {/* 3. Fecha */}
                <div className="col-span-2 text-sm text-slate-500">
                  {formatDate(tx.date)}
                </div>

                {/* 4. Cuenta */}
                <div className="col-span-2 truncate text-sm text-slate-500">
                  {tx.accountName || "—"}
                </div>

                {/* 5. Categoría */}
                <div className="col-span-2 truncate text-sm text-slate-400">
                  {tx.categoryName || t("transactions.noCategory")}
                </div>

                {/* 6. Importe */}
                <div
                  className={`col-span-2 text-right text-sm font-semibold ${
                    tx.type === "EXPENSE" ? "text-red-500" : "text-emerald-500"
                  }`}
                >
                  {formatAmount(tx.amount, tx.type)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Modals */}
      <AddTransactionModal
        type="EXPENSE"
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        onCreated={handleTransactionCreated}
      />
      <AddTransactionModal
        type="INCOME"
        open={incomeOpen}
        onClose={() => setIncomeOpen(false)}
        onCreated={handleTransactionCreated}
      />
    </div>
  );
}
