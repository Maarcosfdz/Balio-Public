import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Bookmark,
  Loader2,
  Plus,
  RefreshCw,
  Tag,
} from "lucide-react";
import type {
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

  // ── Fetch data ──
  const fetchTransactions = useCallback(
    async (f: ActiveFilters = filters) => {
      setLoading(true);
      try {
        // Build backend-compatible filters (backend supports type, accountId, categoryId, startDate, endDate)
        const backendFilters: TransactionFilters = {};
        if (f.type) backendFilters.type = f.type;
        if (f.accountId) backendFilters.accountId = f.accountId;
        if (f.categoryId) backendFilters.categoryId = f.categoryId;
        if (f.startDate) backendFilters.startDate = f.startDate;
        if (f.endDate) backendFilters.endDate = f.endDate;

        const data = await transactionService.getAll(backendFilters);
        setTransactions(data);
        setPage(1);
      } catch {
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    if (stateFilterId) {
      handleApplySavedFilter(stateFilterId);
    } else {
      fetchTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Client-side extra filtering (name, amount range) ──
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

    // Sort newest first
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [transactions, filters.nameQuery, filters.amountMin, filters.amountMax]);

  const totalPages = Math.max(1, Math.ceil(displayedTransactions.length / PAGE_SIZE));
  const paged = displayedTransactions.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  // ── Handlers ──
  const handleApplyFilters = (f: ActiveFilters) => {
    setFilters(f);
    fetchTransactions(f);
  };

  const handleApplySavedFilter = async (filterId: string) => {
    setLoading(true);
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
    fetchTransactions();
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
        <h1 className="text-3xl font-bold text-slate-800">
          {t("transactions.title")}
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTransactions()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate(ROUTES.CATEGORIES)}
            title={t("nav.categories")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">{t("nav.categories")}</span>
          </button>
          <button
            onClick={() => navigate(ROUTES.FILTERS)}
            title={t("nav.filters")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline">{t("nav.filters")}</span>
          </button>
          <button
            onClick={() => setExpenseOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600"
          >
            <Plus className="h-4 w-4" />
            {t("txPage.addExpense")}
          </button>
          <button
            onClick={() => setIncomeOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
          >
            <Plus className="h-4 w-4" />
            {t("txPage.addIncome")}
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
      />

      {/* Transaction list */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Table header */}
        <div className="hidden grid-cols-12 gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:grid">
          <div className="col-span-1">{t("transactions.type")}</div>
          <div className="col-span-4">{t("txPage.name")}</div>
          <div className="col-span-3">{t("txPage.date")}</div>
          <div className="col-span-4 text-right">{t("transactions.amount")}</div>
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
                className="grid grid-cols-12 items-center gap-4 px-5 py-3 transition hover:bg-slate-50/60"
              >
                {/* Icon */}
                <div className="col-span-1 flex items-center">
                  {tx.type === "EXPENSE" ? (
                    <ArrowDownCircle className="h-5 w-5 text-red-400" />
                  ) : (
                    <ArrowUpCircle className="h-5 w-5 text-emerald-400" />
                  )}
                </div>

                {/* Name */}
                <div className="col-span-4 truncate text-sm font-medium text-slate-700">
                  {tx.name}
                </div>

                {/* Date */}
                <div className="col-span-3 text-sm text-slate-500">
                  {formatDate(tx.date)}
                </div>

                {/* Amount */}
                <div
                  className={`col-span-4 text-right text-sm font-semibold ${
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
