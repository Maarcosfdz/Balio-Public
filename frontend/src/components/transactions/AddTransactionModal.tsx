import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, DollarSign, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  AccountSummaryDto,
  CategorySummaryDto,
  TransactionType,
  TransactionDto,
  TransactionResponseDto,
} from "@/types";
import { transactionService } from "@/backend/transactionService";
import { accountService } from "@/backend/accountService";
import { categoryService } from "@/backend/categoryService";
import CategoryCombobox from "./CategoryCombobox";

interface AddTransactionModalProps {
  type: TransactionType;
  open: boolean;
  onClose: () => void;
  onCreated: (tx: TransactionResponseDto) => void;
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
    }
  }, [open]);

  // Pre-select first account
  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const isValid = useMemo(
    () => name.trim() && parseFloat(amount) > 0 && accountId,
    [name, amount, accountId]
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
      accountId,
      date,
      categoryId: categoryId ?? undefined,
      affectsBalance,
    };

    try {
      const created = isExpense
        ? await transactionService.createExpense(dto)
        : await transactionService.createIncome(dto);
      onCreated(created);
      onClose();
    } catch {
      setError(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const accentBg = isExpense ? "bg-red-500" : "bg-emerald-500";
  const accentText = isExpense ? "text-red-600" : "text-emerald-600";
  const accentHover = isExpense ? "hover:bg-red-600" : "hover:bg-emerald-600";

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
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                isExpense ? "bg-red-100" : "bg-emerald-100"
              }`}
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
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              {t("transactions.account")}
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
            >
              <option value="">{t("txPage.selectAccount")}</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              {t("transactions.category")}
            </label>
            <CategoryCombobox
              categories={categories}
              value={categoryId}
              transactionType={type}
              onChange={setCategoryId}
              onCategoryCreated={handleCategoryCreated}
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              {t("transactions.date")}
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
              />
              <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              {isExpense ? t("txPage.expenseName") : t("txPage.incomeName")}
            </label>
            <input
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

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              {t("transactions.amount")}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                {t("common.currency")}
              </span>
              <input
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

          {/* Affects balance */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={affectsBalance}
              onChange={(e) => setAffectsBalance(e.target.checked)}
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

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
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
