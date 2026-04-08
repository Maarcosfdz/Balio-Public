import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import InfoCard from "@/components/ui/InfoCard";
import {
  Loader2,
  Palette,
  Pencil,
  PiggyBank,
  Plus,
  Save,
  Star,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { FieldError } from "@/components/ui/field-error";
import type { BudgetSummaryDto, BudgetPeriodicity } from "@/types";
import { budgetService } from "@/backend/budgetService";
import { IconAvatar } from "@/components/icons/IconAvatar";
import { IconPicker } from "@/components/icons/IconPicker";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { GradientButton } from "@/components/ui/gradient-button";
import SingleSelectDropdown from "@/components/ui/SelectDropdown";
import {
  DEFAULT_ICON_BG_COLOR,
  normalizeIconBgColor,
  resolveEntityIconName,
} from "@/components/icons/iconRegistry";
import { suggestIconNameFromText } from "@/components/icons/iconSuggestions";

const MAX_BUDGETS = 10;
const PRIMARY_BUDGET_STORAGE_KEY = "budgets.primaryId.v1";
const CARD_COLORS_STORAGE_KEY = "budgets.cardColors.v1";

// ── Card accent colors ───────────────────────────────────────────────
interface CardColor {
  id: string;
  bar: string;
  tint: string;
  label: string;
}

const CARD_COLORS: CardColor[] = [
  { id: "default", bar: "#64748b", tint: "", label: "Default" },
  { id: "sky",     bar: "#0ea5e9", tint: "budget-card-tint-sky",     label: "Sky" },
  { id: "violet",  bar: "#8b5cf6", tint: "budget-card-tint-violet",  label: "Violet" },
  { id: "emerald", bar: "#10b981", tint: "budget-card-tint-emerald", label: "Emerald" },
  { id: "amber",   bar: "#f59e0b", tint: "budget-card-tint-amber",   label: "Amber" },
  { id: "rose",    bar: "#f43f5e", tint: "budget-card-tint-rose",    label: "Rose" },
];

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
function usageColor(pct: number): { text: string; bar: string; label: string } {
  if (pct <= 20) return { text: "text-blue-500",    bar: "budget-bar-blue",   label: "blue" };
  if (pct <= 45) return { text: "text-emerald-500", bar: "budget-bar-green",  label: "green" };
  if (pct <= 65) return { text: "text-yellow-500",  bar: "budget-bar-yellow", label: "yellow" };
  if (pct <= 85) return { text: "text-orange-500",  bar: "budget-bar-orange", label: "orange" };
  return           { text: "text-red-500",       bar: "budget-bar-red",    label: "red" };
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
    return suggestIconNameFromText(name || initial?.name || "budget");
  }, [name, initial?.name]);

  const periodicityOptions = useMemo(
    () => PERIODICITIES.map((p) => ({
      value: p,
      label: t(`budgets.periodicities.${p}`),
    })),
    [t],
  );

  const ignoreEndDate = useCallback(() => {}, []);
  const ignoreSpecificDates = useCallback(() => {}, []);

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
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90dvh] overflow-y-auto">
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

          <SingleSelectDropdown
            value={periodicity}
            onChange={(v) => setPeriodicity(v as BudgetPeriodicity)}
            options={periodicityOptions}
            label={t("budgets.periodicity")}
            buttonClassName="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />

          <DateRangePicker
            startDate={startDate}
            endDate={startDate}
            onChangeStart={setStartDate}
            onChangeEnd={ignoreEndDate}
            specificDates={[]}
            onChangeSpecificDates={ignoreSpecificDates}
            label={t("budgets.startDate")}
            allowLooseDates={false}
            singleOnly
          />

          {formError && <FieldError message={formError} />}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn-cancel-draw flex-1 justify-center"
            >
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

// ── Delete overlay ───────────────────────────────────────────────────

function DeleteBudgetOverlay({
  message, cancelLabel, deleteLabel, onCancel, onDelete,
}: {
  message: string; cancelLabel: string; deleteLabel: string;
  onCancel: () => void; onDelete: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 backdrop-blur-sm">
      <p className="text-center text-sm font-semibold text-slate-700">{message}</p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-cancel-draw px-4 py-1.5 text-sm">
          {cancelLabel}
        </button>
        <button onClick={onDelete} className="budget-delete-confirm-btn">
          {deleteLabel}
        </button>
      </div>
    </div>
  );
}

