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
  ChevronUp,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { FieldError } from "@/components/ui/field-error";
import type { BudgetSummaryDto, BudgetPeriodicity } from "@/types";
import { budgetService } from "@/backend/budgetService";
import { IconAvatar } from "@/components/icons/IconAvatar";
import { IconPicker } from "@/components/icons/IconPicker";
import {
  DEFAULT_ICON_BG_COLOR,
  normalizeIconBgColor,
  resolveEntityIconName,
  suggestIconFromText,
} from "@/components/icons/iconRegistry";

const MAX_BUDGETS = 10;
const BUDGET_CARD_SPANS_STORAGE_KEY = "budgets.cardSpans.v1";

type BudgetCardSpan = 1 | 2;

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

function normalizeCardSpan(value: unknown): BudgetCardSpan {
  return value === 2 ? 2 : 1;
}

function areCardSpanMapsEqual(
  a: Record<string, BudgetCardSpan>,
  b: Record<string, BudgetCardSpan>,
) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
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
  const [iconName, setIconName] = useState<string>(
    resolveEntityIconName(initial?.iconName, initial?.name ?? "budget"),
  );
  const [iconBgColor, setIconBgColor] = useState<string>(
    normalizeIconBgColor(initial?.iconBgColor, DEFAULT_ICON_BG_COLOR),
  );
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [formError, setFormError] = useState("");

  const defaultStartDate = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  }, []);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setPeriodicity(initial?.periodicity ?? "MONTHLY");
      setStartDate(initial?.startDate ?? defaultStartDate);
      setIconName(resolveEntityIconName(initial?.iconName, initial?.name ?? "budget"));
      setIconBgColor(normalizeIconBgColor(initial?.iconBgColor, DEFAULT_ICON_BG_COLOR));
      setNameError("");
      setFormError("");
    }
  }, [open, initial, defaultStartDate]);

  const defaultIconName = useMemo(() => {
    return suggestIconFromText(name || initial?.name || "budget");
  }, [name, initial?.name]);

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
          iconName,
          iconBgColor,
        });
      } else {
        await budgetService.create({
          name: name.trim(),
          periodicity,
          startDate,
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
  span: BudgetCardSpan;
  onEdit: (b: BudgetSummaryDto) => void;
  onDelete: (b: BudgetSummaryDto) => void;
  onClick: (b: BudgetSummaryDto) => void;
  onSpanChange: (budgetId: string, next: BudgetCardSpan) => void;
}

function DeleteBudgetOverlay({
  message,
  cancelLabel,
  deleteLabel,
  onCancel,
  onDelete,
}: {
  message: string;
  cancelLabel: string;
  deleteLabel: string;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 backdrop-blur-sm">
      <p className="text-center text-sm font-semibold text-slate-700">{message}</p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg bg-red-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
        >
          {deleteLabel}
        </button>
      </div>
    </div>
  );
}

function BudgetSizeToggle({
  span,
  onChange,
}: {
  span: BudgetCardSpan;
  onChange: (next: BudgetCardSpan) => void;
}) {
  return (
    <div
      className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white p-1"
      onClick={(e) => e.stopPropagation()}
      role="group"
      aria-label="Budget card size"
    >
      <button
        type="button"
        onClick={() => onChange(1)}
        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
          span === 1
            ? "bg-slate-900 text-white"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        }`}
        aria-label="Set card size x1"
      >
        x1
      </button>
      <button
        type="button"
        onClick={() => onChange(2)}
        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
          span === 2
            ? "bg-slate-900 text-white"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        }`}
        aria-label="Set card size 2x"
      >
        2x
      </button>
    </div>
  );
}

function BudgetDetailsTab({
  label,
  onActivate,
}: {
  label: string;
  onActivate: () => void;
}) {
  return (
    <button
      type="button"
      className="budget-details-tab"
      onClick={(e) => {
        e.stopPropagation();
        onActivate();
      }}
    >
      <span className="budget-details-slot-icon">
        <ChevronUp className="h-4 w-4" />
      </span>
      <span className="budget-details-slot-text">
        <ChevronUp className="h-4 w-4" />
        {label}
      </span>
    </button>
  );
}

