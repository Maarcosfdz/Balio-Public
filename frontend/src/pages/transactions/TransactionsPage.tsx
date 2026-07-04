import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpCircle,
  CalendarClock,
  ChevronDown,
  ListChecks,
  Loader2,
  ArrowUpDown,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
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
import { ToastBanner } from "@/components/ui/toast-banner";
import InfoCard from "@/components/ui/InfoCard";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";
import ApplyRulesModal from "./components/ApplyRulesModal";
import SyncModal from "./components/SyncModal";
import Pagination from "@/components/ui/Pagination";
import FilterPanel, {
  type ActiveFilters,
} from "./components/FilterPanel";
import { ROUTES } from "@/config/routes";
import { IconAvatar } from "@/components/icons/IconAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { loadUserScopedStorage, userScopedStorageKey } from "@/lib/userScopedStorage";

const PAGE_SIZE = 20;
const AUTO_REFRESH_INTERVAL = 3_600_000; // 1 hour
const AUTO_SYNC_THROTTLE_MS = 3_600_000; // 1 hour
const LAST_AUTO_SYNC_KEY = "balio_tx_last_auto_sync_ms";
const PINNED_FILTERS_STORAGE_KEY = "balio_pinned_filters";
const ACTIVE_TAB_STORAGE_KEY = "balio_active_tab";
const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  JPY: "¥",
  GBP: "£",
};

type TransactionSortField = "date" | "amount" | "name";
type TransactionSortDir = "asc" | "desc";

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, "");
}

function currencyLabel(code?: string) {
  const upper = (code ?? "EUR").toUpperCase();
  return CURRENCY_SYMBOLS[upper] ?? upper;
}

function isFilterSummary(value: unknown): value is FilterSummaryDto {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === "string" && typeof candidate.name === "string";
}

function parsePinnedFilters(value: unknown): FilterSummaryDto[] {
  return Array.isArray(value) ? value.filter(isFilterSummary) : [];
}