// ── Color palette picker ─────────────────────────────────────────────

function ColorPalettePicker({
  currentColorId,
  onSelect,
}: {
  currentColorId: string;
  onSelect: (colorId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white/80 text-slate-400 backdrop-blur-sm transition hover:border-slate-300 hover:text-slate-600"
        aria-label="Change card color"
      >
        <Palette className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-30 flex gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          {CARD_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { onSelect(c.id); setOpen(false); }}
              className={`h-5 w-5 rounded-full transition hover:scale-110 ${currentColorId === c.id ? "ring-2 ring-offset-1 ring-slate-400" : ""}`}
              style={{ background: c.bar }}
              title={c.label}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Primary (hero) budget card ───────────────────────────────────────

interface PrimaryCardProps {
  budget: BudgetSummaryDto;
  colorId: string;
  isColorSwapping: boolean;
  onEdit: (b: BudgetSummaryDto) => void;
  onDelete: (b: BudgetSummaryDto) => void;
  onClick: (b: BudgetSummaryDto) => void;
  onColorChange: (budgetId: string, colorId: string) => void;
  showDeleteOverlay: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

function PrimaryBudgetCard({
  budget, colorId, isColorSwapping, onEdit, onDelete, onClick, onColorChange,
  showDeleteOverlay, onCancelDelete, onConfirmDelete,
}: PrimaryCardProps) {
  const { t } = useTranslation();
  const colors = usageColor(budget.usagePercent);
  const rawPct = Math.max(0, budget.usagePercent);
  const progressPct = Math.min(100, rawPct);
  const iconName = resolveEntityIconName(budget.iconName, budget.name);
  const iconBgColor = normalizeIconBgColor(budget.iconBgColor, DEFAULT_ICON_BG_COLOR);
  const accent = CARD_COLORS.find((c) => c.id === colorId) ?? CARD_COLORS[0];

  return (
    <div
      className={`budget-card relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md cursor-pointer ${accent.tint} ${isColorSwapping ? "budget-card-color-swap" : ""}`}
      style={{ minHeight: "22rem" }}
      onClick={() => onClick(budget)}
    >
      {/* Top accent bar */}
      <div className="budget-card-accent absolute left-0 right-0 top-0 h-1.5 rounded-t-2xl" style={{ background: accent.id === "default" ? undefined : accent.bar }} />
      {accent.id === "default" && <div className={`budget-card-accent absolute left-0 right-0 top-0 h-1.5 rounded-t-2xl ${colors.bar}`} />}

      {showDeleteOverlay && (
        <DeleteBudgetOverlay
          message={t("budgets.deleteConfirm")}
          cancelLabel={t("common.cancel")}
          deleteLabel={t("common.delete")}
          onCancel={onCancelDelete}
          onDelete={onConfirmDelete}
        />
      )}

      <div className="flex flex-1 flex-col p-6 pt-8">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <IconAvatar
              iconName={iconName}
              iconBgColor={iconBgColor}
              fallbackText={budget.name}
              className="h-14 w-14 rounded-2xl shadow-sm"
              iconClassName="h-7 w-7"
            />
            <div className="min-w-0">
              <p className="truncate text-2xl font-extrabold text-slate-900">{budget.name}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {t(`budgets.periodicities.${budget.periodicity}`)}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <ColorPalettePicker currentColorId={colorId} onSelect={(c) => onColorChange(budget.id, c)} />
            <button
              onClick={() => onEdit(budget)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white/80 text-slate-400 backdrop-blur-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
              aria-label={t("common.edit")}
            >
              <Pencil className="btn-edit-icon h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(budget)}
              className="btn-delete-icon"
              aria-label={t("common.delete")}
            >
              <Trash2 className="btn-delete-icon__icon h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Big amount */}
        <div className="mt-5">
          <p className="text-5xl font-extrabold tabular-nums text-slate-900 leading-none">
            {fmtAmt(budget.totalSpent)}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {t("budgets.detail.of")} {fmtAmt(budget.totalBudget)}
          </p>
        </div>

        {/* Progress */}
        <div className="mt-5">
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
              className={`h-full rounded-full transition-all duration-700 ${accent.id === "default" ? colors.bar : ""}`}
              style={{
                width: `${progressPct}%`,
                background: accent.id !== "default" ? accent.bar : undefined,
              }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {t("budgets.totalSpent")}
            </p>
            <p className="text-base font-extrabold tabular-nums text-slate-800">
              {fmtAmt(budget.totalSpent)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {t("budgets.totalRemaining")}
            </p>
            <p className={`text-base font-extrabold tabular-nums ${budget.totalRemaining >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {fmtAmt(budget.totalRemaining)}
            </p>
          </div>
        </div>

        {/* View Deep Analysis button */}
        <div className="mt-auto pt-4" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="budget-deep-analysis-btn"
            onClick={() => onClick(budget)}
          >
            <TrendingUp className="budget-deep-analysis-icon h-4 w-4" />
            <span className="budget-deep-analysis-text">{t("budgets.viewDetails")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Secondary (compact) budget card ─────────────────────────────────

interface SecondaryCardProps {
  budget: BudgetSummaryDto;
  colorId: string;
  isColorSwapping: boolean;
  isPrimary: boolean;
  onEdit: (b: BudgetSummaryDto) => void;
  onDelete: (b: BudgetSummaryDto) => void;
  onClick: (b: BudgetSummaryDto) => void;
  onSetPrimary: (budgetId: string) => void;
  onColorChange: (budgetId: string, colorId: string) => void;
  showDeleteOverlay: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

function SecondaryBudgetCard({
  budget, colorId, isColorSwapping, onEdit, onDelete, onClick, onSetPrimary, onColorChange,
  showDeleteOverlay, onCancelDelete, onConfirmDelete,
}: SecondaryCardProps) {
  const { t } = useTranslation();
  const colors = usageColor(budget.usagePercent);
  const rawPct = Math.max(0, budget.usagePercent);
  const progressPct = Math.min(100, rawPct);
  const iconName = resolveEntityIconName(budget.iconName, budget.name);
  const iconBgColor = normalizeIconBgColor(budget.iconBgColor, DEFAULT_ICON_BG_COLOR);
  const accent = CARD_COLORS.find((c) => c.id === colorId) ?? CARD_COLORS[0];

  return (
    <div
      className={`budget-card relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md cursor-pointer ${accent.tint} ${isColorSwapping ? "budget-card-color-swap" : ""}`}
      style={{ minHeight: "13rem" }}
      onClick={() => onClick(budget)}
    >
      {/* Top accent bar */}
      {accent.id === "default"
        ? <div className={`budget-card-accent absolute left-0 right-0 top-0 h-1 rounded-t-2xl ${colors.bar}`} />
        : <div className="budget-card-accent absolute left-0 right-0 top-0 h-1 rounded-t-2xl" style={{ background: accent.bar }} />
      }

      {showDeleteOverlay && (
        <DeleteBudgetOverlay
          message={t("budgets.deleteConfirm")}
          cancelLabel={t("common.cancel")}
          deleteLabel={t("common.delete")}
          onCancel={onCancelDelete}
          onDelete={onConfirmDelete}
        />
      )}

      <div className="flex flex-1 flex-col p-4 pt-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <IconAvatar
              iconName={iconName}
              iconBgColor={iconBgColor}
              fallbackText={budget.name}
              className="h-9 w-9 rounded-xl"
              iconClassName="h-4 w-4"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-800">{budget.name}</p>
              <p className="text-[10px] text-slate-400">
                {t(`budgets.periodicities.${budget.periodicity}`)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onSetPrimary(budget.id)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-amber-50 hover:text-amber-400"
              title="Set as primary"
            >
              <Star className="h-3.5 w-3.5" />
            </button>
            <ColorPalettePicker currentColorId={colorId} onSelect={(c) => onColorChange(budget.id, c)} />
            <button
              onClick={() => onEdit(budget)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-sky-50 hover:text-sky-600"
              aria-label={t("common.edit")}
            >
              <Pencil className="btn-edit-icon h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(budget)}
              className="btn-delete-icon"
              aria-label={t("common.delete")}
            >
              <Trash2 className="btn-delete-icon__icon h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Amount */}
        <p className="mt-3 text-2xl font-extrabold tabular-nums text-slate-900">
          {fmtAmt(budget.totalSpent)}
        </p>
        <p className="text-xs text-slate-400">
          {t("budgets.totalBudget")}: {fmtAmt(budget.totalBudget)}
        </p>

        {/* Progress */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className={`font-semibold ${colors.text}`}>{rawPct.toFixed(0)}%</span>
          <span className="text-slate-400">{formatDate(budget.periodEnd)}</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-700 ${accent.id === "default" ? colors.bar : ""}`}
            style={{
              width: `${progressPct}%`,
              background: accent.id !== "default" ? accent.bar : undefined,
            }}
          />
        </div>

        {/* Deep analysis tab */}
        <div className="mt-auto pt-3" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="budget-deep-analysis-btn budget-deep-analysis-btn-sm"
            onClick={() => onClick(budget)}
          >
            <TrendingUp className="budget-deep-analysis-icon h-3.5 w-3.5" />
            <span className="budget-deep-analysis-text">{t("budgets.viewDetails")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Empty card ──────────────────────────────────────────────────────

function EmptyBudgetCard({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onAdd}
      className="app-add-dashed flex min-h-[13rem] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white text-slate-400 transition hover:border-sky-300 hover:bg-sky-50/50 hover:text-sky-500"
    >
      <div className="app-add-dashed-ring flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-current">
        <Plus className="h-6 w-6" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold">{t("budgets.createNew")}</p>
        <p className="mt-0.5 text-xs">{t("budgets.createNewDesc")}</p>
      </div>
    </button>
  );
}

// ── Main page ────────────────────────────────────────────────────────

export default function BudgetsPage() {
  const { t } = useTranslation();
  const infoCardItems = t("budgets.infoCardItems", { returnObjects: true }) as string[];
  const navigate = useNavigate();

  const [budgets, setBudgets] = useState<BudgetSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BudgetSummaryDto | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Primary budget id
  const [primaryId, setPrimaryId] = useState<string | null>(null);

  // Card colors: budgetId -> colorId
  const [cardColors, setCardColors] = useState<Record<string, string>>({});
  const [colorSwapBudgetId, setColorSwapBudgetId] = useState<string | null>(null);
  const colorSwapTimerRef = useRef<number | null>(null);

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

  // Load primary id from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PRIMARY_BUDGET_STORAGE_KEY);
      if (raw) setPrimaryId(raw);
    } catch { /* ignore */ }
  }, []);

  // Load card colors from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CARD_COLORS_STORAGE_KEY);
      if (raw) setCardColors(JSON.parse(raw) as Record<string, string>);
    } catch { /* ignore */ }
  }, []);

  // Persist primary id
  useEffect(() => {
    if (primaryId == null) return;
    try { window.localStorage.setItem(PRIMARY_BUDGET_STORAGE_KEY, primaryId); } catch { /* ignore */ }
  }, [primaryId]);

  // Persist card colors
  useEffect(() => {
    try { window.localStorage.setItem(CARD_COLORS_STORAGE_KEY, JSON.stringify(cardColors)); } catch { /* ignore */ }
  }, [cardColors]);

  useEffect(() => {
    return () => {
      if (colorSwapTimerRef.current !== null) {
        window.clearTimeout(colorSwapTimerRef.current);
      }
    };
  }, []);

  // Ensure primary id is valid
  const resolvedPrimaryId = useMemo(() => {
    if (budgets.length === 0) return null;
    if (primaryId && budgets.some((b) => b.id === primaryId)) return primaryId;
    return budgets[0].id;
  }, [budgets, primaryId]);

  const primaryBudget = useMemo(
    () => budgets.find((b) => b.id === resolvedPrimaryId) ?? null,
    [budgets, resolvedPrimaryId],
  );

  const secondaryBudgets = useMemo(
    () => budgets.filter((b) => b.id !== resolvedPrimaryId),
    [budgets, resolvedPrimaryId],
  );

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

  const handleSetPrimary = useCallback((budgetId: string) => {
    setPrimaryId(budgetId);
  }, []);

  const handleColorChange = useCallback((budgetId: string, colorId: string) => {
    setCardColors((prev) => ({ ...prev, [budgetId]: colorId }));
    setColorSwapBudgetId(budgetId);

    if (colorSwapTimerRef.current !== null) {
      window.clearTimeout(colorSwapTimerRef.current);
    }
    colorSwapTimerRef.current = window.setTimeout(() => {
      setColorSwapBudgetId((current) => (current === budgetId ? null : current));
      colorSwapTimerRef.current = null;
    }, 520);
  }, []);

  const getCardColorId = useCallback((budgetId: string) => {
    return cardColors[budgetId] ?? "default";
  }, [cardColors]);

  const canAdd = budgets.length < MAX_BUDGETS;

  // Summary stats
  const totalBudgeted = useMemo(() => budgets.reduce((s, b) => s + b.totalBudget, 0), [budgets]);
  const totalSpent = useMemo(() => budgets.reduce((s, b) => s + b.totalSpent, 0), [budgets]);
  const rawGlobalUsagePct = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
  const progressGlobalUsagePct = Math.min(100, Math.max(0, rawGlobalUsagePct));

  return (
    <>
      <div className="budgets-page-shell space-y-5">
        <InfoCard
          id="budgets"
          accentColor="amber"
          title={t("budgets.infoCardTitle", "Budgets")}
          items={infoCardItems}
          description={t("budgets.infoCardDescription", "You will be notified if you exceed your budget.")}
        />
        {/* ── Hero header ── */}
        <div className="budgets-hero-section">
          <div className="budgets-hero-inner">
            <div className="budgets-hero-header">
              <div className="budgets-hero-title-wrap">
                <div className="budgets-hero-title">
                  <PiggyBank className="h-7 w-7 text-teal-600" />
                  <h1>{t("budgets.title")}</h1>
                </div>
                <p className="budgets-hero-subtitle">{t("budgets.subtitle")}</p>
              </div>
              <div className="budgets-hero-actions">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-slate-600 backdrop-blur-sm border border-slate-200/60">
                  {budgets.length}/{MAX_BUDGETS} {t("budgets.budgetsCount")}
                </span>
                <span className="budgets-total-pill">
                  {t("budgets.totalSpent")} {fmtAmt(totalSpent)}
                </span>
                <GradientButton
                  onClick={() => { setEditTarget(null); setFormOpen(true); }}
                  disabled={!canAdd}
                  size="sm"
                  weight="normal"
                  iconVariant="plus"
                  icon={<Plus className="h-4 w-4" />}
                >
                  {t("budgets.create")}
                </GradientButton>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          </div>
        ) : budgets.length === 0 ? (
          <EmptyBudgetCard onAdd={() => { setEditTarget(null); setFormOpen(true); }} />
        ) : (
          <>
            {/* ── Main grid ── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Primary card — takes left 2 columns */}
              {primaryBudget && (
                <div className="lg:col-span-2 lg:row-span-2">
                  <PrimaryBudgetCard
                    budget={primaryBudget}
                    colorId={getCardColorId(primaryBudget.id)}
                    isColorSwapping={colorSwapBudgetId === primaryBudget.id}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onClick={handleClick}
                    onColorChange={handleColorChange}
                    showDeleteOverlay={deleteConfirm === primaryBudget.id}
                    onCancelDelete={() => setDeleteConfirm(null)}
                    onConfirmDelete={() => handleDelete(primaryBudget)}
                  />
                </div>
              )}

              {/* Secondary cards */}
              {secondaryBudgets.map((budget) => (
                <div key={budget.id} className="relative">
                  <SecondaryBudgetCard
                    budget={budget}
                    colorId={getCardColorId(budget.id)}
                    isColorSwapping={colorSwapBudgetId === budget.id}
                    isPrimary={false}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onClick={handleClick}
                    onSetPrimary={handleSetPrimary}
                    onColorChange={handleColorChange}
                    showDeleteOverlay={deleteConfirm === budget.id}
                    onCancelDelete={() => setDeleteConfirm(null)}
                    onConfirmDelete={() => handleDelete(budget)}
                  />
                </div>
              ))}

              {/* Add new card */}
              {canAdd && (
                <EmptyBudgetCard onAdd={() => { setEditTarget(null); setFormOpen(true); }} />
              )}

              {!canAdd && (
                <div className="flex min-h-[13rem] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5">
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

            {/* ── Global summary bar ── */}
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
