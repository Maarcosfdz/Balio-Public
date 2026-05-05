import { type FormEvent, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  Loader2,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Pagination from "@/components/ui/Pagination";
import type {
  AccountSummaryDto,
  CategorySummaryDto,
  ScheduledTransactionDto,
  ScheduledTransactionResponseDto,
  ScheduledTransactionUpdateDto,
  TransactionType,
} from "@/types";
import { scheduledTransactionService } from "@/backend/scheduledTransactionService";
import { accountService } from "@/backend/accountService";
import { categoryService } from "@/backend/categoryService";
import { ROUTES } from "@/config/routes";

const PAGE_SIZE = 20;

// ── Helpers ────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Build a human-readable frequency string like "cada 1 año y 3 meses" */
function frequencyText(
  t: (k: string) => string,
  fy: number, fm: number, fw: number, fd: number,
): string {
  const parts: string[] = [];
  if (fy > 0) parts.push(`${fy} ${t(fy === 1 ? "scheduled.freqYear" : "scheduled.freqYears")}`);
  if (fm > 0) parts.push(`${fm} ${t(fm === 1 ? "scheduled.freqMonth" : "scheduled.freqMonths")}`);
  if (fw > 0) parts.push(`${fw} ${t(fw === 1 ? "scheduled.freqWeek" : "scheduled.freqWeeks")}`);
  if (fd > 0) parts.push(`${fd} ${t(fd === 1 ? "scheduled.freqDay" : "scheduled.freqDays")}`);
  return `${t("scheduled.every")} ${parts.join(` ${t("scheduled.and")} `)}`;
}

/** Calculate date after N intervals from a base date */
function addInterval(
  base: string, fy: number, fm: number, fw: number, fd: number, times: number,
): string {
  const d = new Date(base);
  d.setFullYear(d.getFullYear() + fy * times);
  d.setMonth(d.getMonth() + fm * times);
  d.setDate(d.getDate() + (fw * 7 + fd) * times);
  return d.toISOString().slice(0, 10);
}

// ── Form Dialog ────────────────────────────────────────────────────────

interface FormDialogProps {
  open: boolean;
  editing: ScheduledTransactionResponseDto | null;
  onClose: () => void;
  onSaved: () => void;
}

function ScheduledFormDialog({ open, editing, onClose, onSaved }: FormDialogProps) {
  const { t } = useTranslation();

  const [accounts, setAccounts] = useState<AccountSummaryDto[]>([]);
  const [categories, setCategories] = useState<CategorySummaryDto[]>([]);

  useEffect(() => {
    if (!open) return;
    accountService.getAll().then(setAccounts).catch(() => {});
    categoryService.getAll().then(setCategories).catch(() => {});
  }, [open]);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [affectsBalance, setAffectsBalance] = useState(true);
  const [freqYears, setFreqYears] = useState(0);
  const [freqMonths, setFreqMonths] = useState(1);
  const [freqWeeks, setFreqWeeks] = useState(0);
  const [freqDays, setFreqDays] = useState(0);
  const [startDate, setStartDate] = useState(todayISO);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setAmount(String(editing.amount));
      setType(editing.type);
      setAccountId(editing.accountId ?? "");
      setCategoryId(editing.categoryId ?? "");
      setAffectsBalance(editing.affectsBalance);
      setFreqYears(editing.freqYears);
      setFreqMonths(editing.freqMonths);
      setFreqWeeks(editing.freqWeeks);
      setFreqDays(editing.freqDays);
      setStartDate(editing.startDate);
    } else {
      setName(""); setAmount(""); setType("EXPENSE");
      setAccountId(""); setCategoryId("");
      setAffectsBalance(true);
      setFreqYears(0); setFreqMonths(1); setFreqWeeks(0); setFreqDays(0);
      setStartDate(todayISO());
    }
    setError("");
  }, [open, editing]);

  const filteredCategories = useMemo(
    () => categories.filter((c) => !c.type || c.type === type),
    [categories, type],
  );

  const totalFreq = freqYears + freqMonths + freqWeeks + freqDays;
  const isValid = useMemo(
    () => name.trim().length > 0 && parseFloat(amount) > 0 && totalFreq > 0 && startDate,
    [name, amount, totalFreq, startDate],
  );

  // Preview: show next 3 execution dates
  const previewDates = useMemo(() => {
    if (!startDate || totalFreq === 0) return [];
    const dates: string[] = [];
    for (let i = 0; i < 3; i++) {
      dates.push(addInterval(startDate, freqYears, freqMonths, freqWeeks, freqDays, i));
    }
    return dates;
  }, [startDate, freqYears, freqMonths, freqWeeks, freqDays, totalFreq]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      if (editing) {
        const dto: ScheduledTransactionUpdateDto = {
          name: name.trim(), amount: parseFloat(amount), type,
          accountId: accountId || undefined, categoryId: categoryId || undefined,
          affectsBalance, freqYears, freqMonths, freqWeeks, freqDays, startDate,
        };
        await scheduledTransactionService.update(editing.id, dto);
      } else {
        const dto: ScheduledTransactionDto = {
          name: name.trim(), amount: parseFloat(amount), type,
          accountId: accountId || undefined, categoryId: categoryId || undefined,
          affectsBalance, freqYears, freqMonths, freqWeeks, freqDays, startDate,
        };
        await scheduledTransactionService.create(dto);
      }
      onSaved();
      onClose();
    } catch {
      setError(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
              <CalendarClock className="h-5 w-5 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {editing ? t("scheduled.edit") : t("scheduled.create")}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              {t("scheduled.name")} <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("scheduled.namePlaceholder")}
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
            />
          </div>

          {/* Amount + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">
                {t("scheduled.amount")} <span className="text-red-400">*</span>
              </label>
              <input
                type="number" min="0.01" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">{t("scheduled.type")}</label>
              <select
                value={type} onChange={(e) => setType(e.target.value as TransactionType)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
              >
                <option value="EXPENSE">{t("transactions.expense")}</option>
                <option value="INCOME">{t("transactions.income")}</option>
              </select>
            </div>
          </div>

          {/* Frequency — 4 fields */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              {t("scheduled.frequency")} <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <input
                  type="number" min="0" value={freqYears}
                  onChange={(e) => setFreqYears(Math.max(0, parseInt(e.target.value) || 0))}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-2 text-center text-sm outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                />
                <span className="mt-0.5 block text-xs text-slate-400">{t("scheduled.years")}</span>
              </div>
              <div className="text-center">
                <input
                  type="number" min="0" value={freqMonths}
                  onChange={(e) => setFreqMonths(Math.max(0, parseInt(e.target.value) || 0))}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-2 text-center text-sm outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                />
                <span className="mt-0.5 block text-xs text-slate-400">{t("scheduled.months")}</span>
              </div>
              <div className="text-center">
                <input
                  type="number" min="0" value={freqWeeks}
                  onChange={(e) => setFreqWeeks(Math.max(0, parseInt(e.target.value) || 0))}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-2 text-center text-sm outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                />
                <span className="mt-0.5 block text-xs text-slate-400">{t("scheduled.weeks")}</span>
              </div>
              <div className="text-center">
                <input
                  type="number" min="0" value={freqDays}
                  onChange={(e) => setFreqDays(Math.max(0, parseInt(e.target.value) || 0))}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-2 text-center text-sm outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                />
                <span className="mt-0.5 block text-xs text-slate-400">{t("scheduled.days")}</span>
              </div>
            </div>
          </div>

          {/* Start date */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              {t("scheduled.startDate")} <span className="text-red-400">*</span>
            </label>
            <input
              type="date" value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
            />
          </div>

          {/* Preview message */}
          {totalFreq > 0 && startDate && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold text-amber-700">
                {frequencyText(t, freqYears, freqMonths, freqWeeks, freqDays)}
              </p>
              <p className="mt-1 text-xs text-amber-600">
                {t("scheduled.previewDates")}{" "}
                {previewDates.map((d, i) => (
                  <span key={i}>
                    {i > 0 && " → "}
                    <strong>{formatDate(d)}</strong>
                  </span>
                ))}
                {" → ..."}
              </p>
            </div>
          )}

          {/* Account */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              {t("scheduled.account")}
              <span className="ml-1 text-xs font-normal text-slate-400">(opcional)</span>
            </label>
            <select
              value={accountId} onChange={(e) => { setAccountId(e.target.value); if (!e.target.value) setAffectsBalance(false); }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
            >
              <option value="">{t("txPage.selectAccount")}</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              {t("scheduled.category")}
              <span className="ml-1 text-xs font-normal text-slate-400">(opcional)</span>
            </label>
            <select
              value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
            >
              <option value="">{t("txPage.selectCategory")}</option>
              {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Affects balance */}
          <label className={`flex items-center gap-2.5 ${accountId ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
            <input
              type="checkbox" checked={affectsBalance}
              onChange={(e) => setAffectsBalance(e.target.checked)}
              disabled={!accountId}
              className="h-4.5 w-4.5 rounded border-slate-300 text-sky-500 focus:ring-sky-200"
            />
            <span className="text-sm font-medium text-slate-700">{t("transactions.affectsBalance")}</span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-cancel-draw">{t("common.cancel")}</button>
            <button
              type="submit" disabled={!isValid || submitting}
              className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? t("common.loading") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────

export default function ScheduledTransactionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [items, setItems] = useState<ScheduledTransactionResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageRef = useRef(0);

  const [fireMsg, setFireMsg] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduledTransactionResponseDto | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async (p: number, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await scheduledTransactionService.getAll(p, PAGE_SIZE);
      setItems(data.content);
      setTotalPages(data.totalPages || 1);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fire = async () => {
      try {
        const result = await scheduledTransactionService.firePending();
        if (result.created > 0) {
          setFireMsg(t("scheduled.fireResult", { count: result.created }));
        }
      } catch { /* ignore */ }
      fetchItems(0);
    };
    void fire();
  }, [fetchItems, t]);

  useEffect(() => {
    const interval = setInterval(() => fetchItems(pageRef.current, false), 120_000);
    const handleVis = () => {
      if (document.visibilityState === "visible") fetchItems(pageRef.current, false);
    };
    document.addEventListener("visibilitychange", handleVis);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", handleVis); };
  }, [fetchItems]);

  const handlePageChange = (p: number) => {
    const zp = p - 1;
    setPage(zp); pageRef.current = zp;
    fetchItems(zp);
  };

  const handleToggleActive = async (item: ScheduledTransactionResponseDto) => {
    try {
      await scheduledTransactionService.update(item.id, { active: !item.active });
      fetchItems(pageRef.current, false);
    } catch { /* ignore */ }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await scheduledTransactionService.remove(deleteId);
      setDeleteId(null);
      const newItems = items.filter((i) => i.id !== deleteId);
      if (newItems.length === 0 && page > 0) {
        const prev = page - 1;
        setPage(prev); pageRef.current = prev;
        fetchItems(prev);
      } else {
        fetchItems(pageRef.current, false);
      }
    } catch { /* ignore */ }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      {fireMsg && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700">
          <span>{fireMsg}</span>
          <button onClick={() => setFireMsg(null)} className="text-amber-400 hover:text-amber-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="rounded-xl bg-white px-5 py-4">
        <button onClick={() => navigate(ROUTES.TRANSACTIONS)} className="tx-back-btn mb-2">
          <span className="tx-back-btn-inner">
            <span className="tx-back-btn-text">
              {t("nav.backToTransactions", "Transacciones")}
            </span>
          </span>
        </button>
        <PageHeader
          left={<CalendarClock className="h-8 w-8 text-amber-500" />}
          title={t("scheduled.title")}
          actions={
            <div className="flex items-center gap-3">
              <button onClick={() => { setEditing(null); setFormOpen(true); }} className="sched-new-btn">
                <Plus className="sched-new-icon relative z-10 h-4 w-4" />
                <span className="relative z-10">{t("scheduled.create")}</span>
              </button>
            </div>
          }
        />
        <p className="mt-1 text-sm text-slate-400">{t("scheduled.subtitle")}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center text-slate-400">
          <CalendarClock className="h-10 w-10 opacity-40" />
          <div>
            <p className="font-semibold">{t("scheduled.noScheduled")}</p>
            <p className="mt-0.5 text-sm">{t("scheduled.noScheduledDesc")}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden grid-cols-12 gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:grid">
              <div className="col-span-1">{t("scheduled.type")}</div>
              <div className="col-span-3">{t("scheduled.name")}</div>
              <div className="col-span-2">{t("scheduled.frequency")}</div>
              <div className="col-span-2">{t("scheduled.nextExecution")}</div>
              <div className="col-span-1 text-right">{t("scheduled.amount")}</div>
              <div className="col-span-1 text-center"></div>
              <div className="col-span-2 text-right"></div>
            </div>

            <ul className="divide-y divide-slate-100">
              {items.map((item) => (
                <li key={item.id} className={`grid grid-cols-12 items-center gap-2 px-5 py-3 transition-colors duration-150 hover:bg-slate-50/60 ${!item.active ? "opacity-50" : ""}`}>
                  <div className="col-span-1 flex items-center">
                    {item.type === "EXPENSE"
                      ? <ArrowDownCircle className="h-5 w-5 text-red-400" />
                      : <ArrowUpCircle className="h-5 w-5 text-emerald-400" />}
                  </div>
                  <div className="col-span-3">
                    <p className="truncate text-sm font-medium text-slate-700">{item.name}</p>
                    <p className="truncate text-xs text-slate-400">
                      {[item.categoryName, item.accountName].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="sched-freq-badge">
                      {frequencyText(t, item.freqYears, item.freqMonths, item.freqWeeks, item.freqDays)}
                    </span>
                  </div>
                  <div className="col-span-2 text-sm text-slate-500">
                    {item.active && item.nextExecution ? formatDate(item.nextExecution) : "—"}
                  </div>
                  <div className={`col-span-1 text-right text-sm font-semibold ${item.type === "EXPENSE" ? "text-red-500" : "text-emerald-500"}`}>
                    {item.type === "EXPENSE" ? "-" : "+"}{item.amount.toFixed(2)} €
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <span className={`sched-pill ${item.active ? "sched-pill-active" : "sched-pill-paused"}`}>
                      {item.active ? t("scheduled.active") : t("scheduled.paused")}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <button onClick={() => handleToggleActive(item)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title={item.active ? t("scheduled.paused") : t("scheduled.active")}>
                      {item.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button onClick={() => { setEditing(item); setFormOpen(true); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600" title={t("common.edit")}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleteId(item.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500" title={t("common.delete")}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <Pagination currentPage={page + 1} totalPages={totalPages} onPageChange={handlePageChange} />
        </>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setDeleteId(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="text-sm text-slate-600">{t("scheduled.deleteConfirm")}</p>
            <div className="mt-4 flex items-center justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-cancel-draw">{t("common.cancel")}</button>
              <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60">
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      <ScheduledFormDialog
        open={formOpen} editing={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={() => fetchItems(pageRef.current, false)}
      />
    </div>
  );
}