function parseActiveTab(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function loadPinnedFilters(storageKey: string): FilterSummaryDto[] {
  return loadUserScopedStorage({
    storageKey,
    legacyKey: PINNED_FILTERS_STORAGE_KEY,
    fallback: [],
    parse: parsePinnedFilters,
  });
}

function loadActiveTab(storageKey: string) {
  return loadUserScopedStorage({
    storageKey,
    legacyKey: ACTIVE_TAB_STORAGE_KEY,
    fallback: null,
    parse: parseActiveTab,
  });
}

function reconcilePinnedFilters(pinned: FilterSummaryDto[], saved: FilterSummaryDto[]) {
  const savedById = new Map(saved.map((filter) => [filter.id, filter]));
  return pinned.flatMap((filter) => {
    const current = savedById.get(filter.id);
    return current ? [current] : [];
  });
}

export default function TransactionsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const infoCardItems = t("txPage.infoCardItems", { returnObjects: true }) as string[];
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
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionResponseDto | null>(null);
  const [deleteTx, setDeleteTx] = useState<TransactionSummaryDto | null>(null);
  const [deletingTx, setDeletingTx] = useState(false);

  // ── Pagination ──
  const [page, setPage] = useState(1);
  const pageRef = useRef(1);
  const [isServerPaged, setIsServerPaged] = useState(false);
  const isServerPagedRef = useRef(false);
  const [serverTotalPages, setServerTotalPages] = useState(1);

  // ── Quick Access Tabs ──
  // Initialized synchronously from localStorage so they're ready on first render.
  const pinnedFiltersStorageKey = useMemo(() => userScopedStorageKey(PINNED_FILTERS_STORAGE_KEY, user?.id), [user?.id]);
  const activeTabStorageKey = useMemo(() => userScopedStorageKey(ACTIVE_TAB_STORAGE_KEY, user?.id), [user?.id]);
  const [pinnedFilters, setPinnedFilters] = useState<FilterSummaryDto[]>(() => loadPinnedFilters(pinnedFiltersStorageKey));
  const [activeTabId, setActiveTabId] = useState<string | null>(
    () => loadActiveTab(activeTabStorageKey)
  );
  const [allSavedFilters, setAllSavedFilters] = useState<FilterSummaryDto[]>([]);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const addPickerRef = useRef<HTMLDivElement>(null);
  const addPickerDropdownRef = useRef<HTMLDivElement>(null);
  const [addPickerPos, setAddPickerPos] = useState<{ left: number; top: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<TransactionSortField>("date");
  const [sortDir, setSortDir] = useState<TransactionSortDir>("desc");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortBtnRef = useRef<HTMLButtonElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [sortDropdownPos, setSortDropdownPos] = useState<{ left: number; top: number } | null>(null);

  const handleSavedFiltersLoaded = useCallback((saved: FilterSummaryDto[]) => {
    const savedIds = new Set(saved.map((filter) => filter.id));
    setAllSavedFilters(saved);
    setPinnedFilters((prev) => reconcilePinnedFilters(prev, saved));
    setActiveTabId((prev) => (prev && !savedIds.has(prev) ? null : prev));
  }, []);

  useEffect(() => {
    setPinnedFilters(loadPinnedFilters(pinnedFiltersStorageKey));
    setActiveTabId(loadActiveTab(activeTabStorageKey));
  }, [activeTabStorageKey, pinnedFiltersStorageKey]);

  // Fetch all saved filters for the add-to-tabs picker
  useEffect(() => {
    filterService.getAll().then(handleSavedFiltersLoaded).catch(() => {});
    categoryService.getAll().then(setCategories).catch(() => {});
  }, [handleSavedFiltersLoaded]);

  // Close picker on outside click + refresh list when picker opens
  useEffect(() => {
    if (!showAddPicker) return;
    // Refresh so newly-created filters appear without a page reload
    filterService.getAll().then(handleSavedFiltersLoaded).catch(() => {});

    const updatePosition = () => {
      if (!addPickerRef.current) return;
      const rect = addPickerRef.current.getBoundingClientRect();
      const menuWidth = 224; // 14rem
      const viewportPadding = 8;
      const left = Math.min(
        Math.max(rect.left, viewportPadding),
        window.innerWidth - menuWidth - viewportPadding,
      );
      const top = rect.bottom + 8;
      setAddPickerPos({ left, top });
    };
    updatePosition();

    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedTrigger = !!addPickerRef.current?.contains(target);
      const clickedMenu = !!addPickerDropdownRef.current?.contains(target);
      if (!clickedTrigger && !clickedMenu) {
        setShowAddPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [handleSavedFiltersLoaded, showAddPicker]);

  // Sort dropdown — position + outside-click close
  useEffect(() => {
    if (!sortDropdownOpen) return;

    const updatePosition = () => {
      if (!sortBtnRef.current) return;
      const rect = sortBtnRef.current.getBoundingClientRect();
      const menuWidth = 192; // 12rem
      const viewportPadding = 8;
      const left = Math.min(
        Math.max(rect.right - menuWidth, viewportPadding),
        window.innerWidth - menuWidth - viewportPadding,
      );
      setSortDropdownPos({ left, top: rect.bottom + 8 });
    };
    updatePosition();

    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!sortBtnRef.current?.contains(target) && !sortDropdownRef.current?.contains(target)) {
        setSortDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [sortDropdownOpen]);

  // Persist pinned filters
  useEffect(() => {
    localStorage.setItem(pinnedFiltersStorageKey, JSON.stringify(pinnedFilters));
  }, [pinnedFilters, pinnedFiltersStorageKey]);

  // Persist active tab
  useEffect(() => {
    if (activeTabId) localStorage.setItem(activeTabStorageKey, activeTabId);
    else localStorage.removeItem(activeTabStorageKey);
  }, [activeTabId, activeTabStorageKey]);

  // ── Fetch data ──
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchTransactions = useCallback(
    async (
      f: ActiveFilters,
      showLoading: boolean,
      pageIndex: number,
      sortOptions?: { sortBy: TransactionSortField; sortDir: TransactionSortDir },
    ) => {
      if (showLoading) setLoading(true);
      try {
        const effectiveSortBy = sortOptions?.sortBy ?? sortBy;
        const effectiveSortDir = sortOptions?.sortDir ?? sortDir;
        const backendFilters: TransactionFilters = {};
        if (f.type) backendFilters.type = f.type;
        if (f.accountId) backendFilters.accountId = f.accountId;
        if (f.categoryIds && f.categoryIds.length === 1) {
          backendFilters.categoryId = f.categoryIds[0];
        }
        if (f.startDate) backendFilters.startDate = f.startDate;
        if (f.endDate) backendFilters.endDate = f.endDate;
        backendFilters.sortBy = effectiveSortBy;
        backendFilters.sortDir = effectiveSortDir;

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
      [sortBy, sortDir]
  );

  const syncStaleIfNeeded = useCallback(async () => {
    try {
      const now = Date.now();
      const lastRaw = localStorage.getItem(LAST_AUTO_SYNC_KEY);
      const lastSync = lastRaw ? Number(lastRaw) : 0;
      if (Number.isFinite(lastSync) && now - lastSync < AUTO_SYNC_THROTTLE_MS) {
        return;
      }

      // Registramos intento para evitar auto-sync repetido al reabrir la página.
      localStorage.setItem(LAST_AUTO_SYNC_KEY, String(now));

      const result = await bankService.syncStale(15);
      if (result.syncedAccounts > 0) {
        setSyncSummary(
          result.imported > 0
            ? t("txPage.autoSyncWithImported", { count: result.imported })
            : t("txPage.autoSyncDone"),
        );
      }
    } catch {
      // ignore auto-sync errors here; page data still loads afterwards
    }
  }, [t]);

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
        const storedTab = loadActiveTab(activeTabStorageKey);
        const storedPinned = loadPinnedFilters(pinnedFiltersStorageKey);
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

    // Search bar query (toolbar) takes priority, then filter panel's nameQuery
    const query = searchQuery || filters.nameQuery;
    if (query) {
      const q = normalize(query);
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

    const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "amount") {
        cmp = a.amount - b.amount;
      } else if (sortBy === "name") {
        cmp = collator.compare(a.name, b.name);
      } else {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [
    transactions,
    searchQuery,
    filters.nameQuery,
    filters.amountMin,
    filters.amountMax,
    filters.specificDates,
    filters.categoryIds,
    sortBy,
    sortDir,
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

  const handleSyncAll = () => {
    if (syncingAll) return;
    setSyncModalOpen(true);
  };

  const handleSyncConfirm = async (ignoreSyncLimit: boolean) => {
    setSyncModalOpen(false);
    setSyncingAll(true);
    setSyncSummary(null);
    try {
      const result = await bankService.syncAll({ ignoreSyncLimit, lookBackDays: 365 });
      localStorage.setItem(LAST_AUTO_SYNC_KEY, String(Date.now()));
      const summary =
        result.syncedAccounts === 0
          ? t("txPage.syncNoLinkedAccounts")
          : result.imported === 0
            ? t("txPage.syncDoneNoNew", { accounts: result.syncedAccounts })
            : t("txPage.syncDoneWithImported", {
              accounts: result.syncedAccounts,
              imported: result.imported,
            });

      setSyncSummary(
        ignoreSyncLimit
          ? `${summary} ${t("txPage.syncIgnoreLimitTag", "(sin limite por fecha)")}`
          : summary,
      );
      const cp = isServerPagedRef.current ? pageRef.current - 1 : 0;
      await fetchTransactions(filtersRef.current, false, cp);
    } catch {
      setSyncSummary(t("txPage.syncErrorNow"));
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

  const handleDeleteTransaction = async () => {
    if (!deleteTx || deletingTx) return;
    setDeletingTx(true);
    try {
      await transactionService.remove(deleteTx.id, true);
      setDeleteTx(null);
      const cp = isServerPagedRef.current ? pageRef.current - 1 : 0;
      fetchTransactions(filtersRef.current, false, cp);
    } catch {
      // Fail silently
    } finally {
      setDeletingTx(false);
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
    if (!Number.isFinite(newPage)) return;
    const safeTotal = Math.max(1, Number.isFinite(totalPages) ? Math.trunc(totalPages) : 1);
    const safePage = Math.min(Math.max(1, Math.trunc(newPage)), safeTotal);

    pageRef.current = safePage;
    setPage(safePage);
    if (isServerPagedRef.current) {
      fetchTransactions(filtersRef.current, false, safePage - 1);
    }
  };

  const toggleSortDir = () => {
    const nextSortDir: TransactionSortDir = sortDir === "asc" ? "desc" : "asc";
    setSortDir(nextSortDir);
    pageRef.current = 1;
    setPage(1);
    void fetchTransactions(filtersRef.current, true, 0, { sortBy, sortDir: nextSortDir });
  };

  // Clicking a sort option: selects it (asc) or toggles direction if already selected
  const handleSortOptionClick = (field: TransactionSortField) => {
    if (field === sortBy) {
      toggleSortDir();
    } else {
      const nextDir: TransactionSortDir = "asc";
      setSortBy(field);
      setSortDir(nextDir);
      pageRef.current = 1;
      setPage(1);
      void fetchTransactions(filtersRef.current, true, 0, { sortBy: field, sortDir: nextDir });
    }
    // Dropdown stays open after selection - don't close it
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
    const main = `${sign}${tx.amount.toFixed(2)} ${currencyLabel(currency)}`;
    if (tx.originalCurrency && tx.originalCurrency !== currency && tx.originalAmount != null) {
      return `${main} (${sign}${tx.originalAmount.toFixed(2)} ${currencyLabel(tx.originalCurrency)})`;
    }
    return main;
  };

  return (
    <div className="space-y-2">
      <InfoCard
        id="transactions"
        accentColor="violet"
        title={t("txPage.infoCardTitle", "Transactions")}
        items={infoCardItems}
        description={t("txPage.infoCardDescription", "You can also automate changes using rules.")}
      />
      {syncSummary && (
        <ToastBanner
          tone="info"
          message={syncSummary}
          onClose={() => setSyncSummary(null)}
        />
      )}

      {/* ── Hero Header — full-width background ── */}
      <div className="tx-hero-section">
        <div className="tx-hero-inner">
          <div className="tx-hero-title">
            <ArrowLeftRight className="h-7 w-7 text-teal-600" />
            <h1>{t("transactions.title")}</h1>
            <button
              className="tx-sync-btn"
              onClick={handleSyncAll}
              disabled={syncingAll}
              title={syncingAll ? t("txPage.syncingBanks") : t("txPage.syncBanks")}
            >
              {syncingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="tx-hero-row">
            <div className="tx-bento-grid">
              {/* Expense card */}
              <button
                className="tx-bento-card tx-bento-expense"
                onClick={() => setExpenseOpen(true)}
              >
                <div className="tx-bento-icon">
                  <ArrowDownCircle className="h-6 w-6 text-rose-500" />
                </div>
                <div className="tx-bento-text">
                  <p className="tx-bento-card-label">{t("txPage.addEntry")}</p>
                  <p className="tx-bento-card-title">{t("txPage.addExpense")}</p>
                </div>
              </button>

              {/* Income card */}
              <button
                className="tx-bento-card tx-bento-income"
                onClick={() => setIncomeOpen(true)}
              >
                <div className="tx-bento-income-bg" />
                <div className="tx-bento-icon" style={{ position: "relative", zIndex: 1 }}>
                  <ArrowUpCircle className="h-6 w-6 text-white" />
                </div>
                <div className="tx-bento-text" style={{ position: "relative", zIndex: 1 }}>
                  <p className="tx-bento-card-label">{t("txPage.logGrowth")}</p>
                  <p className="tx-bento-card-title">{t("txPage.addIncome")}</p>
                </div>
              </button>
            </div>

            {/* Action buttons — on the right */}
            <div className="tx-hero-actions">
              <button
                className="tx-action-pill"
                onClick={() => navigate(ROUTES.CATEGORIES)}
              >
                <Tag className="h-4 w-4 shrink-0" />
                <span className="tx-action-pill__label">{t("nav.categories")}</span>
              </button>
              <button
                className="tx-action-pill"
                onClick={() => navigate(ROUTES.SCHEDULED_TRANSACTIONS)}
              >
                <CalendarClock className="h-5 w-5 shrink-0" />
                <span className="tx-action-pill__label">{t("scheduled.title")}</span>
              </button>
              <button
                className="tx-action-pill"
                onClick={() => setRulesOpen(true)}
              >
                <ListChecks className="h-4 w-4 shrink-0" />
                <span className="tx-action-pill__label">{t("rules.title")}</span>
              </button>
              <button
                className="tx-action-pill"
                onClick={() => navigate(ROUTES.FILTERS)}
              >
                <ListChecks className="h-4 w-4 shrink-0" />
                <span className="tx-action-pill__label">{t("txPage.savedFilters")}</span>
              </button>
            </div>
          </div>

          {/* ── Toolbar: underlined filter tabs + search + filter dropdown ── */}
          <div className="tx-toolbar">
            <div className="tx-filter-tabs">
              {/* Base tab — always present */}
              <button
                className={`tx-filter-tab ${activeTabId === null ? "tx-filter-tab--active" : ""}`}
                onClick={() => { setActiveTabId(null); setFilters({}); fetchTransactions({}, true, 0); }}
              >
                {t("txPage.baseTab", "Base")}
              </button>

              {pinnedFilters.map((pf) => (
                <div key={pf.id} className="group relative flex items-center gap-1">
                  <button
                    className={`tx-filter-tab ${activeTabId === pf.id ? "tx-filter-tab--active" : ""}`}
                    onClick={() => handleApplySavedFilter(pf.id)}
                  >
                    {pf.name}
                  </button>
                  <button
                    onClick={() => handleRemoveTab(pf.id)}
                    className="text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-slate-500"
                    aria-label={t("txPage.removeFilterTabAria", { name: pf.name })}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {/* Add tab button */}
              <div ref={addPickerRef} className="relative">
                <button
                  onClick={() => setShowAddPicker((v) => !v)}
                  className="tx-add-filter-tab-btn"
                  title={t("txPage.addFilterTab", "Añadir filtro a tabs")}
                >
                  <Plus className="tx-add-filter-tab-btn__icon h-3.5 w-3.5" />
                </button>
                {showAddPicker && addPickerPos && createPortal(
                  <div
                    ref={addPickerDropdownRef}
                    className="tx-filter-dropdown tx-filter-dropdown--floating"
                    style={{ left: `${addPickerPos.left}px`, top: `${addPickerPos.top}px` }}
                  >
                    {allSavedFilters.filter((sf) => !pinnedFilters.some((pf) => pf.id === sf.id)).length === 0 ? (
                      <p className="tx-filter-dropdown-empty">{t("txPage.noMoreFilters", "No hay más filtros")}</p>
                    ) : (
                      allSavedFilters
                        .filter((sf) => !pinnedFilters.some((pf) => pf.id === sf.id))
                        .map((sf) => (
                          <button
                            key={sf.id}
                            className="tx-filter-dropdown-item"
                            onClick={() => {
                              setPinnedFilters((prev) => [...prev, sf]);
                              setShowAddPicker(false);
                            }}
                          >
                            {sf.name}
                          </button>
                        ))
                    )}
                  </div>,
                  document.body,
                )}
              </div>
            </div>

            <div className="tx-toolbar-right">
              <div className="tx-search-wrapper">
                <Search className="h-4 w-4" />
                <input
                  type="text"
                  className="tx-search-input"
                  placeholder={t("txPage.searchPlaceholder", "Search transactions...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <button
                ref={sortBtnRef}
                type="button"
                onClick={() => setSortDropdownOpen((v) => !v)}
                className={`tx-filter-dropdown-btn ${sortDropdownOpen ? "tx-filter-dropdown-btn--active" : ""}`}
                title={t("txPage.sortBy", "Ordenar por")}
                aria-label={t("txPage.sortBy", "Ordenar por")}
              >
                <ArrowUpDown className="h-4 w-4" />
              </button>

              {sortDropdownOpen && sortDropdownPos && createPortal(
                <div
                  ref={sortDropdownRef}
                  className="tx-filter-dropdown tx-filter-dropdown--floating"
                  style={{ left: `${sortDropdownPos.left}px`, top: `${sortDropdownPos.top}px`, width: "12rem" }}
                >
                  {(
                    [
                      { field: "date" as TransactionSortField, label: t("txPage.sortByDate", "Fecha") },
                      { field: "amount" as TransactionSortField, label: t("txPage.sortByAmount", "Importe") },
                      { field: "name" as TransactionSortField, label: t("txPage.sortByName", "Nombre") },
                    ] as { field: TransactionSortField; label: string }[]
                  ).map(({ field, label }) => {
                    const isSelected = sortBy === field;
                    return (
                      <button
                        key={field}
                        className={`tx-filter-dropdown-item tx-sort-option ${isSelected ? "tx-sort-option--active" : ""}`}
                        onClick={() => handleSortOptionClick(field)}
                      >
                        <span>{label}</span>
                        {isSelected && (
                          <ArrowUp
                            className="tx-sort-arrow"
                            style={{ transform: sortDir === "desc" ? "rotate(180deg)" : "rotate(0deg)" }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>,
                document.body,
              )}

              {/* Filter toggle button — opens/closes the filter panel */}
              <button
                className={`tx-filter-dropdown-btn tx-filter-toggle-btn ${filtersOpen ? "tx-filter-dropdown-btn--active tx-filter-toggle-btn--open" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setFiltersOpen((prev) => !prev);
                }}
                title={t("txPage.filterTransactions")}
                aria-expanded={filtersOpen}
              >
                <SlidersHorizontal className="tx-filter-btn-icon h-4 w-4" />
                <ChevronDown className="tx-filter-btn-arrow h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

          {/* Filters — dedicated layer above hero background */}
          <div className="tx-filter-panel-layer">
            <FilterPanel
              key={stateEditFilterId ?? "default"}
              open={filtersOpen}
              onToggle={() => setFiltersOpen(true)}
              hideToggleButton
              onApply={handleApplyFilters}
              defaultAccountId={stateAccountId}
              maxTransactionAmount={maxTxAmount || undefined}
              initialFilters={editInitialFilters}
              editFilterId={stateEditFilterId}
              editFilterName={stateFilterName}
              onUpdated={() => navigate(ROUTES.FILTERS)}
            />
          </div>
      </div>

      {/* Transaction list — pulled up into background gradient */}
      <div className="tx-table-wrapper">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Table header */}
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
                    if (cat?.iconName || tx.categoryName) {
                      return (
                        <IconAvatar
                          iconName={cat?.iconName}
                          iconBgColor={cat?.iconBgColor}
                          fallbackText={cat?.name ?? tx.categoryName}
                          className="tx-cat-icon flex-shrink-0"
                          iconClassName="text-[11px]"
                        />
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
                    onClick={() => setDeleteTx(tx)}
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
      </div>{/* /tx-table-wrapper */}

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

      <SyncModal
        open={syncModalOpen}
        onConfirm={handleSyncConfirm}
        onCancel={() => setSyncModalOpen(false)}
        loading={syncingAll}
      />

      {deleteTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/35 backdrop-blur-sm"
            onClick={() => {
              if (!deletingTx) setDeleteTx(null);
            }}
          />

          <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">{t("txPage.deleteTransaction")}</h3>
                <p className="mt-1 text-sm text-slate-500">{t("transactions.deleteConfirm")}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTx(null)}
                disabled={deletingTx}
                className="btn-cancel-draw flex-1 justify-center disabled:opacity-60"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeleteTransaction}
                disabled={deletingTx}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingTx && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
