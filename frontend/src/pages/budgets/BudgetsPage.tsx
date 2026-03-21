import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Pencil,
  PiggyBank,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { FieldError } from "@/components/ui/field-error";
import type { BudgetSummaryDto, BudgetPeriodicity } from "@/types";
import { budgetService } from "@/backend/budgetService";

const MAX_BUDGETS = 10;

const PERIODICITIES: BudgetPeriodicity[] = [
  "WEEKLY", "MONTHLY", "QUARTERLY", "FOUR_MONTHLY", "BIANNUAL", "ANNUAL",
];

// ── Formatting ──────────────────────────────────────────────────────
const _nf = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
function fmtAmt(n: number) {
  return `${_nf.format(n)} EUR`;
}

// ── Usage color helper ──────────────────────────────────────────────
function usageColor(pct: number): { text: string; bar: string; bg: string; label: string } {
  if (pct <= 20) return { text: "text-blue-500", bar: "budget-bar-blue", bg: "budget-bg-blue", label: "blue" };
  if (pct <= 45) return { text: "text-emerald-500", bar: "budget-bar-green", bg: "budget-bg-green", label: "green" };
  if (pct <= 65) return { text: "text-yellow-500", bar: "budget-bar-yellow", bg: "budget-bg-yellow", label: "yellow" };
  if (pct <= 85) return { text: "text-orange-500", bar: "budget-bar-orange", bg: "budget-bg-orange", label: "orange" };
  return { text: "text-red-500", bar: "budget-bar-red", bg: "budget-bg-red", label: "red" };
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, {
    day: "numeric", month: "short",
  });
}

// ── Budget form dialog ──────────────────────────────────────────────

interface BudgetFormDialogProps {
  open: boolean;
  initial?: BudgetSummaryDto | null;
  onClose: () => void;
  onSaved: () => void;
}

