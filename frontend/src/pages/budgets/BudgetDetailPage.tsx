import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  Pencil,
  PiggyBank,
  Plus,
  Save,
  Trash2,
  X,
  Link2,
  Unlink,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { FieldError } from "@/components/ui/field-error";
import type {
  BudgetResponseDto,
  BudgetCategoryResponseDto,
  CategorySummaryDto,
} from "@/types";
import { budgetService } from "@/backend/budgetService";
import { categoryService } from "@/backend/categoryService";
import { transactionService } from "@/backend/transactionService";
import type { TransactionSummaryDto } from "@/types";

const MAX_CATEGORIES = 40;

// ── Formatting ──────────────────────────────────────────────────────
const _nf = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
function fmtAmt(n: number) {
  return `${_nf.format(n)} EUR`;
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ── Usage color helper ──────────────────────────────────────────────
function usageColor(pct: number) {
  if (pct <= 20) return { text: "text-blue-500", bar: "budget-bar-blue", bg: "budget-bg-blue" };
  if (pct <= 45) return { text: "text-emerald-500", bar: "budget-bar-green", bg: "budget-bg-green" };
  if (pct <= 65) return { text: "text-yellow-500", bar: "budget-bar-yellow", bg: "budget-bg-yellow" };
  if (pct <= 85) return { text: "text-orange-500", bar: "budget-bar-orange", bg: "budget-bg-orange" };
  return { text: "text-red-500", bar: "budget-bar-red", bg: "budget-bg-red" };
}

function strokeColorFromPct(pct: number): string {
  if (pct <= 20) return "#3b82f6";
  if (pct <= 45) return "#22c55e";
  if (pct <= 65) return "#eab308";
  if (pct <= 85) return "#f97316";
  return "#ef4444";
}

function statusLabel(pct: number, t: (k: string) => string): string {
  if (pct <= 40) return t("budgets.detail.statusHealthy");
  if (pct <= 65) return t("budgets.detail.statusStable");
  if (pct <= 80) return t("budgets.detail.statusApproaching");
  if (pct <= 95) return t("budgets.detail.statusWarning");
  return t("budgets.detail.statusCritical");
}

// ── Category form dialog ────────────────────────────────────────────

interface CategoryFormDialogProps {
  open: boolean;
  budgetId: string;
  initial?: BudgetCategoryResponseDto | null;
  allCategories: CategorySummaryDto[];
  onClose: () => void;
  onSaved: () => void;
}

function CategoryFormDialog({
  open, budgetId, initial, allCategories, onClose, onSaved,
}: CategoryFormDialogProps) {
  const { t } = useTranslation();
  const isEdit = !!initial;

  const [name, setName] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(new Set());
  const [catSearch, setCatSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setMaxAmount(initial ? String(initial.maxAmount) : "");
      setSelectedCatIds(
        new Set(initial?.linkedCategories?.map((c) => c.id) ?? [])
      );
      setCatSearch("");
      setNameError("");
      setAmountError("");
      setFormError("");
    }
  }, [open, initial]);

  // Only show EXPENSE categories
  const expenseCategories = useMemo(
    () => allCategories.filter((c) => c.type === "EXPENSE"),
    [allCategories],
  );

  const filteredCategories = useMemo(() => {
    const q = catSearch.toLowerCase().trim();
    if (!q) return expenseCategories;
    return expenseCategories.filter((c) => c.name.toLowerCase().includes(q));
  }, [expenseCategories, catSearch]);

  const toggleCategory = (id: string) => {
    setSelectedCatIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(maxAmount);
    setNameError("");
    setAmountError("");
    setFormError("");

    if (!name.trim()) { setNameError(t("budgets.errors.nameRequired")); return; }
    if (isNaN(amount) || amount <= 0) { setAmountError(t("budgets.errors.amountPositive")); return; }

    setLoading(true);
    try {
      const linkedCategoryIds = Array.from(selectedCatIds);
      if (isEdit && initial) {
        await budgetService.updateCategory(budgetId, initial.id, {
          name: name.trim(),
          maxAmount: amount,
          linkedCategoryIds,
        });
      } else {
        await budgetService.createCategory(budgetId, {
          name: name.trim(),
          maxAmount: amount,
          linkedCategoryIds,
        });
      }
      onSaved();
    } catch {
      setFormError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            {isEdit ? t("budgets.detail.editCategory") : t("budgets.detail.addCategory")}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">
              {t("budgets.detail.categoryName")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder={t("budgets.detail.categoryNamePlaceholder")}
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              required
            />
            <FieldError message={nameError} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">
              {t("budgets.detail.maxAmount")}
            </label>
            <div className="relative">
              <input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                min="0.01"
                step="0.01"
                placeholder="0.00"
                className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 pr-10 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                required
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">EUR</span>
            </div>
            <FieldError message={amountError} />
          </div>

          {/* Linked categories */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500">
              {t("budgets.detail.linkedCategories")}
            </label>
            <p className="text-[11px] text-slate-400">
              {t("budgets.detail.linkedCategoriesDesc")}
            </p>
            <input
              type="text"
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              placeholder={t("budgets.detail.searchCategory")}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
            <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-1.5">
              {filteredCategories.length === 0 ? (
                <p className="p-2 text-center text-xs text-slate-400">{t("common.noResults")}</p>
              ) : (
                filteredCategories.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCatIds.has(c.id)}
                      onChange={() => toggleCategory(c.id)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-sky-500 focus:ring-sky-200"
                    />
                    <span className="text-slate-700">{c.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {formError && <FieldError message={formError} />}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-cancel-draw flex-1 justify-center">
              {t("common.cancel")}
            </button>
            <button type="submit" disabled={loading} className="squishy-save-simple flex-1 justify-center">
              {loading ? <Loader2 className="squishy-save-icon h-4 w-4 animate-spin" /> : <Save className="squishy-save-icon h-4 w-4" />}
              {t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add transaction dialog ──────────────────────────────────────────

interface AddTransactionDialogProps {
  open: boolean;
  budgetId: string;
  categoryId: string;
  existingTxIds: Set<string>;
  onClose: () => void;
  onLinked: () => void;
}

function AddTransactionDialog({
  open, budgetId, categoryId, existingTxIds, onClose, onLinked,
}: AddTransactionDialogProps) {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<TransactionSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [linking, setLinking] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSearchTerm("");
    transactionService.getAll({ type: "EXPENSE" }, 0, 500)
      .then((page) => setTransactions(page.content))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const available = transactions.filter((tx) => !existingTxIds.has(tx.id));
    if (!q) return available.slice(0, 50);
    return available.filter((tx) => tx.name.toLowerCase().includes(q)).slice(0, 50);
  }, [transactions, searchTerm, existingTxIds]);

  const handleLink = async (txId: string) => {
    setLinking(txId);
    try {
      await budgetService.linkTransaction(budgetId, categoryId, txId);
      onLinked();
    } catch { /* ignore */ }
    setLinking(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[80vh] flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            {t("budgets.detail.addTransaction")}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t("txPage.searchByNamePlaceholder")}
          className="mb-3 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        />

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">{t("common.noResults")}</p>
          ) : (
            <div className="space-y-1">
              {filtered.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">{tx.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {tx.date} · {tx.categoryName ?? t("transactions.noCategory")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className="text-sm font-semibold tabular-nums text-slate-700">
                      {fmtAmt(tx.amount)}
                    </span>
                    <button
                      onClick={() => handleLink(tx.id)}
                      disabled={linking === tx.id}
                      className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-100 disabled:opacity-50"
                    >
                      {linking === tx.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Link2 className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Category row ────────────────────────────────────────────────────

interface CategoryRowProps {
  cat: BudgetCategoryResponseDto;
  budgetId: string;
  onEdit: (c: BudgetCategoryResponseDto) => void;
  onDelete: (c: BudgetCategoryResponseDto) => void;
  onRefresh: () => void;
}

function CategoryRow({ cat, budgetId, onEdit, onDelete, onRefresh }: CategoryRowProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [addTxOpen, setAddTxOpen] = useState(false);
  const [unlinking, setUnlinking] = useState<string | null>(null);

  const pct = Math.min(100, Math.max(0, cat.usagePercent));
  const colors = usageColor(pct);
  const label = statusLabel(pct, t);

  const existingTxIds = useMemo(
    () => new Set(cat.transactions.map((tx) => tx.id)),
    [cat.transactions],
  );

  const handleUnlink = async (txId: string) => {
    setUnlinking(txId);
    try {
      await budgetService.unlinkTransaction(budgetId, cat.id, txId);
      onRefresh();
    } catch { /* ignore */ }
    setUnlinking(null);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Header — collapsible */}
      <div
        className="budget-cat-toggle flex items-center gap-3 px-5 py-4"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
        )}

        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors.bg}`}>
          <PiggyBank className={`h-4 w-4 ${colors.text}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-800 truncate">{cat.name}</p>
            <span className="text-[10px] text-slate-400">
              {fmtAmt(cat.spent)} / {fmtAmt(cat.maxAmount)}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 h-1.5 w-full max-w-xs rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-bold ${colors.text}`}>{pct.toFixed(0)}%</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${colors.bg} ${colors.text}`}>
            {label}
          </span>
        </div>

        {/* Edit / delete */}
        <div className="flex items-center gap-0.5 ml-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onEdit(cat)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              if (!deleteConfirm) { setDeleteConfirm(true); return; }
              onDelete(cat);
              setDeleteConfirm(false);
            }}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="flex items-center justify-between border-t border-slate-100 bg-red-50/60 px-5 py-2">
          <p className="text-xs text-red-600 font-medium">{t("budgets.detail.deleteConfirm")}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteConfirm(false)}
              className="rounded px-3 py-1 text-xs text-slate-600 hover:bg-white"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={() => { onDelete(cat); setDeleteConfirm(false); }}
              className="rounded bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
            >
              {t("common.delete")}
            </button>
          </div>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 pb-4 pt-3 space-y-3">
          {/* Linked categories pills */}
          {cat.linkedCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {cat.linkedCategories.map((lc) => (
                <span
                  key={lc.id}
                  className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-600"
                >
                  {lc.name}
                </span>
              ))}
            </div>
          )}

          {/* Transactions list */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">
              {t("budgets.detail.transactions")} ({cat.transactions.length})
            </p>
            <button
              onClick={() => setAddTxOpen(true)}
              className="flex items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
            >
              <Plus className="h-3 w-3" />
              {t("budgets.detail.addTransaction")}
            </button>
          </div>

          {cat.transactions.length === 0 ? (
            <p className="py-3 text-center text-xs text-slate-400">
              {t("budgets.detail.noTransactions")}
            </p>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {cat.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm text-slate-700">{tx.name}</p>
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                        tx.manual
                          ? "bg-amber-50 text-amber-600"
                          : "bg-sky-50 text-sky-600"
                      }`}>
                        {tx.manual ? t("budgets.detail.manualTag") : t("budgets.detail.autoTag")}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {tx.date} {tx.categoryName && `· ${tx.categoryName}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className="text-sm font-semibold tabular-nums text-slate-700">
                      {fmtAmt(tx.amount)}
                    </span>
                    {tx.manual && (
                      <button
                        onClick={() => handleUnlink(tx.id)}
                        disabled={unlinking === tx.id}
                        className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                        title="Unlink"
                      >
                        {unlinking === tx.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Unlink className="h-3 w-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <AddTransactionDialog
            open={addTxOpen}
            budgetId={budgetId}
            categoryId={cat.id}
            existingTxIds={existingTxIds}
            onClose={() => setAddTxOpen(false)}
            onLinked={() => { setAddTxOpen(false); onRefresh(); }}
          />
        </div>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────

export default function BudgetDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { budgetId } = useParams<{ budgetId: string }>();

  const [budget, setBudget] = useState<BudgetResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategorySummaryDto[]>([]);
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [editCat, setEditCat] = useState<BudgetCategoryResponseDto | null>(null);

  const fetchBudget = useCallback(async (showLoading = true) => {
    if (!budgetId) return;
    if (showLoading) setLoading(true);
    try {
      setBudget(await budgetService.getById(budgetId));
    } catch {
      setBudget(null);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [budgetId]);

  useEffect(() => {
    fetchBudget();
    categoryService.getAll().then(setCategories).catch(() => setCategories([]));
    const interval = setInterval(() => fetchBudget(false), 30_000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchBudget(false);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchBudget]);

  const handleCatSaved = () => {
    setCatFormOpen(false);
    setEditCat(null);
    fetchBudget();
  };

  const handleDeleteCategory = async (cat: BudgetCategoryResponseDto) => {
    if (!budgetId) return;
    try { await budgetService.deleteCategory(budgetId, cat.id); } catch { /* ignore */ }
    fetchBudget();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (!budget || !budgetId) {
    return (
      <div className="py-16 text-center">
        <p className="text-slate-400">{t("common.error")}</p>
        <button
          onClick={() => navigate("/budgets")}
          className="mt-4 text-sm text-sky-500 hover:underline"
        >
          {t("budgets.detail.backToList")}
        </button>
      </div>
    );
  }

  const pct = Math.min(100, Math.max(0, budget.usagePercent));
  const colors = usageColor(pct);
  const canAddCat = (budget.categories?.length ?? 0) < MAX_CATEGORIES;

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div className="rounded-xl bg-white px-5 py-4">
        <button
          onClick={() => navigate("/budgets")}
          className="mb-3 flex items-center gap-1.5 text-sm text-slate-400 hover:text-sky-500 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("budgets.detail.backToList")}
        </button>

        <PageHeader
          left={<PiggyBank className="h-8 w-8 text-sky-500" />}
          title={budget.name}
          subtitle={
            <p className="text-sm text-slate-400">
              {t(`budgets.periodicities.${budget.periodicity}`)} ·{" "}
              {formatDate(budget.periodStart)} — {formatDate(budget.periodEnd)}
            </p>
          }
          actions={
            <button
              onClick={() => { setEditCat(null); setCatFormOpen(true); }}
              disabled={!canAddCat}
              className="budget-new-btn"
            >
              <Plus className="budget-new-icon h-4 w-4" />
              {t("budgets.detail.addCategory")}
            </button>
          }
        />

        {/* Summary cards */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {/* Usage circle */}
          <div className="flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>
              <svg width="80" height="80" className="-rotate-90">
                <circle cx="40" cy="40" r="32" fill="none" stroke="#f1f5f9" strokeWidth="7" />
                <circle
                  cx="40" cy="40" r="32" fill="none"
                  strokeWidth="7" strokeLinecap="round"
                  stroke={strokeColorFromPct(pct)}
                  strokeDasharray={2 * Math.PI * 32}
                  strokeDashoffset={2 * Math.PI * 32 - (pct / 100) * 2 * Math.PI * 32}
                  style={{ transition: "stroke-dashoffset 1s ease, stroke 1s ease" }}
                />
              </svg>
              <span className={`absolute text-lg font-extrabold ${colors.text}`}>
                {pct.toFixed(0)}%
              </span>
            </div>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {t("budgets.usagePercent")}
            </span>
          </div>

          {/* Total spent */}
          <div className="flex flex-col justify-center rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {t("budgets.totalSpent")}
            </p>
            <p className="mt-1 text-xl font-extrabold tabular-nums text-slate-800">
              {fmtAmt(budget.totalSpent)}
            </p>
          </div>

          {/* Remaining */}
          <div className="flex flex-col justify-center rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {t("budgets.totalRemaining")}
            </p>
            <p className={`mt-1 text-xl font-extrabold tabular-nums ${budget.totalRemaining >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {fmtAmt(budget.totalRemaining)}
            </p>
          </div>

          {/* Previous period */}
          <div className="flex flex-col justify-center rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {t("budgets.prevPeriod")}
            </p>
            <p className="mt-1 text-xl font-extrabold tabular-nums text-slate-800">
              {fmtAmt(budget.prevTotalSpent)}
            </p>
            <p className="text-[10px] text-slate-400">
              {t("budgets.detail.of")} {fmtAmt(budget.prevTotalBudget)}
            </p>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {budget.categories.map((cat) => (
          <CategoryRow
            key={cat.id}
            cat={cat}
            budgetId={budgetId}
            onEdit={(c) => { setEditCat(c); setCatFormOpen(true); }}
            onDelete={handleDeleteCategory}
            onRefresh={() => fetchBudget(false)}
          />
        ))}

        {canAddCat && (
          <button
            className="budget-add-category w-full"
            onClick={() => { setEditCat(null); setCatFormOpen(true); }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-current">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold">{t("budgets.detail.addCategory")}</span>
          </button>
        )}

        {budget.categories.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            {t("budgets.detail.noCategories")}
          </div>
        )}
      </div>

      <CategoryFormDialog
        open={catFormOpen}
        budgetId={budgetId}
        initial={editCat}
        allCategories={categories}
        onClose={() => { setCatFormOpen(false); setEditCat(null); }}
        onSaved={handleCatSaved}
      />
    </div>
  );
}
