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
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
  Link2,
  Unlink,
} from "lucide-react";
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
import { IconAvatar } from "@/components/icons/IconAvatar";
import { IconPicker } from "@/components/icons/IconPicker";
import MultiSelectDropdown from "@/components/ui/MultiSelectDropdown";
import { GradientButton } from "@/components/ui/gradient-button";
import Pagination from "@/components/ui/Pagination";
import {
  DEFAULT_ICON_BG_COLOR,
  normalizeIconBgColor,
  resolveEntityIconName,
} from "@/components/icons/iconRegistry";
import { suggestIconNameFromText } from "@/components/icons/iconSuggestions";

const MAX_CATEGORIES = 40;
const TX_FETCH_PAGE_SIZE = 200;
const CATEGORY_TX_PAGE_SIZE = 10;
const BUDGET_TX_PAGE_SIZE = 10;

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

function ViewAllArrowIcon() {
  return (
    <svg
      className="db-view-all-arrow"
      viewBox="0 0 24 12"
      aria-hidden="true"
      focusable="false"
    >
      <path className="one" d="M2 2 L7 6 L2 10" />
      <path className="two" d="M9 2 L14 6 L9 10" />
      <path className="three" d="M16 2 L21 6 L16 10" />
    </svg>
  );
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

function hasPreviousPeriodData(prevTotalBudget: number, prevTotalSpent: number): boolean {
  return prevTotalBudget > 0 || prevTotalSpent > 0;
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
  const [iconName, setIconName] = useState("");
  const [iconBgColor, setIconBgColor] = useState(DEFAULT_ICON_BG_COLOR);
  const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setMaxAmount(initial ? String(initial.maxAmount) : "");
      setIconName(resolveEntityIconName(initial?.iconName, initial?.name ?? "category"));
      setIconBgColor(normalizeIconBgColor(initial?.iconBgColor, DEFAULT_ICON_BG_COLOR));
      setSelectedCatIds(
        new Set(initial?.linkedCategories?.map((c) => c.id) ?? [])
      );
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

  const defaultIconName = useMemo(
    () => suggestIconNameFromText(name || initial?.name || "category"),
    [name, initial?.name],
  );

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
          iconName,
          iconBgColor,
        });
      } else {
        await budgetService.createCategory(budgetId, {
          name: name.trim(),
          maxAmount: amount,
          linkedCategoryIds,
          iconName,
          iconBgColor,
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
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
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

          <IconPicker
            iconName={iconName}
            iconBgColor={iconBgColor}
            defaultIconName={defaultIconName}
            defaultIconBgColor={DEFAULT_ICON_BG_COLOR}
            onChange={(value) => {
              setIconName(value.iconName);
              setIconBgColor(value.iconBgColor);
            }}
          />

          {/* Linked categories */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500">
              {t("budgets.detail.linkedCategories")}
            </label>
            <p className="text-[11px] text-slate-400">
              {t("budgets.detail.linkedCategoriesDesc")}
            </p>
            <MultiSelectDropdown
              value={Array.from(selectedCatIds)}
              onChange={(ids) => setSelectedCatIds(new Set(ids))}
              options={expenseCategories.map((c) => ({ value: c.id, label: c.name }))}
              placeholder={t("txPage.allCategories")}
              searchPlaceholder={t("budgets.detail.searchCategory")}
              emptyText={t("common.noResults")}
              buttonClassName="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          {formError && <FieldError message={formError} />}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-cancel-draw flex-1 justify-center">
              {t("common.cancel")}
            </button>
            <GradientButton
              type="submit"
              disabled={loading}
              weight="normal"
              iconVariant={loading ? "none" : "other"}
              icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              className="flex-1 justify-center"
            >
              {t("common.save")}
            </GradientButton>
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
    let cancelled = false;
    const stateResetTimer = window.setTimeout(() => {
      setLoading(true);
      setSearchTerm("");
    }, 0);

    const fetchAllExpenseTransactions = async () => {
      try {
        const allTransactions: TransactionSummaryDto[] = [];
        let pageIndex = 0;
        let totalPages = 1;

        while (pageIndex < totalPages) {
          const page = await transactionService.getAll(
            { type: "EXPENSE" },
            pageIndex,
            TX_FETCH_PAGE_SIZE,
          );
          allTransactions.push(...page.content);
          totalPages = Math.max(totalPages, page.totalPages);
          pageIndex += 1;
        }

        if (!cancelled) setTransactions(allTransactions);
      } catch {
        if (!cancelled) setTransactions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchAllExpenseTransactions();
    return () => {
      cancelled = true;
      window.clearTimeout(stateResetTimer);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const available = transactions.filter((tx) => !existingTxIds.has(tx.id));
    if (!q) return available;
    return available.filter((tx) => tx.name.toLowerCase().includes(q));
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
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
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
  const [txSearchTerm, setTxSearchTerm] = useState("");
  const [txPage, setTxPage] = useState(1);

  const rawPct = Math.max(0, cat.usagePercent);
  const progressPct = Math.min(100, rawPct);
  const colors = usageColor(rawPct);
  const label = statusLabel(rawPct, t);
  const iconName = resolveEntityIconName(cat.iconName, cat.name);
  const iconBgColor = normalizeIconBgColor(cat.iconBgColor, DEFAULT_ICON_BG_COLOR);

  const existingTxIds = useMemo(
    () => new Set(cat.transactions.map((tx) => tx.id)),
    [cat.transactions],
  );

  const filteredTransactions = useMemo(() => {
    const q = txSearchTerm.toLowerCase().trim();
    if (!q) return cat.transactions;
    return cat.transactions.filter((tx) => tx.name.toLowerCase().includes(q));
  }, [cat.transactions, txSearchTerm]);

  const txTotalPages = Math.max(1, Math.ceil(filteredTransactions.length / CATEGORY_TX_PAGE_SIZE));
  const safeTxPage = Math.min(txPage, txTotalPages);

  const visibleTransactions = useMemo(() => {
    const start = (safeTxPage - 1) * CATEGORY_TX_PAGE_SIZE;
    return filteredTransactions.slice(start, start + CATEGORY_TX_PAGE_SIZE);
  }, [filteredTransactions, safeTxPage]);

  const handleUnlink = async (txId: string) => {
    setUnlinking(txId);
    try {
      await budgetService.unlinkTransaction(budgetId, cat.id, txId);
      onRefresh();
    } catch { /* ignore */ }
    setUnlinking(null);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <IconAvatar
            iconName={iconName}
            iconBgColor={iconBgColor}
            fallbackText={cat.name}
            className="h-10 w-10 rounded-xl"
            iconClassName="h-4 w-4"
          />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-800">{cat.name}</p>
            <p className="text-[11px] text-slate-400">
              {fmtAmt(cat.spent)} / {fmtAmt(cat.maxAmount)}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${colors.bg} ${colors.text}`}>
          {label}
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-500">{rawPct.toFixed(0)}% {t("budgets.usagePercent")}</span>
          <span className={`font-semibold ${colors.text}`}>{fmtAmt(cat.remaining)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          onClick={() => {
            setExpanded((v) => !v);
            setTxPage(1);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "" : "-rotate-90"}`} />
          {t("budgets.detail.transactions")} ({cat.transactions.length})
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEdit(cat)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-sky-50 hover:text-sky-600"
            aria-label={t("common.edit")}
          >
            <Pencil className="btn-edit-icon h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDeleteConfirm((v) => !v)}
            className="btn-delete-icon"
            aria-label={t("common.delete")}
          >
            <Trash2 className="btn-delete-icon__icon h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {deleteConfirm && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-red-50/60 px-3 py-2">
          <p className="text-xs text-red-600 font-medium">{t("budgets.detail.deleteConfirm")}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteConfirm(false)}
              className="rounded px-2.5 py-1 text-xs text-slate-600 hover:bg-white"
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

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
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

          <input
            type="text"
            value={txSearchTerm}
            onChange={(e) => {
              setTxSearchTerm(e.target.value);
              setTxPage(1);
            }}
            placeholder={t("txPage.searchByNamePlaceholder")}
            className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />

          {filteredTransactions.length === 0 ? (
            <p className="py-3 text-center text-xs text-slate-400">
              {txSearchTerm ? t("common.noResults") : t("budgets.detail.noTransactions")}
            </p>
          ) : (
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {visibleTransactions.map((tx) => (
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
                    <button
                      onClick={() => handleUnlink(tx.id)}
                      disabled={unlinking === tx.id}
                      className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                      title={t("budgets.detail.removeFromCategory")}
                    >
                      {unlinking === tx.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Unlink className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredTransactions.length > 0 && txTotalPages > 1 && (
            <Pagination
              currentPage={safeTxPage}
              totalPages={txTotalPages}
              onPageChange={setTxPage}
            />
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
  const [budgetTxPage, setBudgetTxPage] = useState(1);

  const allBudgetTransactions = useMemo(() => {
    if (!budget) return [] as Array<TransactionSummaryDto & { budgetCategoryName: string }>;

    const unique = new Map<string, TransactionSummaryDto & { budgetCategoryName: string }>();

    for (const cat of budget.categories) {
      for (const tx of cat.transactions) {
        if (!unique.has(tx.id)) {
            unique.set(tx.id, {
            id: tx.id,
            name: tx.name,
            amount: tx.amount,
            date: tx.date,
            type: "EXPENSE",
              categoryName: tx.categoryName ?? undefined,
            budgetCategoryName: cat.name,
          });
        }
      }
    }

    return Array.from(unique.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [budget]);

  const budgetTxTotalPages = Math.max(1, Math.ceil(allBudgetTransactions.length / BUDGET_TX_PAGE_SIZE));

  const visibleBudgetTransactions = useMemo(() => {
    const start = (budgetTxPage - 1) * BUDGET_TX_PAGE_SIZE;
    return allBudgetTransactions.slice(start, start + BUDGET_TX_PAGE_SIZE);
  }, [allBudgetTransactions, budgetTxPage]);

  useEffect(() => {
    setBudgetTxPage(1);
  }, [budget?.id]);

  useEffect(() => {
    if (budgetTxPage > budgetTxTotalPages) setBudgetTxPage(budgetTxTotalPages);
  }, [budgetTxPage, budgetTxTotalPages]);

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

  const rawPct = Math.max(0, budget.usagePercent);
  const progressPct = Math.min(100, rawPct);
  const colors = usageColor(rawPct);
  const canAddCat = (budget.categories?.length ?? 0) < MAX_CATEGORIES;
  const usageLabel = statusLabel(rawPct, t);
  const hasPrevData = hasPreviousPeriodData(budget.prevTotalBudget, budget.prevTotalSpent);
  const budgetIconName = resolveEntityIconName(budget.iconName, budget.name);
  const budgetIconBgColor = normalizeIconBgColor(budget.iconBgColor, DEFAULT_ICON_BG_COLOR);
  const leadingCategory = budget.categories.reduce<BudgetCategoryResponseDto | null>((lead, current) => {
    if (!lead || current.usagePercent > lead.usagePercent) return current;
    return lead;
  }, null);

  return (
    <div className="budget-detail-page-enter space-y-6">
      <div className="budget-detail-hero-card rounded-2xl border border-slate-200 bg-white p-5">
        <button
          onClick={() => navigate("/budgets")}
          className="mb-4 flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-sky-500"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("budgets.detail.backToList")}
        </button>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="flex items-center justify-center lg:col-span-4">
            <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
              <svg width="220" height="220" className="-rotate-90">
                <circle cx="110" cy="110" r="86" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                <circle
                  cx="110"
                  cy="110"
                  r="86"
                  fill="none"
                  strokeWidth="12"
                  strokeLinecap="round"
                  stroke={strokeColorFromPct(rawPct)}
                  strokeDasharray={2 * Math.PI * 86}
                  strokeDashoffset={2 * Math.PI * 86 - (progressPct / 100) * 2 * Math.PI * 86}
                  style={{ transition: "stroke-dashoffset 1s ease, stroke 1s ease" }}
                />
              </svg>
              <div className="absolute text-center">
                <p className={`text-5xl font-extrabold tabular-nums ${colors.text}`}>{rawPct.toFixed(0)}%</p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {t("budgets.usagePercent")}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <IconAvatar
                    iconName={budgetIconName}
                    iconBgColor={budgetIconBgColor}
                    fallbackText={budget.name}
                    className="h-9 w-9 rounded-xl"
                    iconClassName="h-5 w-5"
                  />
                  <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">{budget.name}</h1>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {t(`budgets.periodicities.${budget.periodicity}`)} · {formatDate(budget.periodStart)} — {formatDate(budget.periodEnd)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setEditCat(null); setCatFormOpen(true); }}
                disabled={!canAddCat}
                className="db-view-all budget-detail-view-all-btn"
              >
                {t("budgets.detail.addCategory")} <ViewAllArrowIcon />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t("budgets.totalSpent")}</p>
                <p className="mt-1 text-3xl font-extrabold tabular-nums text-slate-900">{fmtAmt(budget.totalSpent)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t("budgets.totalRemaining")}</p>
                <p className={`mt-1 text-3xl font-extrabold tabular-nums ${budget.totalRemaining >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {fmtAmt(budget.totalRemaining)}
                </p>
                <p className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${colors.bg} ${colors.text}`}>
                  {usageLabel}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t("budgets.prevPeriod")}</p>
                {hasPrevData ? (
                  <>
                    <p className="mt-1 text-3xl font-extrabold tabular-nums text-slate-900">{fmtAmt(budget.prevTotalSpent)}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {t("budgets.detail.of")} {fmtAmt(budget.prevTotalBudget)}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-lg font-bold text-slate-500">{t("common.noData")}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{t("budgets.categories")}</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {budget.categories.length}/{MAX_CATEGORIES}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
              className="app-add-dashed flex min-h-[228px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white text-slate-400 transition hover:border-sky-300 hover:bg-sky-50/40 hover:text-sky-500"
              onClick={() => { setEditCat(null); setCatFormOpen(true); }}
            >
              <div className="app-add-dashed-ring flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-current">
                <Plus className="h-6 w-6" />
              </div>
              <span className="text-sm font-semibold">{t("budgets.detail.addCategory")}</span>
            </button>
          )}
        </div>

        {budget.categories.length === 0 && (
          <div className="py-6 text-center text-slate-400">{t("budgets.detail.noCategories")}</div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="budget-detail-summary-card rounded-2xl p-5 lg:col-span-8">
          <p className="budget-detail-summary-eyebrow text-xs font-semibold uppercase tracking-widest">{t("budgets.title")}</p>
          {leadingCategory ? (
            <>
              <p className="mt-3 text-xl font-bold text-slate-900">{leadingCategory.name}</p>
              <p className="budget-detail-summary-sub mt-1 text-sm">
                {leadingCategory.usagePercent.toFixed(0)}% {t("budgets.usagePercent")} · {statusLabel(leadingCategory.usagePercent, t)}
              </p>
            </>
          ) : (
            <p className="budget-detail-summary-sub mt-3 text-sm">{t("budgets.detail.noCategories")}</p>
          )}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="budget-detail-summary-stat rounded-xl px-3 py-2">
              <p className="budget-detail-summary-stat-label text-[10px] uppercase tracking-widest">{t("budgets.totalRemaining")}</p>
              <p className="text-xl font-bold tabular-nums text-slate-900">{fmtAmt(budget.totalRemaining)}</p>
            </div>
            <div className="budget-detail-summary-stat rounded-xl px-3 py-2">
              <p className="budget-detail-summary-stat-label text-[10px] uppercase tracking-widest">{t("budgets.totalBudget")}</p>
              <p className="text-xl font-bold tabular-nums text-slate-900">{fmtAmt(budget.totalBudget)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            {t("budgets.detail.allBudgetTransactions", "Transacciones del presupuesto")}
          </p>
          {allBudgetTransactions.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">{t("budgets.detail.noTransactions")}</p>
          ) : (
            <div className="mt-3 space-y-2">
              {visibleBudgetTransactions.map((tx) => (
                <div key={tx.id} className="rounded-xl border border-slate-100 px-3 py-2">
                  <p className="truncate text-sm font-semibold text-slate-700">{tx.name}</p>
                  <p className="text-[11px] text-slate-400">{tx.budgetCategoryName} · {tx.date}</p>
                  <p className="mt-1 text-sm font-bold tabular-nums text-slate-800">{fmtAmt(tx.amount)}</p>
                </div>
              ))}

              {budgetTxTotalPages > 1 && (
                <Pagination
                  currentPage={budgetTxPage}
                  totalPages={budgetTxTotalPages}
                  onPageChange={setBudgetTxPage}
                />
              )}
            </div>
          )}
        </div>
      </section>

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
