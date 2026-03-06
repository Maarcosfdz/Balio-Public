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
  const pageRef = useRef(1);
  const [isServerPaged, setIsServerPaged] = useState(false);
  const isServerPagedRef = useRef(false);
  const [serverTotalPages, setServerTotalPages] = useState(1);

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
    async (f: ActiveFilters, showLoading: boolean, pageIndex: number) => {
      if (showLoading) setLoading(true);
      try {
        const backendFilters: TransactionFilters = {};
        if (f.type) backendFilters.type = f.type;
        if (f.accountId) backendFilters.accountId = f.accountId;
        if (f.categoryIds && f.categoryIds.length === 1) {
          backendFilters.categoryId = f.categoryIds[0];
        }
        if (f.startDate) backendFilters.startDate = f.startDate;
        if (f.endDate) backendFilters.endDate = f.endDate;

        const hasClientOnlyFilters = !!(
          f.nameQuery ||
          f.amountMin != null ||
          f.amountMax != null ||
          (f.specificDates?.length ?? 0) > 0 ||
          (f.categoryIds?.length ?? 0) > 1
        );

        if (hasClientOnlyFilters) {
          const result = await transactionService.getAll(backendFilters, 0, 10000);
          setTransactions(result.content);
          isServerPagedRef.current = false;
          setIsServerPaged(false);
        } else {
          const result = await transactionService.getAll(backendFilters, pageIndex, PAGE_SIZE);
          setTransactions(result.content);
          setServerTotalPages(result.totalPages);
          isServerPagedRef.current = true;
          setIsServerPaged(true);
        }

        if (showLoading) {
          pageRef.current = 1;
          setPage(1);
        }
      } catch {
        setTransactions([]);
        isServerPagedRef.current = false;
        setIsServerPaged(false);
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
      fetchTransactions(filters, true, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-refresh: polling + visibility change ──
  useEffect(() => {
    const interval = setInterval(() => {
      const cp = isServerPagedRef.current ? pageRef.current - 1 : 0;
      fetchTransactions(filtersRef.current, false, cp);
    }, AUTO_REFRESH_INTERVAL);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const cp = isServerPagedRef.current ? pageRef.current - 1 : 0;
        fetchTransactions(filtersRef.current, false, cp);
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
    if (filters.specificDates && filters.specificDates.length > 0) {
      const specificDates = new Set(filters.specificDates);
      list = list.filter((tx) => specificDates.has(tx.date.slice(0, 10)));
    }
    // multi-category: when > 1 selected, backend returned all so filter here
    if (filters.categoryIds && filters.categoryIds.length > 1) {
      list = list.filter(
        (tx) => tx.categoryId && filters.categoryIds!.includes(tx.categoryId)
      );
    }

    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [
    transactions,
    filters.nameQuery,
    filters.amountMin,
    filters.amountMax,
    filters.specificDates,
    filters.categoryIds,
  ]);

  const totalPages = isServerPaged
    ? serverTotalPages
    : Math.max(1, Math.ceil(displayedTransactions.length / PAGE_SIZE));
  const paged = isServerPaged
    ? displayedTransactions
    : displayedTransactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Max amount for slider initial value in FilterPanel
  const maxTxAmount = useMemo(
    () => transactions.reduce((m, tx) => Math.max(m, tx.amount), 0),
    [transactions]
  );

  // ── Handlers ──
  const handleApplyFilters = (f: ActiveFilters) => {
    setFilters(f);
    setActiveTabId(null);
    fetchTransactions(f, true, 0);
  };

  const handleApplySavedFilter = async (filterId: string) => {
    setLoading(true);
    setActiveTabId(filterId);
    try {
      const data = await filterService.apply(filterId);
      setTransactions(data);
      isServerPagedRef.current = false;
      setIsServerPaged(false);
      pageRef.current = 1;
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
    const cp = isServerPagedRef.current ? pageRef.current - 1 : 0;
    fetchTransactions(filtersRef.current, false, cp);
  };

  const handleRemoveTab = (id: string) => {
    setPinnedFilters((prev) => prev.filter((f) => f.id !== id));
    if (activeTabId === id) {
      setActiveTabId(null);
      fetchTransactions(filtersRef.current, true, 0);
    }
  };

  const handleDeletePinnedFilter = async (id: string) => {
    try {
      await filterService.remove(id);
      setPinnedFilters((prev) => prev.filter((f) => f.id !== id));
      if (activeTabId === id) {
        setActiveTabId(null);
        fetchTransactions(filtersRef.current, true, 0);
      }
    } catch { /* ignore */ }
  };

  const handlePageChange = (newPage: number) => {
    pageRef.current = newPage;
    setPage(newPage);
    if (isServerPagedRef.current) {
      fetchTransactions(filtersRef.current, false, newPage - 1);
    }
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
    <div className="space-y-5">
      {/* ── Cabecera ── */}
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        {/* Fila 1: título */}
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-slate-800">
          <ArrowLeftRight className="h-6 w-6 text-sky-500" />
          {t("transactions.title")}
        </h1>

        {/* Fila 2: acciones */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {/* Categorías */}
          <button
            onClick={() => navigate(ROUTES.CATEGORIES)}
            title={t("nav.categories")}
            className="tx-outline-hover-btn group"
          >
            <svg
              className="tx-outline-hover-border"
              viewBox="0 0 100 34"
              preserveAspectRatio="none"
              aria-hidden
            >
              <rect x="1" y="1" width="98" height="32" rx="8" className="tx-outline-hover-bg" />
              <rect x="1" y="1" width="98" height="32" rx="8" className="tx-outline-hover-hl" />
            </svg>
            <Tag className="relative z-10 h-3.5 w-3.5" />
            <span className="relative z-10 hidden sm:inline">{t("nav.categories")}</span>
          </button>

          {/* Filtros guardados */}
          <button
            onClick={() => navigate(ROUTES.FILTERS)}
            title={t("nav.filters")}
            className="tx-outline-hover-btn group"
          >
            <svg
              className="tx-outline-hover-border"
              viewBox="0 0 100 34"
              preserveAspectRatio="none"
              aria-hidden
            >
              <rect x="1" y="1" width="98" height="32" rx="8" className="tx-outline-hover-bg" />
              <rect x="1" y="1" width="98" height="32" rx="8" className="tx-outline-hover-hl" />
            </svg>
            <Bookmark className="relative z-10 h-3.5 w-3.5" />
            <span className="relative z-10 hidden sm:inline">{t("nav.filters")}</span>
          </button>

          {/* Nuevo Gasto + Ingreso — far right */}
          <div className="ml-auto flex items-center gap-2">
            <div className="h-5 w-px bg-slate-100" aria-hidden />

            {/* Nuevo Gasto */}
            <button
              onClick={() => setExpenseOpen(true)}
              className="tx-squishy-tech tx-squishy-expense"
            >
              <Plus className="tx-squishy-icon relative z-10 h-3.5 w-3.5" />
              <span className="relative z-10">{t("txPage.addExpense")}</span>
            </button>

            {/* Nuevo Ingreso */}
            <button
              onClick={() => setIncomeOpen(true)}
              className="tx-squishy-tech tx-squishy-income"
            >
              <Plus className="tx-squishy-icon relative z-10 h-3.5 w-3.5" />
              <span className="relative z-10">{t("txPage.addIncome")}</span>
            </button>
          </div>
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
        onPageChange={handlePageChange}
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