function BudgetShowcaseCard({ budget, span, onEdit, onDelete, onClick, onSpanChange }: BudgetCardProps) {
  const { t } = useTranslation();
  const colors = usageColor(budget.usagePercent);
  const rawPct = Math.max(0, budget.usagePercent);
  const progressPct = Math.min(100, rawPct);
  const iconName = resolveEntityIconName(budget.iconName, budget.name);
  const iconBgColor = normalizeIconBgColor(budget.iconBgColor, DEFAULT_ICON_BG_COLOR);

  return (
    <div
      className="budget-card budget-card-wide relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md cursor-pointer"
      onClick={() => onClick(budget)}
    >
      <div className={`absolute left-0 right-0 top-0 h-1.5 ${colors.bar}`} />
      <div className="flex flex-1 flex-col pt-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <IconAvatar
              iconName={iconName}
              iconBgColor={iconBgColor}
              fallbackText={budget.name}
              className="h-12 w-12 rounded-2xl"
              iconClassName="h-6 w-6"
            />
            <div className="min-w-0">
              <p className="truncate text-xl font-bold text-slate-800">{budget.name}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {t(`budgets.periodicities.${budget.periodicity}`)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold tabular-nums text-slate-900">{fmtAmt(budget.totalSpent)}</p>
            <p className="text-xs text-slate-400">
              {t("budgets.detail.of")} {fmtAmt(budget.totalBudget)}
            </p>
          </div>
        </div>

        <div className="mt-5 mb-2">
          <div className="mb-2 flex items-center justify-between">
            <span className={`text-sm font-bold ${colors.text}`}>
              {rawPct.toFixed(1)}% {t("budgets.usagePercent")}
            </span>
            <span className="text-xs text-slate-400">
              {budget.categoryCount} {t("budgets.categoryCount")} · {formatDate(budget.periodEnd)}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
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

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4" onClick={(e) => e.stopPropagation()}>
          <div className="min-w-[180px] flex-1">
            <BudgetDetailsTab
              label={t("budgets.viewDetails")}
              onActivate={() => onClick(budget)}
            />
          </div>
          <BudgetSizeToggle
            span={span}
            onChange={(next) => onSpanChange(budget.id, next)}
          />
          <button
            onClick={() => onEdit(budget)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
            aria-label={t("common.edit")}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(budget)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            aria-label={t("common.delete")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function BudgetTileCard({ budget, span, onEdit, onDelete, onClick, onSpanChange }: BudgetCardProps) {
  const { t } = useTranslation();
  const colors = usageColor(budget.usagePercent);
  const rawPct = Math.max(0, budget.usagePercent);
  const progressPct = Math.min(100, rawPct);
  const iconName = resolveEntityIconName(budget.iconName, budget.name);
  const iconBgColor = normalizeIconBgColor(budget.iconBgColor, DEFAULT_ICON_BG_COLOR);

  return (
    <div
      className="budget-card budget-card-compact relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md cursor-pointer"
      onClick={() => onClick(budget)}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <IconAvatar
            iconName={iconName}
            iconBgColor={iconBgColor}
            fallbackText={budget.name}
            className="h-9 w-9 rounded-xl"
            iconClassName="h-4 w-4"
          />
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-slate-800">{budget.name}</p>
            <p className="text-[11px] text-slate-400">
              {t(`budgets.periodicities.${budget.periodicity}`)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <BudgetSizeToggle
            span={span}
            onChange={(next) => onSpanChange(budget.id, next)}
          />
          <button
            onClick={() => onEdit(budget)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600"
            aria-label={t("common.edit")}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(budget)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
            aria-label={t("common.delete")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="text-3xl font-extrabold tabular-nums text-slate-900">{fmtAmt(budget.totalSpent)}</p>
      <p className="mt-0.5 text-xs text-slate-400">
        {t("budgets.totalBudget")}: {fmtAmt(budget.totalBudget)}
      </p>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className={`font-semibold ${colors.text}`}>{rawPct.toFixed(0)}%</span>
        <span className="text-slate-400">{formatDate(budget.periodEnd)}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${progressPct}%` }} />
      </div>

      <div className="mt-4">
        <BudgetDetailsTab
          label={t("budgets.viewDetails")}
          onActivate={() => onClick(budget)}
        />
      </div>
    </div>
  );
}

// ── Empty budget card ───────────────────────────────────────────────

function EmptyBudgetCard({ onAdd, compact = false }: { onAdd: () => void; compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onAdd}
      className={`flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white text-slate-400 transition hover:border-sky-300 hover:bg-sky-50/50 hover:text-sky-500 ${
        compact ? "h-full min-h-[240px] px-6 py-8" : "min-h-[250px] py-12"
      }`}
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
  const [cardSpans, setCardSpans] = useState<Record<string, BudgetCardSpan>>({});
  const [cardSpansReady, setCardSpansReady] = useState(false);

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

  useEffect(() => {
    if (typeof window === "undefined") {
      setCardSpansReady(true);
      return;
    }
    try {
      const raw = window.localStorage.getItem(BUDGET_CARD_SPANS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const next: Record<string, BudgetCardSpan> = {};
      for (const [budgetId, span] of Object.entries(parsed ?? {})) {
        next[budgetId] = normalizeCardSpan(span);
      }
      setCardSpans(next);
    } catch {
      setCardSpans({});
    } finally {
      setCardSpansReady(true);
    }
  }, []);

  useEffect(() => {
    setCardSpans((current) => {
      const next: Record<string, BudgetCardSpan> = {};
      budgets.forEach((budget, index) => {
        next[budget.id] = normalizeCardSpan(current[budget.id] ?? (index === 0 ? 2 : 1));
      });
      if (areCardSpanMapsEqual(current, next)) return current;
      return next;
    });
  }, [budgets]);

  useEffect(() => {
    if (!cardSpansReady || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        BUDGET_CARD_SPANS_STORAGE_KEY,
        JSON.stringify(cardSpans),
      );
    } catch {
      // Ignore persistence errors
    }
  }, [cardSpans, cardSpansReady]);

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

  const handleSpanChange = useCallback((budgetId: string, next: BudgetCardSpan) => {
    setCardSpans((current) => {
      if (current[budgetId] === next) return current;
      return { ...current, [budgetId]: next };
    });
  }, []);

  const getBudgetSpan = useCallback(
    (budget: BudgetSummaryDto, index: number): BudgetCardSpan => {
      return normalizeCardSpan(cardSpans[budget.id] ?? (index === 0 ? 2 : 1));
    },
    [cardSpans],
  );

  const canAdd = budgets.length < MAX_BUDGETS;

  // Summary stats
  const totalBudgeted = useMemo(
    () => budgets.reduce((s, b) => s + b.totalBudget, 0), [budgets]);
  const totalSpent = useMemo(
    () => budgets.reduce((s, b) => s + b.totalSpent, 0), [budgets]);
  const rawGlobalUsagePct = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
  const progressGlobalUsagePct = Math.min(100, Math.max(0, rawGlobalUsagePct));

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("budgets.title")}</h1>
            <p className="text-sm text-slate-400">{t("budgets.subtitle")}</p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {budgets.length}/{MAX_BUDGETS} {t("budgets.budgetsCount")}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                {t("budgets.totalSpent")}
                <span className="tabular-nums">{fmtAmt(totalSpent)}</span>
              </span>
            </div>
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

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          </div>
        ) : budgets.length === 0 ? (
          <EmptyBudgetCard onAdd={() => { setEditTarget(null); setFormOpen(true); }} />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {budgets.map((budget, index) => {
                const span = getBudgetSpan(budget, index);
                const isWide = span === 2;
                return (
                  <div
                    key={budget.id}
                    className={`relative flex flex-col ${isWide ? "lg:row-span-2" : ""}`}
                  >
                    {deleteConfirm === budget.id && (
                      <DeleteBudgetOverlay
                        message={t("budgets.deleteConfirm")}
                        cancelLabel={t("common.cancel")}
                        deleteLabel={t("common.delete")}
                        onCancel={() => setDeleteConfirm(null)}
                        onDelete={() => handleDelete(budget)}
                      />
                    )}
                    {isWide ? (
                      <BudgetShowcaseCard
                        budget={budget}
                        span={span}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onClick={handleClick}
                        onSpanChange={handleSpanChange}
                      />
                    ) : (
                      <BudgetTileCard
                        budget={budget}
                        span={span}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onClick={handleClick}
                        onSpanChange={handleSpanChange}
                      />
                    )}
                  </div>
                );
              })}

              {canAdd ? (
                <EmptyBudgetCard onAdd={() => { setEditTarget(null); setFormOpen(true); }} compact />
              ) : (
                <div className="flex h-full min-h-[240px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{t("budgets.maxBudgets")}</p>
                    <p className="mt-1 text-xs text-slate-400">{MAX_BUDGETS}/{MAX_BUDGETS}</p>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-full w-full rounded-full bg-slate-700" />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  {t("budgets.title")}
                </p>
                <span className="text-xs text-slate-400">
                  {rawGlobalUsagePct.toFixed(1)}% {t("budgets.usagePercent")}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-slate-900" style={{ width: `${progressGlobalUsagePct}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-500 sm:grid-cols-3">
                <span>{t("budgets.totalBudget")}: <span className="font-semibold text-slate-700">{fmtAmt(totalBudgeted)}</span></span>
                <span>{t("budgets.totalSpent")}: <span className="font-semibold text-slate-700">{fmtAmt(totalSpent)}</span></span>
                <span>{t("budgets.totalRemaining")}: <span className={`font-semibold ${totalBudgeted - totalSpent >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmtAmt(totalBudgeted - totalSpent)}</span></span>
              </div>
            </div>
          </>
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
