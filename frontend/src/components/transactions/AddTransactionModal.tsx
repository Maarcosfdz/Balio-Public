import { type FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, CalendarDays, Check, ChevronDown, DollarSign, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import type {
  AccountSummaryDto,
  CategorySummaryDto,
  TransactionType,
  TransactionDto,
  TransactionResponseDto,
} from "@/types";
import { transactionService } from "@/backend/transactionService";
import { scheduledTransactionService } from "@/backend/scheduledTransactionService";
import { accountService } from "@/backend/accountService";
import { categoryService } from "@/backend/categoryService";
import CategoryCombobox from "@/components/ui/CategoryCombobox";

interface AddTransactionModalProps {
  type: TransactionType;
  open: boolean;
  onClose: () => void;
  onCreated: (tx: TransactionResponseDto) => void;
}

// ── Shared helpers for subcomponents ──────────────────────────────────
function _toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function _parseISO(s: string): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ── Date selector with portal ─────────────────────────────────────────
function ModalDatePicker({ date, onChange }: { date: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const updatePos = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const DROPDOWN_H = 340;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow >= DROPDOWN_H ? rect.bottom + 4 : rect.top - DROPDOWN_H - 4;
      const PICKER_W = 320;
      const clampedLeft = Math.min(rect.left, Math.max(0, window.innerWidth - PICKER_W - 8));
      setPortalStyle({ position: "fixed", top, left: clampedLeft, zIndex: 10000 });
    };
    updatePos();
    window.addEventListener("scroll", updatePos, { capture: true });
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, { capture: true });
      window.removeEventListener("resize", updatePos);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const portal = document.getElementById("modal-date-portal");
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        (!portal || !portal.contains(e.target as Node))
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const parsed = _parseISO(date);
  const displayText = parsed
    ? parsed.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
    : t("txPage.selectDate", "Select date");

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-10 w-full items-center gap-2 rounded-lg border px-3 text-sm transition ${
          open
            ? "border-sky-400 bg-white ring-2 ring-sky-100"
            : "border-slate-300 bg-slate-50 hover:border-sky-300 hover:bg-white"
        } ${date ? "text-slate-700" : "text-slate-400"}`}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="flex-1 text-left">{displayText}</span>
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div
          id="modal-date-portal"
          style={portalStyle}
          className="rounded-xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5"
        >
          <div
            style={{
              "--rdp-accent-color": "#0ea5e9",
              "--rdp-accent-background-color": "#e0f2fe",
            } as React.CSSProperties}
          >
            <DayPicker
              mode="single"
              selected={parsed}
              onSelect={(d) => { if (d) { onChange(_toISO(d)); setOpen(false); } }}
            />
          </div>
          <div className="border-t border-slate-100 px-4 pb-3 pt-2">
            <button
              type="button"
              onClick={() => { onChange(_toISO(new Date())); setOpen(false); }}
              className="tx-date-action-btn"
            >
              {t("txPage.today", "Hoy")}
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── Styled select with portal ─────────────────────────────────--------
function ModalSelect({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const updatePos = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const DROPDOWN_H = Math.min(options.length * 40 + 16, 200);
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow >= DROPDOWN_H ? rect.bottom + 4 : rect.top - DROPDOWN_H - 4;
      const clampedLeft = Math.min(rect.left, Math.max(0, window.innerWidth - rect.width - 8));
      setPortalStyle({ position: "fixed", top, left: clampedLeft, width: rect.width, zIndex: 10000 });
    };
    updatePos();
    window.addEventListener("scroll", updatePos, { capture: true });
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, { capture: true });
      window.removeEventListener("resize", updatePos);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const portal = document.getElementById("modal-select-portal");
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        (!portal || !portal.contains(e.target as Node))
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-10 w-full items-center gap-2 rounded-lg border px-3 text-sm transition ${
          open
            ? "border-sky-400 bg-white ring-2 ring-sky-100"
            : "border-slate-300 bg-slate-50 hover:border-sky-300 hover:bg-white"
        } ${value ? "text-slate-700" : "text-slate-400"}`}
      >
        <span className="flex-1 truncate text-left">{value ? selectedLabel : placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div
          id="modal-select-portal"
          style={portalStyle}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5"
        >
          <div className="max-h-48 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition hover:bg-slate-50 ${
                !value ? "font-semibold text-sky-600" : "text-slate-400"
              }`}
            >
              {placeholder}
            </button>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-sm transition hover:bg-slate-50 ${
                  opt.value === value ? "font-semibold text-sky-600" : "text-slate-700"
                }`}
              >
                {opt.label}
                {opt.value === value && <Check className="h-3.5 w-3.5 text-sky-500" />}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function AddTransactionModal({
  type,
  open,
  onClose,
  onCreated,
}: AddTransactionModalProps) {
  const { t } = useTranslation();
  const isExpense = type === "EXPENSE";

  // ── Data lists ──
  const [accounts, setAccounts] = useState<AccountSummaryDto[]>([]);
  const [categories, setCategories] = useState<CategorySummaryDto[]>([]);

  useEffect(() => {
    if (!open) return;
    accountService.getAll().then(setAccounts).catch(() => {});
    categoryService.getAll().then(setCategories).catch(() => {});
  }, [open]);

  // ── Form state ──
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO);
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [affectsBalance, setAffectsBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ── Scheduling state ──
  const [isRecurring, setIsRecurring] = useState(false);
  const [freqYears, setFreqYears] = useState(0);
  const [freqMonths, setFreqMonths] = useState(1);
  const [freqWeeks, setFreqWeeks] = useState(0);
  const [freqDays, setFreqDays] = useState(0);

  // Reset on open
  useEffect(() => {
    if (open) {
      setName("");
      setAmount("");
      setDate(todayISO());
      setAccountId("");
      setCategoryId(null);
      setAffectsBalance(true);
      setError("");
      setIsRecurring(false);
      setFreqYears(0); setFreqMonths(1); setFreqWeeks(0); setFreqDays(0);
    }
  }, [open]);

  // Auto-select the default account once per modal open session.
  // Using a ref prevents re-selecting after the user has deliberately cleared the field.
  const didAutoSelectRef = useRef(false);
  useEffect(() => { if (!open) didAutoSelectRef.current = false; }, [open]);
  useEffect(() => {
    if (!open || didAutoSelectRef.current || accounts.length === 0) return;
    didAutoSelectRef.current = true;
    const defaultAcc = accounts.find((a) => a.isDefault) ?? accounts[0];
    setAccountId(defaultAcc.id);
  }, [open, accounts]);

  const handleAccountChange = (v: string) => {
    setAccountId(v);
    if (!v) setAffectsBalance(false);
  };

  // Validation: only name and amount are required
  const isValid = useMemo(
    () => name.trim().length > 0 && parseFloat(amount) > 0,
    [name, amount]
  );

  // Filter categories to those matching this transaction type (or untyped)
  const filteredCategories = useMemo(
    () => categories.filter((c) => !c.type || c.type === type),
    [categories, type]
  );

  const handleCategoryCreated = useCallback((cat: CategorySummaryDto) => {
    setCategories((prev) =>
      prev.some((c) => c.id === cat.id) ? prev : [...prev, cat]
    );
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    setError("");

    const dto: TransactionDto = {
      name: name.trim(),
      amount: parseFloat(amount),
      accountId: accountId || undefined!,
      date,
      categoryId: categoryId ?? undefined,
      affectsBalance,
    };

    // Log request for debugging (mask sensitive data)
    if (import.meta.env.DEV) {
      console.log(
        `[AddTransaction] ${isExpense ? "EXPENSE" : "INCOME"} →`,
        { ...dto, _endpoint: isExpense ? "/transaction/expense" : "/transaction/income" }
      );
    }

    try {
      const created = isExpense
        ? await transactionService.createExpense(dto)
        : await transactionService.createIncome(dto);

      // Also create scheduled transaction if recurring toggle is on
      if (isRecurring && (freqYears + freqMonths + freqWeeks + freqDays) > 0) {
        try {
          await scheduledTransactionService.create({
            name: name.trim(),
            amount: parseFloat(amount),
            type,
            accountId: accountId || undefined,
            categoryId: categoryId ?? undefined,
            affectsBalance,
            freqYears, freqMonths, freqWeeks, freqDays,
            startDate: date,
          });
        } catch {
          // Don't block transaction creation if schedule fails
          if (import.meta.env.DEV) {
            console.warn("[AddTransaction] Schedule creation failed");
          }
        }
      }

      if (import.meta.env.DEV) {
        console.log("[AddTransaction] ✓ Created:", created.id);
      }
      onCreated(created);
      onClose();
    } catch (err: unknown) {
      // Enhanced error logging for debugging 403/network issues
      if (import.meta.env.DEV) {
        const axiosErr = err as { response?: { status: number; data: unknown }; message?: string };
        console.error("[AddTransaction] ✗ Error:", {
          status: axiosErr.response?.status,
          data: axiosErr.response?.data,
          message: axiosErr.message,
        });
      }
      setError(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const accentBg      = isExpense ? "bg-gradient-to-r from-rose-500 to-red-400"    : "bg-gradient-to-r from-sky-500 to-emerald-500";
  const accentText    = isExpense ? "text-rose-600"     : "text-sky-600";
  const accentHover   = isExpense ? "hover:opacity-90"  : "hover:opacity-90";
  const accentBadgeBg = isExpense ? "bg-rose-100"       : "bg-sky-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentBadgeBg}`}
            >
              <DollarSign className={`h-5 w-5 ${accentText}`} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {isExpense ? t("txPage.addExpense") : t("txPage.addIncome")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label={t("common.cancel")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Name / Concepto — FIRST FIELD */}
          <div className="space-y-1.5">
            <label htmlFor="tx-name" className="text-sm font-semibold text-slate-700">
              {isExpense ? t("txPage.expenseName") : t("txPage.incomeName")}
              <span className="text-red-400"> *</span>
            </label>
            <input
              id="tx-name"
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                isExpense
                  ? t("txPage.expenseNamePlaceholder")
                  : t("txPage.incomeNamePlaceholder")
              }
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
            />
          </div>

          {/* 2. Amount */}
          <div className="space-y-1.5">
            <label htmlFor="tx-amount" className="text-sm font-semibold text-slate-700">
              {t("transactions.amount")}
              <span className="text-red-400"> *</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                {t("common.currency")}
              </span>
              <input
                id="tx-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 pl-8 pr-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>

          {/* 3. Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              {t("transactions.date")}
            </label>
            <ModalDatePicker date={date} onChange={setDate} />
          </div>

          {/* 4. Account — OPTIONAL */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              {t("transactions.account")}
              <span className="ml-1 text-xs font-normal text-slate-400">(opcional)</span>
            </label>
            <ModalSelect
              value={accountId}
              onChange={handleAccountChange}
              options={accounts.map((acc) => ({ value: acc.id, label: acc.name }))}
              placeholder={t("txPage.selectAccount")}
            />
          </div>

          {/* 5. Category — OPTIONAL */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              {t("transactions.category")}
              <span className="ml-1 text-xs font-normal text-slate-400">(opcional)</span>
            </label>
            <CategoryCombobox
              categories={filteredCategories}
              value={categoryId}
              transactionType={type}
              onChange={setCategoryId}
              onCategoryCreated={handleCategoryCreated}
            />
          </div>

          {/* 6. Affects balance */}
          <label className={`flex items-center gap-2.5 ${accountId ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
            <input
              type="checkbox"
              checked={affectsBalance}
              onChange={(e) => setAffectsBalance(e.target.checked)}
              disabled={!accountId}
              className="h-4.5 w-4.5 rounded border-slate-300 text-sky-500 focus:ring-sky-200"
            />
            <div>
              <span className="text-sm font-medium text-slate-700">
                {t("transactions.affectsBalance")}
              </span>
              <p className="text-xs text-slate-400">
                {t("txPage.affectsBalanceDesc")}
              </p>
            </div>
          </label>

          {/* 7. Make recurring toggle */}
          <div className={`sched-toggle-section ${isRecurring ? "sched-toggle-active" : ""}`}>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-slate-300 text-amber-500 focus:ring-amber-200"
              />
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-amber-500" />
                <div>
                  <span className="text-sm font-medium text-slate-700">
                    {t("txPage.makeRecurring")}
                  </span>
                  <p className="text-xs text-slate-400">
                    {t("txPage.recurringDesc")}
                  </p>
                </div>
              </div>
            </label>

            {isRecurring && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center">
                    <input
                      type="number" min="0" value={freqYears}
                      onChange={(e) => setFreqYears(Math.max(0, parseInt(e.target.value) || 0))}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-center text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    />
                    <span className="mt-0.5 block text-xs text-slate-400">{t("scheduled.years")}</span>
                  </div>
                  <div className="text-center">
                    <input
                      type="number" min="0" value={freqMonths}
                      onChange={(e) => setFreqMonths(Math.max(0, parseInt(e.target.value) || 0))}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-center text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    />
                    <span className="mt-0.5 block text-xs text-slate-400">{t("scheduled.months")}</span>
                  </div>
                  <div className="text-center">
                    <input
                      type="number" min="0" value={freqWeeks}
                      onChange={(e) => setFreqWeeks(Math.max(0, parseInt(e.target.value) || 0))}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-center text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    />
                    <span className="mt-0.5 block text-xs text-slate-400">{t("scheduled.weeks")}</span>
                  </div>
                  <div className="text-center">
                    <input
                      type="number" min="0" value={freqDays}
                      onChange={(e) => setFreqDays(Math.max(0, parseInt(e.target.value) || 0))}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-center text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    />
                    <span className="mt-0.5 block text-xs text-slate-400">{t("scheduled.days")}</span>
                  </div>
                </div>
                {(freqYears + freqMonths + freqWeeks + freqDays) > 0 && date && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-xs font-semibold text-amber-700">
                      {t("scheduled.every")}{" "}
                      {[
                        freqYears > 0 ? `${freqYears} ${t(freqYears === 1 ? "scheduled.freqYear" : "scheduled.freqYears")}` : null,
                        freqMonths > 0 ? `${freqMonths} ${t(freqMonths === 1 ? "scheduled.freqMonth" : "scheduled.freqMonths")}` : null,
                        freqWeeks > 0 ? `${freqWeeks} ${t(freqWeeks === 1 ? "scheduled.freqWeek" : "scheduled.freqWeeks")}` : null,
                        freqDays > 0 ? `${freqDays} ${t(freqDays === 1 ? "scheduled.freqDay" : "scheduled.freqDays")}` : null,
                      ].filter(Boolean).join(` ${t("scheduled.and")} `)}
                    </p>
                    <p className="mt-0.5 text-xs text-amber-600">
                      {t("scheduled.previewDates")}{" "}
                      <strong>{new Date(date).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}</strong>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-cancel-draw"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={!isValid || submitting}
              className={`rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition ${accentBg} ${accentHover} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {submitting
                ? t("common.loading")
                : isExpense
                  ? t("txPage.saveExpense")
                  : t("txPage.saveIncome")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
