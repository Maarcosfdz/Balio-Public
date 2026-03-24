import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  CalendarClock,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  X,
  } from "lucide-react";
import type {
  CategorySummaryDto,
  FilterResponseDto,
  FilterSummaryDto,
  TransactionFilters,
  TransactionResponseDto,
  TransactionSummaryDto,
  TransactionType,
} from "@/types";
import { transactionService } from "@/backend/transactionService";
import { bankService } from "@/backend/bankService";
import { filterService } from "@/backend/filterService";
import { categoryService } from "@/backend/categoryService";
import "@/styles/pages/transactions.css";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";
import ApplyRulesModal from "@/components/transactions/ApplyRulesModal";
import Pagination from "@/components/ui/Pagination";
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
  const stateAccountId   = (location.state as { accountId?: string; filterId?: string; editFilterId?: string; filterName?: string } | null)?.accountId;
  const stateFilterId    = (location.state as { accountId?: string; filterId?: string; editFilterId?: string; filterName?: string } | null)?.filterId;
  const stateEditFilterId = (location.state as { editFilterId?: string; filterName?: string } | null)?.editFilterId;
  const stateFilterName   = (location.state as { filterName?: string } | null)?.filterName ?? "";

  // ── Data ──
  const [transactions, setTransactions] = useState<TransactionSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategorySummaryDto[]>([]);

  // ── Filters — pre-populate from navigation state ──
  const [filters, setFilters] = useState<ActiveFilters>(() =>
    stateAccountId ? { accountId: stateAccountId } : {}
  );
  const [filtersOpen, setFiltersOpen] = useState(!!stateAccountId || !!stateEditFilterId);
  /** Populated once when navigating in edit-filter mode; used to seed FilterPanel's internal state */
  const [editInitialFilters, setEditInitialFilters] = useState<ActiveFilters | undefined>();

  // ── Modals ──
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionResponseDto | null>(null);

  // ── Pagination ──
  const [page, setPage] = useState(1);
  const pageRef = useRef(1);
  const [isServerPaged, setIsServerPaged] = useState(false);
  const isServerPagedRef = useRef(false);
  const [serverTotalPages, setServerTotalPages] = useState(1);

  // ── Quick Access Tabs ──
  // Initialized synchronously from localStorage so they're ready on first render.
  const [pinnedFilters, setPinnedFilters] = useState<FilterSummaryDto[]>(() => {
    try { return JSON.parse(localStorage.getItem("balio_pinned_filters") ?? "[]"); }
    catch { return []; }
  });
  const [activeTabId, setActiveTabId] = useState<string | null>(
    () => localStorage.getItem("balio_active_tab")
  );
  const [allSavedFilters, setAllSavedFilters] = useState<FilterSummaryDto[]>([]);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const addPickerRef = useRef<HTMLDivElement>(null);

  // Fetch all saved filters for the add-to-tabs picker
  useEffect(() => {
    filterService.getAll().then(setAllSavedFilters).catch(() => {});
    categoryService.getAll().then(setCategories).catch(() => {});
  }, []);

  // Close picker on outside click + refresh list when picker opens
  useEffect(() => {
    if (!showAddPicker) return;
    // Refresh so newly-created filters appear without a page reload
    filterService.getAll().then(setAllSavedFilters).catch(() => {});
    const handler = (e: MouseEvent) => {
      if (addPickerRef.current && !addPickerRef.current.contains(e.target as Node)) {
        setShowAddPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAddPicker]);

  // Persist pinned filters
  useEffect(() => {
    localStorage.setItem("balio_pinned_filters", JSON.stringify(pinnedFilters));
  }, [pinnedFilters]);

  // Persist active tab
  useEffect(() => {
    if (activeTabId) localStorage.setItem("balio_active_tab", activeTabId);
    else localStorage.removeItem("balio_active_tab");
  }, [activeTabId]);

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

  const syncStaleIfNeeded = useCallback(async () => {
    try {
      const result = await bankService.syncStale(15);
      if (result.syncedAccounts > 0) {
        setSyncSummary(
          result.imported > 0
            ? `Sincronización automática: ${result.imported} transacción${result.imported !== 1 ? "es" : ""} nueva${result.imported !== 1 ? "s" : ""}.`
            : "Sincronización automática completada.",
        );
      }
    } catch {
      // ignore auto-sync errors here; page data still loads afterwards
    }
  }, []);

  // Initial / per-navigation load.
  // location.key changes on every navigation event so this runs whenever the
  // user arrives at this page (fresh mount OR back-navigation).
  useEffect(() => {
    const load = async () => {
      await syncStaleIfNeeded();

      if (stateFilterId) {
        handleApplySavedFilter(stateFilterId);
      } else if (stateEditFilterId) {
        setFiltersOpen(true);
        filterService.getById(stateEditFilterId)
          .then((details) => {
            if (details?.definition) {
              try {
                const parsed: ActiveFilters = JSON.parse(details.definition);
                setEditInitialFilters(parsed);
                setFilters(parsed);
                fetchTransactions(parsed, true, 0);
              } catch {
                fetchTransactions({}, true, 0);
              }
            } else {
              fetchTransactions({}, true, 0);
            }
          })
          .catch(() => fetchTransactions({}, true, 0));
      } else {
        const storedTab = localStorage.getItem("balio_active_tab");
        const storedPinned: FilterSummaryDto[] = (() => {
          try { return JSON.parse(localStorage.getItem("balio_pinned_filters") ?? "[]"); }
          catch { return []; }
        })();
        if (storedTab && storedPinned.some((p) => p.id === storedTab)) {
          handleApplySavedFilter(storedTab);
        } else {
          fetchTransactions(filtersRef.current, true, 0);
        }
      }
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

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

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
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
      // Apply the filter and fetch its definition in parallel
      const [data, details] = await Promise.all([
        filterService.apply(filterId),
        filterService.getById(filterId).catch((): FilterResponseDto | null => null),
      ]);
      setTransactions(data);
      // Sync FilterPanel state from the saved filter's definition
      if (details?.definition) {
        try { setFilters(JSON.parse(details.definition)); } catch { /* ignore */ }
      }
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

  const handleSyncAll = async () => {
    if (syncingAll) return;
    setSyncingAll(true);
    setSyncSummary(null);
    try {
      const result = await bankService.syncAll();
      setSyncSummary(
        result.syncedAccounts === 0
          ? "No hay cuentas bancarias enlazadas para sincronizar."
          : result.imported === 0
            ? `Se sincronizaron ${result.syncedAccounts} cuenta${result.syncedAccounts !== 1 ? "s" : ""} y no había movimientos nuevos.`
            : `Se sincronizaron ${result.syncedAccounts} cuenta${result.syncedAccounts !== 1 ? "s" : ""} y entraron ${result.imported} transacción${result.imported !== 1 ? "es" : ""} nueva${result.imported !== 1 ? "s" : ""}.`,
      );
      const cp = isServerPagedRef.current ? pageRef.current - 1 : 0;
      await fetchTransactions(filtersRef.current, false, cp);
    } catch {
      setSyncSummary("No se pudo sincronizar ahora mismo.");
    } finally {
      setSyncingAll(false);
    }
  };

  const handleTransactionCreated = () => {
    setExpenseOpen(false);
    setIncomeOpen(false);
    setEditingTx(null);
    const cp = isServerPagedRef.current ? pageRef.current - 1 : 0;
    fetchTransactions(filtersRef.current, false, cp);
  };

  const handleEditTransaction = async (tx: TransactionSummaryDto) => {
    try {
      const full = await transactionService.getById(tx.id);
      setEditingTx(full);
    } catch {
      // Fallback: can't fetch full details
    }
  };

  const handleDeleteTransaction = async (tx: TransactionSummaryDto) => {
    if (!window.confirm(t("transactions.deleteConfirm"))) return;
    try {
      await transactionService.remove(tx.id, true);
      const cp = isServerPagedRef.current ? pageRef.current - 1 : 0;
      fetchTransactions(filtersRef.current, false, cp);
    } catch {
      // Fail silently
    }
  };

  const handleRemoveTab = (id: string) => {
    setPinnedFilters((prev) => prev.filter((f) => f.id !== id));
    if (activeTabId === id) {
      setActiveTabId(null);
      fetchTransactions(filtersRef.current, true, 0);
    }
  };

  const handlePageChange = (newPage: number) => {
    pageRef.current = newPage;
    setPage(newPage);
    if (isServerPagedRef.current) {
      fetchTransactions(filtersRef.current, false, newPage - 1);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatAmount = (tx: TransactionSummaryDto) => {
    const sign = tx.type === "EXPENSE" ? "-" : "+";
    const currency = tx.currency ?? "EUR";
    const main = `${sign}${tx.amount.toFixed(2)} ${currency}`;
    if (tx.originalCurrency && tx.originalCurrency !== currency && tx.originalAmount != null) {
      return `${main} (${sign}${tx.originalAmount.toFixed(2)} ${tx.originalCurrency})`;
    }
    return main;
  };

  return (
    <div className="space-y-6">
      {syncSummary && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-700">
          {syncSummary}
        </div>
      )}

      {/* ── Hero Header ── */}
      <div className="tx-hero-section">
        <div className="tx-hero-inner">
          <div className="tx-hero-title">
            <ArrowLeftRight className="h-7 w-7 text-white/80" />
            <h1>{t("transactions.title")}</h1>
          </div>

          <div className="tx-bento-grid">
            {/* Expense card */}
            <div className="tx-bento-card tx-bento-expense">
              <div className="tx-bento-icon">
                <ArrowDownCircle className="h-5 w-5 text-rose-500" />
              </div>
              <p className="tx-bento-card-title">{t("txPage.addExpense")}</p>
              <p className="tx-bento-card-desc">Registra tus gastos al instante.</p>
              <button
                className="tx-bento-btn tx-bento-btn-dark"
                onClick={() => setExpenseOpen(true)}
              >
                <Plus className="h-4 w-4" />
                {t("txPage.addExpense")}
              </button>
            </div>

            {/* Income card */}
            <div className="tx-bento-card tx-bento-income">
              <div className="tx-bento-income-bg" />
              <div className="tx-bento-icon" style={{ position: "relative", zIndex: 1 }}>
                <ArrowUpCircle className="h-5 w-5 text-emerald-800" />
              </div>
              <p className="tx-bento-card-title" style={{ position: "relative", zIndex: 1 }}>{t("txPage.addIncome")}</p>
              <p className="tx-bento-card-desc" style={{ position: "relative", zIndex: 1 }}>Registra tus ingresos fácilmente.</p>
              <button
                className="tx-bento-btn tx-bento-btn-light"
                style={{ position: "relative", zIndex: 1 }}
                onClick={() => setIncomeOpen(true)}
              >
                <Plus className="h-4 w-4" />
                {t("txPage.addIncome")}
              </button>
            </div>
          </div>

          {/* Action buttons — standalone pills, no card wrapper */}
          <div className="tx-hero-actions">
            <button
              className="tx-action-pill"
              onClick={() => navigate(ROUTES.CATEGORIES)}
            >
              <Tag className="h-4 w-4" />
              {t("nav.categories")}
            </button>
            <button
              className="tx-action-pill"
              onClick={() => navigate(ROUTES.SCHEDULED_TRANSACTIONS)}
            >
              <CalendarClock className="h-4 w-4" />
              {t("scheduled.title")}
            </button>
            <button
              className="tx-action-pill"
              onClick={handleSyncAll}
              disabled={syncingAll}
            >
              {syncingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync bancos
            </button>
            <button
              className="tx-action-pill"
              onClick={() => setRulesOpen(true)}
            >
              <ListChecks className="h-4 w-4" />
              {t("rules.title")}
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <FilterPanel
        key={stateEditFilterId ?? "default"}
        open={filtersOpen}
        onToggle={() => setFiltersOpen((v) => !v)}
        onApply={handleApplyFilters}
        defaultAccountId={stateAccountId}
        maxTransactionAmount={maxTxAmount || undefined}
        initialFilters={editInitialFilters}
        editFilterId={stateEditFilterId}
        editFilterName={stateFilterName}
        onUpdated={() => navigate(ROUTES.FILTERS)}
      />

      {/* Transaction list — browser-chrome card (tabs built in) */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

      {/* Quick Access Tab bar — sempre visible, with permanent Base tab */}
      <div className="flex items-end border-b border-slate-200 bg-slate-200 px-3 pt-2">
        {/* Scrollable tabs — scrollbar hidden via tx-tab-scroll */}
        <div className="tx-tab-scroll flex flex-1 items-end gap-0 overflow-x-auto">
          {/* Base tab — permanent, cannot be removed */}
          <button
            onClick={() => { setActiveTabId(null); setFilters({}); fetchTransactions({}, true, 0); }}
            className={`flex shrink-0 items-center rounded-t-lg border-l border-r border-t px-3 py-2 text-xs font-semibold transition-all duration-200 ${
              activeTabId === null
                ? "border-slate-200 bg-white text-sky-600 -mb-[1px] z-10"
                : "border-slate-200 bg-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            }`}
          >
            {t("txPage.baseTab", "Base")}
          </button>

          {pinnedFilters.map((pf) => (
            <div
              key={pf.id}
              className={`group relative flex shrink-0 items-center gap-1.5 rounded-t-lg border-l border-r border-t px-3 py-2 text-xs font-medium transition-all duration-200 ${
                activeTabId === pf.id
                  ? "border-slate-200 bg-white text-sky-600 -mb-[1px] z-10"
                  : "border-slate-200 bg-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              <button
                onClick={() => handleApplySavedFilter(pf.id)}
                className="truncate max-w-[120px]"
              >
                {pf.name}
              </button>
              <button
                onClick={() => handleRemoveTab(pf.id)}
                className="text-slate-300 transition hover:text-slate-500"
                aria-label={`Quitar ${pf.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Add filter to tabs button */}
        <div ref={addPickerRef} className="relative ml-1 shrink-0 pb-1.5">
          <button
            onClick={() => setShowAddPicker((v) => !v)}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-400 transition hover:border-sky-400 hover:text-sky-500"
            title={t("txPage.addFilterTab", "Añadir filtro a tabs")}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          {showAddPicker && (
            <div className="absolute right-0 top-8 z-50 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              {allSavedFilters.filter((sf) => !pinnedFilters.some((pf) => pf.id === sf.id)).length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-400">{t("txPage.noMoreFilters", "No hay más filtros")}</p>
              ) : (
                <ul>
                  {allSavedFilters
                    .filter((sf) => !pinnedFilters.some((pf) => pf.id === sf.id))
                    .map((sf) => (
                      <li key={sf.id}>
                        <button
                          className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-sky-50 hover:text-sky-600"
                          onClick={() => {
                            setPinnedFilters((prev) => [...prev, sf]);
                            setShowAddPicker(false);
                          }}
                        >
                          {sf.name}
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
        {/* Table header — 7 columns: tipo, concepto, fecha, cuenta, categoría, importe, acciones */}
        <div className="hidden grid-cols-12 gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:grid">
          <div className="col-span-1">{t("transactions.type")}</div>
          <div className="col-span-2">{t("txPage.name")}</div>
          <div className="col-span-2">{t("txPage.date")}</div>
          <div className="col-span-2">{t("transactions.account")}</div>
          <div className="col-span-2">{t("transactions.category")}</div>
          <div className="col-span-2 text-right">{t("transactions.amount")}</div>
          <div className="col-span-1 text-right">{t("txPage.actions")}</div>
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
                className="group grid grid-cols-12 items-center gap-2 px-5 py-3 transition-colors duration-150 hover:bg-slate-50/60"
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
                <div className="col-span-2 flex items-center gap-2 min-w-0">
                  {(() => {
                    const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : null;
                    if (cat?.iconName) {
                      const bg = cat.iconBgColor ?? "#e2e8f0";
                      return (
                        <span
                          className="tx-cat-icon flex-shrink-0"
                          style={{ background: bg }}
                          title={cat.name}
                        >
                          {cat.iconName.startsWith("emoji:") ? (
                            <span>{cat.iconName.slice(6)}</span>
                          ) : (
                            <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#475569" }}>
                              {cat.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </span>
                      );
                    }
                    if (tx.categoryName) {
                      return (
                        <span
                          className="tx-cat-icon flex-shrink-0"
                          style={{ background: "#f1f5f9" }}
                          title={tx.categoryName}
                        >
                          <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#94a3b8" }}>
                            {tx.categoryName.charAt(0).toUpperCase()}
                          </span>
                        </span>
                      );
                    }
                    return null;
                  })()}
                  <span className="truncate text-sm font-medium text-slate-700">{tx.name}</span>
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
                  {formatAmount(tx)}
                </div>

                {/* 7. Actions */}
                <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => handleEditTransaction(tx)}
                    className="rounded-md p-1.5 text-slate-400 transition hover:bg-sky-50 hover:text-sky-500"
                    title={t("txPage.editTransaction")}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTransaction(tx)}
                    className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                    title={t("txPage.deleteTransaction")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
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
      {editingTx && (
        <AddTransactionModal
          type={editingTx.type as TransactionType}
          open={!!editingTx}
          onClose={() => setEditingTx(null)}
          onCreated={handleTransactionCreated}
          editTransaction={editingTx}
        />
      )}
      <ApplyRulesModal
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        onApplied={() => {
          const cp = isServerPagedRef.current ? pageRef.current - 1 : 0;
          fetchTransactions(filtersRef.current, false, cp);
        }}
      />
    </div>
  );
}