function BudgetFormDialog({ open, initial, onClose, onSaved }: BudgetFormDialogProps) {
  const { t } = useTranslation();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [periodicity, setPeriodicity] = useState<BudgetPeriodicity>(
    initial?.periodicity ?? "MONTHLY"
  );
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setPeriodicity(initial?.periodicity ?? "MONTHLY");
      setStartDate(initial?.startDate ?? "");
      setNameError("");
      setFormError("");
    }
  }, [open, initial]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setNameError("");
    setFormError("");

    if (!name.trim()) { setNameError(t("budgets.errors.nameRequired")); return; }
    if (!startDate) { setFormError(t("budgets.errors.startDateRequired")); return; }

    setLoading(true);
    try {
      if (isEdit && initial) {
        await budgetService.update(initial.id, {
          name: name.trim(),
          periodicity,
          startDate,
        });
      } else {
        await budgetService.create({
          name: name.trim(),
          periodicity,
          startDate,
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
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            {isEdit ? t("budgets.editBudget") : t("budgets.create")}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">{t("budgets.name")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder={t("budgets.namePlaceholder")}
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              required
            />
            <FieldError message={nameError} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">{t("budgets.periodicity")}</label>
            <select
              value={periodicity}
              onChange={(e) => setPeriodicity(e.target.value as BudgetPeriodicity)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            >
              {PERIODICITIES.map((p) => (
                <option key={p} value={p}>
                  {t(`budgets.periodicities.${p}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">{t("budgets.startDate")}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              required
            />
          </div>

          {formError && <FieldError message={formError} />}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn-cancel-draw flex-1 justify-center"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="squishy-save-simple flex-1 justify-center"
            >
              {loading ? <Loader2 className="squishy-save-icon h-4 w-4 animate-spin" /> : <Save className="squishy-save-icon h-4 w-4" />}
              {t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Budget card ─────────────────────────────────────────────────────

interface BudgetCardProps {
  budget: BudgetSummaryDto;
  onEdit: (b: BudgetSummaryDto) => void;
  onDelete: (b: BudgetSummaryDto) => void;
  onClick: (b: BudgetSummaryDto) => void;
}

function BudgetCard({ budget, onEdit, onDelete, onClick }: BudgetCardProps) {
  const { t } = useTranslation();
  const colors = usageColor(budget.usagePercent);
  const pct = Math.min(100, Math.max(0, budget.usagePercent));

  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md cursor-pointer"
      onClick={() => onClick(budget)}
    >
      {/* Color stripe */}
      <div className={`h-1.5 w-full ${colors.bar}`} />

      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.bg}`}>
              <PiggyBank className={`h-5 w-5 ${colors.text}`} />
            </div>
            <div>
              <p className="font-bold text-slate-800">{budget.name}</p>
              <p className="text-[11px] text-slate-400">
                {t(`budgets.periodicities.${budget.periodicity}`)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onEdit(budget)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600"
            >
              <Pencil className="btn-edit-icon h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(budget)}
              className="tx-squishy-tech tx-squishy-expense p-1.5 ml-1"
            >
              <Trash2 className="tx-squishy-icon relative z-10 h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 mb-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-bold ${colors.text}`}>
              {pct.toFixed(1)}% {t("budgets.usagePercent")}
            </span>
            <span className="text-[10px] text-slate-400">
              {budget.categoryCount} {t("budgets.categoryCount")}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>

        {/* Amounts */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {t("budgets.totalSpent")}
            </p>
            <p className="text-lg font-extrabold tabular-nums text-slate-800">
              {fmtAmt(budget.totalSpent)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {t("budgets.totalRemaining")}
            </p>
            <p className={`text-lg font-extrabold tabular-nums ${budget.totalRemaining >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {fmtAmt(budget.totalRemaining)}
            </p>
          </div>
        </div>

        {/* Period info */}
        <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-[10px] text-slate-400">
            {formatDate(budget.periodStart)} — {formatDate(budget.periodEnd)}
          </span>
          <span className="text-[10px] font-semibold text-slate-500">
            {t("budgets.prevSpent")}: {fmtAmt(budget.prevTotalSpent)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Empty budget card ───────────────────────────────────────────────

function EmptyBudgetCard({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onAdd}
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-12 text-slate-400 transition hover:border-sky-300 hover:bg-sky-50/50 hover:text-sky-500"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-current">
        <Plus className="h-7 w-7" />
      </div>
      <div className="text-center">
        <p className="font-semibold">{t("budgets.createNew")}</p>
        <p className="mt-0.5 text-xs">{t("budgets.createNewDesc")}</p>
      </div>
    </button>
  );
}

// ── Main page ───────────────────────────────────────────────────────

export default function BudgetsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [budgets, setBudgets] = useState<BudgetSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BudgetSummaryDto | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchBudgets = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      setBudgets(await budgetService.getAll());
    } catch {
      setBudgets([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
    const interval = setInterval(() => fetchBudgets(false), 30_000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchBudgets(false);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchBudgets]);

  const handleSaved = () => {
    setFormOpen(false);
    setEditTarget(null);
    fetchBudgets();
  };

  const handleEdit = (b: BudgetSummaryDto) => {
    setEditTarget(b);
    setFormOpen(true);
  };

  const handleDelete = async (b: BudgetSummaryDto) => {
    if (deleteConfirm !== b.id) { setDeleteConfirm(b.id); return; }
    try { await budgetService.remove(b.id); } catch { /* ignore */ }
    setDeleteConfirm(null);
    fetchBudgets();
  };

  const handleClick = (b: BudgetSummaryDto) => {
    navigate(`/budgets/${b.id}`);
  };

  const canAdd = budgets.length < MAX_BUDGETS;

  // Summary stats
  const totalBudgeted = useMemo(
    () => budgets.reduce((s, b) => s + b.totalBudget, 0), [budgets]);
  const totalSpent = useMemo(
    () => budgets.reduce((s, b) => s + b.totalSpent, 0), [budgets]);

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-xl bg-white px-5 py-4">
          <PageHeader
            left={<PiggyBank className="h-8 w-8 text-sky-500" />}
            title={t("budgets.title")}
            subtitle={(
              <div className="flex flex-wrap items-center gap-x-2">
                <p className="text-sm text-slate-400">{t("budgets.subtitle")}</p>
                {budgets.length > 0 && (
                  <>
                    <span className="text-slate-300" aria-hidden>·</span>
                    <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-3 py-1 text-sm font-semibold text-white shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("budgets.totalSpent")}</span>
                      <span className="tabular-nums">{fmtAmt(totalSpent)}</span>
                      <span className="text-slate-500">/</span>
                      <span className="tabular-nums text-slate-300">{fmtAmt(totalBudgeted)}</span>
                    </span>
                    <span className="text-slate-300" aria-hidden>·</span>
                    <span className="text-xs text-slate-400">{budgets.length}/{MAX_BUDGETS} {t("budgets.budgetsCount")}</span>
                  </>
                )}
              </div>
            )}
            actions={(
              <div className="flex items-center gap-3 page-header-actions">
                <div className="budget-pill">
                  <span>{t("budgets.title")}</span>
                  <span className="budget-pill-badge">{budgets.length}</span>
                </div>
                <button
                  onClick={() => { setEditTarget(null); setFormOpen(true); }}
                  disabled={!canAdd}
                  className="budget-new-btn"
                >
                  <Plus className="budget-new-icon h-4 w-4" />
                  {t("budgets.create")}
                </button>
              </div>
            )}
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {budgets.map((b) => (
              <div key={b.id} className="relative">
                {deleteConfirm === b.id && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-sm">
                    <p className="text-sm font-semibold text-slate-700">
                      {t("budgets.deleteConfirm")}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        onClick={() => handleDelete(b)}
                        className="rounded-lg bg-red-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </div>
                )}
                <BudgetCard
                  budget={b}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onClick={handleClick}
                />
              </div>
            ))}

            {canAdd && (
              <EmptyBudgetCard onAdd={() => { setEditTarget(null); setFormOpen(true); }} />
            )}

            {budgets.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400">
                {t("budgets.noBudgets")}
              </div>
            )}
          </div>
        )}
      </div>

      <BudgetFormDialog
        open={formOpen}
        initial={editTarget}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        onSaved={handleSaved}
      />
    </>
  );
}
