import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Save,
  Target,
  Trash2,
  X,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import type { GoalSummaryDto } from "@/types";
import { goalService } from "@/backend/goalService";
import { FieldError } from "@/components/ui/field-error";
import { IconAvatar } from "@/components/icons/IconAvatar";
import { IconPicker } from "@/components/icons/IconPicker";
import {
  DEFAULT_ICON_BG_COLOR,
  normalizeIconBgColor,
  resolveEntityIconName,
  suggestIconFromText,
} from "@/components/icons/iconRegistry";

const MAX_GOALS = 40;

// ── Formatting ──────────────────────────────────────────────────────────
const _nf = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
function fmtAmt(n: number) {
  return `${_nf.format(n)} EUR`;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function pct(current: number, target: number) {
  if (target <= 0) return 0;
  return (current / target) * 100;
}

function isCompleted(g: GoalSummaryDto) {
  return g.currentAmount >= g.targetAmount;
}

/**
 * 0-50 %: vivid red → orange (avoids ugly yellow-green HSL transitions)
 * 50-100%: sky blue → emerald (matches the app theme)
 */
function progressColor(p: number): string {
  const clamped = Math.min(100, Math.max(0, p));
  if (clamped < 50) {
    // hsl 0° (rojo) → 30° (naranja): tonos cálidos y vivos
    const hue = (clamped / 50) * 30;
    return `hsl(${hue}, 85%, 52%)`;
  } else {
    // hsl 205° (sky) → 155° (esmeralda): azul→azul-verdoso
    const hue = 205 - ((clamped - 50) / 50) * 50;
    return `hsl(${hue}, 75%, 44%)`;
  }
}

// ── Circular progress ring ───────────────────────────────────────────────

function CircleProgress({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(100, value));
  const offset = circ - (progress / 100) * circ;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 124, height: 124 }}
    >
      <svg width="124" height="124" className="-rotate-90">
        <circle cx="62" cy="62" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle
          cx="62"
          cy="62"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s ease, stroke 1.2s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className="text-2xl font-extrabold text-slate-800">{value.toFixed(0)}%</span>
        <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
          {label}
        </span>
      </div>
    </div>
  );
}

// ── Mini adjust popover ──────────────────────────────────────────────────

interface AdjustPopoverProps {
  direction: "add" | "withdraw";
  onConfirm: (amount: number) => Promise<void>;
  wide?: boolean;
}

