import {
  type FormEvent,
  useCallback,
  useEffect,
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
  RefreshCw,
  Target,
  Trash2,
  X,
} from "lucide-react";
import type { GoalSummaryDto } from "@/types";
import { goalService } from "@/backend/goalService";

//  Helpers 

function pct(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, (current / target) * 100);
}

function isCompleted(g: GoalSummaryDto) {
  return g.currentAmount >= g.targetAmount;
}

function ringColor(p: number) {
  if (p >= 100) return "#10b981";
  if (p >= 75) return "#f97316";
  if (p >= 45) return "#0ea5e9";
  return "#38bdf8";
}

//  Circular progress ring 

function CircleProgress({ value, label }: { value: number; label: string }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = ringColor(value);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 112, height: 112 }}>
      <svg width="112" height="112" className="-rotate-90">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#f1f5f9" strokeWidth="9" />
        <circle
          cx="56"
          cy="56"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className="text-xl font-extrabold text-slate-800">{value.toFixed(0)}%</span>
        <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
          {label}
        </span>
      </div>
    </div>
  );
}

//  Mini adjust popover 

interface AdjustPopoverProps {
  direction: "add" | "withdraw";
  onConfirm: (amount: number) => Promise<void>;
}

function AdjustPopover({ direction, onConfirm }: AdjustPopoverProps) {
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((v) => !v); setValue(""); setError(""); }}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
          isAdd
            ? "border-slate-300 text-slate-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600"
            : "border-slate-300 text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-500"
        }`}
      >
        {isAdd ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
      </button>

      {open && (
        <div
          className={`absolute bottom-10 z-30 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg ${
            isAdd ? "right-0" : "left-0"
          }`}
          style={{ width: 160 }}
        >
          <p className="text-[11px] font-semibold text-slate-500">
            {isAdd ? t("goals.addAmount") : t("goals.withdrawAmount")}
          </p>
          <div className="relative">
            <input
              autoFocus
              type="number"
              min="0.01"
              step="0.01"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              placeholder="0.00"
              className="h-8 w-full rounded-lg border border-slate-300 bg-slate-50 px-2 pr-6 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">EUR</span>
          </div>
          {error && <p className="text-[10px] text-red-500">{error}</p>}
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex h-7 items-center justify-center rounded-lg text-xs font-semibold text-white transition disabled:opacity-60 ${
              isAdd
                ? "bg-emerald-500 hover:bg-emerald-600"
                : "bg-red-500 hover:bg-red-600"
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setTargetAmount(initial ? String(initial.targetAmount) : "");
      setError("");
    }
  }, [open, initial]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(targetAmount);
    if (!name.trim()) { setError(t("goals.errors.nameRequired")); return; }
    if (isNaN(amount) || amount <= 0) { setError(t("goals.errors.amountPositive")); return; }
    setLoading(true);
    setError("");
    try {
      if (isEdit && initial) {
        await goalService.update(initial.id, { name: name.trim(), targetAmount: amount });
      } else {
        await goalService.create({ name: name.trim(), targetAmount: amount });
      }
      onSaved();
    } catch {
      setError(t("common.error"));
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
          </div>

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
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-gradient-to-r from-sky-500 to-emerald-500 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
            >
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

//  Goal card 

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

  const ringLabel = completed
    ? t("goals.completed").toUpperCase()
    : "SAVED";

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
    <div
      className={`relative flex flex-col items-center overflow-hidden rounded-2xl border bg-white px-5 pb-4 pt-5 shadow-sm transition hover:shadow-md ${
        completed ? "border-emerald-200" : "border-slate-200"
      }`}
    >
      <div className="flex w-full items-start justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            completed
              ? "bg-emerald-100 text-emerald-600"
              : "bg-slate-100 text-sky-600"
          }`}
        >
          {completed ? <CheckCircle2 className="h-5 w-5" /> : <Target className="h-5 w-5" />}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onEdit(goal)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(goal)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mt-2 text-center text-base font-bold text-slate-800">{goal.name}</p>

      <div className="my-4">
        <CircleProgress value={progress} label={ringLabel} />
      </div>

      <div className="mb-4 text-center">
        <span className="text-xl font-bold text-slate-800">{goal.currentAmount.toFixed(2)} EUR</span>
        <span className="ml-1 text-sm text-slate-400">/ {goal.targetAmount.toFixed(2)} EUR</span>
      </div>

      <div className="flex w-full items-center justify-between">
        {completed ? (
          <div className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2 text-sm font-semibold text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            {t("goals.goalReached")}
          </div>
        ) : (
          <>
            <AdjustPopover direction="withdraw" onConfirm={(a) => handleAdjust("withdraw", a)} />
            <span className="text-xs text-slate-400">{t("goals.adjustLabel")}</span>
            <AdjustPopover direction="add" onConfirm={(a) => handleAdjust("add", a)} />
          </>
        )}
      </div>
    </div>
  );
}

//  Empty slot card 

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

//  Status pill 

function StatusPill({ label, count, color }: { label: string; count: number; color: "emerald" | "sky" }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
          color === "emerald" ? "bg-emerald-500" : "bg-sky-500"
        }`}
      >
        {count}
      </span>
    </div>
  );
}

//  Main page 

type Tab = "active" | "completed";

export default function GoalsPage() {
  const { t } = useTranslation();

  const [goals, setGoals] = useState<GoalSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("active");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<GoalSummaryDto | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      setGoals(await goalService.getAll());
    } catch {
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

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

  const activeGoals = goals.filter((g) => !isCompleted(g));
  const completedGoals = goals.filter(isCompleted);
  const displayed = tab === "active" ? activeGoals : completedGoals;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{t("goals.title")}</h1>
            <p className="mt-1 text-sm text-slate-400">{t("goals.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchGoals}
              className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <StatusPill label={t("goals.tabCompleted")} count={completedGoals.length} color="emerald" />
            <StatusPill label={t("goals.tabActive")} count={activeGoals.length} color="sky" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex w-fit gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
          {(["active", "completed"] as Tab[]).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`rounded-lg px-5 py-1.5 text-sm font-semibold transition ${
                tab === tabKey
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tabKey === "active" ? t("goals.tabActive") : t("goals.tabCompleted")}
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  tab === tabKey
                    ? "bg-slate-100 text-slate-600"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {tabKey === "active" ? activeGoals.length : completedGoals.length}
              </span>
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayed.map((g) => (
              <div key={g.id} className="relative">
                {deleteConfirm === g.id && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-sm">
                    <p className="text-sm font-semibold text-slate-700">{t("goals.deleteConfirm")}</p>
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

            {tab === "active" && (
              <EmptyGoalCard
                onAdd={() => { setEditTarget(null); setFormOpen(true); }}
              />
            )}

            {tab === "completed" && completedGoals.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400">
                {t("goals.noCompleted")}
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