function AdjustPopover({ direction, onConfirm, wide = false }: AdjustPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleConfirm = async () => {
    const amount = parseFloat(value);
    if (isNaN(amount) || amount <= 0) { setError(t("goals.errors.amountPositive")); return; }
    setLoading(true);
    setError("");
    try {
      await onConfirm(amount);
      setValue("");
      setOpen(false);
    } catch {
      setError(t("goals.errors.adjustError"));
    } finally {
      setLoading(false);
    }
  };

  const isAdd = direction === "add";

  // wide buttons use neutral white/bg via CSS; avoid coloring here so they keep card-like appearance

  return (
    <div className={`relative${wide ? " flex-1" : ""}`} ref={ref}>
      <button
        onClick={() => { setOpen((v) => !v); setValue(""); setError(""); }}
        className={wide ? "goal-adjust-wide w-full" : (isAdd ? "goal-adjust-btn-add" : "goal-adjust-btn-withdraw")}
      >
        {isAdd ? <Plus className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
      </button>

      {open && (
        <div
          className={`absolute bottom-12 z-30 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg ${
            isAdd ? "right-0" : "left-0"
          }`}
          style={{ width: 148 }}
        >
          <div className="relative">
            <input
              autoFocus
              type="number"
              min="0.01"
              step="1"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              placeholder="0"
              className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 pr-10 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              EUR
            </span>
          </div>
          {error && <p className="text-[10px] text-red-500">{error}</p>}
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex h-8 items-center justify-center rounded-lg text-xs font-semibold text-white transition disabled:opacity-60 ${
              isAdd ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("common.confirm")}
          </button>
        </div>
      )}
    </div>
  );
}

//  Goal form dialog 

interface GoalFormDialogProps {
  open: boolean;
  initial?: GoalSummaryDto | null;
  onClose: () => void;
  onSaved: () => void;
}

function GoalFormDialog({ open, initial, onClose, onSaved }: GoalFormDialogProps) {
  const { t } = useTranslation();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(
    initial ? String(initial.targetAmount) : ""
  );
  const [iconName, setIconName] = useState<string>(
    resolveEntityIconName(initial?.iconName, initial?.name ?? "goal"),
  );
  const [iconBgColor, setIconBgColor] = useState<string>(
    normalizeIconBgColor(initial?.iconBgColor, DEFAULT_ICON_BG_COLOR),
  );
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setTargetAmount(initial ? String(initial.targetAmount) : "");
      setIconName(resolveEntityIconName(initial?.iconName, initial?.name ?? "goal"));
      setIconBgColor(normalizeIconBgColor(initial?.iconBgColor, DEFAULT_ICON_BG_COLOR));
      setNameError("");
      setAmountError("");
      setFormError("");
    }
  }, [open, initial]);

  const defaultIconName = useMemo(() => suggestIconFromText(name || initial?.name || "goal"), [name, initial?.name]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(targetAmount);
    setNameError("");
    setAmountError("");
    setFormError("");
    if (!name.trim()) { setNameError(t("goals.errors.nameRequired")); return; }
    if (isNaN(amount) || amount <= 0) { setAmountError(t("goals.errors.amountPositive")); return; }
    setLoading(true);
    try {
      if (isEdit && initial) {
        await goalService.update(initial.id, {
          name: name.trim(),
          targetAmount: amount,
          iconName,
          iconBgColor,
        });
      } else {
        await goalService.create({
          name: name.trim(),
          targetAmount: amount,
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
            {isEdit ? t("goals.editGoal") : t("goals.create")}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">{t("goals.name")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder={t("goals.namePlaceholder")}
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
            <label className="text-xs font-semibold text-slate-500">{t("goals.targetAmount")}</label>
            <div className="relative">
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
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

// ── Goal card ────────────────────────────────────────────────────────────

interface GoalCardProps {
  goal: GoalSummaryDto;
  onEdit: (g: GoalSummaryDto) => void;
  onDelete: (g: GoalSummaryDto) => void;
  onUpdated: (g: GoalSummaryDto) => void;
}

function GoalCard({ goal, onEdit, onDelete, onUpdated }: GoalCardProps) {
  const { t } = useTranslation();
  const progress = pct(goal.currentAmount, goal.targetAmount);
  const completed = isCompleted(goal);
  const color = progressColor(progress);
  const iconName = resolveEntityIconName(goal.iconName, goal.name);
  const iconBgColor = normalizeIconBgColor(goal.iconBgColor, DEFAULT_ICON_BG_COLOR);

  const ringLabel = completed ? t("goals.completed").toUpperCase() : "SAVED";

  const handleAdjust = async (direction: "add" | "withdraw", amount: number) => {
    let updated;
    if (direction === "add") {
      updated = await goalService.addAmount(goal.id, { amount });
    } else {
      updated = await goalService.withdrawAmount(goal.id, { amount });
    }
    onUpdated({ ...goal, currentAmount: updated.currentAmount });
  };

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      {/* Color stripe according to progress */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: color, transition: "background-color 1.2s ease" }}
      />

      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        {/* Header: icon + name + buttons */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <IconAvatar
              iconName={iconName}
              iconBgColor={iconBgColor}
              fallbackText={goal.name}
              className="h-10 w-10 rounded-xl"
              iconClassName="h-5 w-5"
            />
            <div>
              <p className="font-bold text-slate-800">{goal.name}</p>
              {completed && (
                <span className="text-[10px] font-semibold text-emerald-500">
                  ✓ {t("goals.goalReached")}
                </span>
              )}
            </div>
          </div>

          {/* Edit / delete buttons */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onEdit(goal)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600"
            >
              <Pencil className="btn-edit-icon h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(goal)}
              className="tx-squishy-tech tx-squishy-expense p-1.5 ml-1"
            >
              <Trash2 className="tx-squishy-icon relative z-10 h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress ring */}
        <div className="my-5 flex justify-center">
          <CircleProgress value={progress} label={ringLabel} color={color} />
        </div>

        {/* Amounts */}
        <div className="mb-5 text-center">
          <p className="text-2xl font-extrabold tabular-nums text-slate-800">
            {fmtAmt(goal.currentAmount)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            de {fmtAmt(goal.targetAmount)}
          </p>
        </div>

        {/* Adjust buttons or completed banner */}
        {completed ? (
          <div className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2.5 text-sm font-semibold text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            {t("goals.goalReached")}
          </div>
        ) : (
          <div className="flex gap-2">
            <AdjustPopover
              direction="withdraw"
              onConfirm={(a) => handleAdjust("withdraw", a)}
              wide
            />
            <AdjustPopover
              direction="add"
              onConfirm={(a) => handleAdjust("add", a)}
              wide
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Empty slot card ───────────────────────────────────────────────────────

function EmptyGoalCard({ onAdd }: { onAdd: () => void }) {
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
        <p className="font-semibold">{t("goals.createNew")}</p>
        <p className="mt-0.5 text-xs">{t("goals.createNewDesc")}</p>
      </div>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const { t } = useTranslation();

  const [goals, setGoals] = useState<GoalSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<GoalSummaryDto | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Auto-refresh (30 s + visibility) ──────────────────────────────────
  const fetchGoals = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      setGoals(await goalService.getAll());
    } catch {
      setGoals([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
    const interval = setInterval(() => fetchGoals(false), 30_000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchGoals(false);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchGoals]);

  const handleSaved = () => {
    setFormOpen(false);
    setEditTarget(null);
    fetchGoals();
  };

  const handleEdit = (g: GoalSummaryDto) => {
    setEditTarget(g);
    setFormOpen(true);
  };

  const handleDelete = async (g: GoalSummaryDto) => {
    if (deleteConfirm !== g.id) { setDeleteConfirm(g.id); return; }
    try { await goalService.remove(g.id); } catch { /* ignore */ }
    setDeleteConfirm(null);
    fetchGoals();
  };

  const handleUpdated = (updated: GoalSummaryDto) => {
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  };

  // Active first, completed last
  const sortedGoals = useMemo(
    () => [...goals].sort((a, b) => (isCompleted(a) ? 1 : 0) - (isCompleted(b) ? 1 : 0)),
    [goals],
  );

  const activeGoals = goals.filter((g) => !isCompleted(g));
  const completedGoals = goals.filter(isCompleted);
  const canAdd = goals.length < MAX_GOALS;

  // Portfolio stats
  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);

  return (
    <>
      {/* SVG filter for the gooey pills effect */}
      <svg
        style={{ visibility: "hidden", position: "absolute", width: 0, height: 0 }}
        aria-hidden="true"
      >
        <defs>
          <filter id="goal-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 9 -4"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div className="space-y-6">
        {/* ── Cabecera ── */}
        <div className="rounded-xl bg-white px-5 py-4">
          <PageHeader
            left={<Target className="h-8 w-8 text-sky-500" />}
            title={t("goals.title")}
            subtitle={(
              <div className="flex flex-wrap items-center gap-x-2">
                <p className="text-sm text-slate-400">{t("goals.subtitle")}</p>
                {goals.length > 0 && (
                  <>
                    <span className="text-slate-300" aria-hidden>·</span>
                    <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-3 py-1 text-sm font-semibold text-white shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("goals.totalSaved")}</span>
                      <span className="tabular-nums">{fmtAmt(totalSaved)}</span>
                    </span>
                    <span className="text-slate-300" aria-hidden>·</span>
                    <span className="text-xs text-slate-400">{goals.length}/{MAX_GOALS} {t("goals.goalsCount")}</span>
                  </>
                )}
              </div>
            )}
            actions={(
              <div className="flex items-center gap-3 page-header-actions">
              {/* Pills con efecto gooey */}
              <div style={{ filter: "url('#goal-goo')", display: "flex", gap: "0.5rem" }}>
                <div className="goal-pill goal-pill-active">
                  <span>{t("goals.tabActive")}</span>
                  <span className="goal-pill-badge">{activeGoals.length}</span>
                </div>
                <div className="goal-pill goal-pill-completed">
                  <span>{t("goals.tabCompleted")}</span>
                  <span className="goal-pill-badge">{completedGoals.length}</span>
                </div>
              </div>

              {/* Botón nueva meta */}
              <button
                onClick={() => { setEditTarget(null); setFormOpen(true); }}
                disabled={!canAdd}
                className="goal-new-btn"
              >
                <Plus className="goal-new-icon h-4 w-4" />
                {t("goals.create")}
              </button>
            </div>
            )}
          />
        </div>

        {/* ── Grid de metas ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sortedGoals.map((g) => (
              <div key={g.id} className="relative">
                {/* Overlay confirmación borrado */}
                {deleteConfirm === g.id && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-sm">
                    <p className="text-sm font-semibold text-slate-700">
                      {t("goals.deleteConfirm")}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        onClick={() => handleDelete(g)}
                        className="rounded-lg bg-red-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </div>
                )}
                <GoalCard
                  goal={g}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onUpdated={handleUpdated}
                />
              </div>
            ))}

            {/* Empty card to add */}
            {canAdd && (
              <EmptyGoalCard onAdd={() => { setEditTarget(null); setFormOpen(true); }} />
            )}

            {goals.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400">
                {t("goals.noGoals")}
              </div>
            )}
          </div>
        )}
      </div>

      <GoalFormDialog
        open={formOpen}
        initial={editTarget}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        onSaved={handleSaved}
      />
    </>
  );
}
