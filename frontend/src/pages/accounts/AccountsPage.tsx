import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Building2,
  Check,
  CreditCard,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import type {
  AccountDto,
  AccountSummaryDto,
  AccountType,
  TransactionSummaryDto,
} from "@/types";
import { accountService } from "@/backend/accountService";
import { transactionService } from "@/backend/transactionService";
import { ROUTES } from "@/config/routes";

const MAX_ACCOUNTS = 5;

// ── Helpers ──────────────────────────────────────────────────────────────

function typeIcon(type: AccountType) {
  if (type === "BANK") return <Building2 className="h-5 w-5" />;
  if (type === "CASH") return <Wallet className="h-5 w-5" />;
  return <CreditCard className="h-5 w-5" />;
}

function typeBg(type: AccountType) {
  if (type === "BANK") return "bg-sky-100 text-sky-700";
  if (type === "CASH") return "bg-emerald-100 text-emerald-700";
  return "bg-violet-100 text-violet-700";
}

function fmtAmount(n: number, currency: string, type?: "EXPENSE" | "INCOME") {
  const sign = type === "EXPENSE" ? "−" : type === "INCOME" ? "+" : "";
  return `${sign}${Math.abs(n).toFixed(2)} ${currency}`;
}

// ── Account form dialog ──────────────────────────────────────────────────

interface AccountFormDialogProps {
  open: boolean;
  initial?: AccountSummaryDto | null;
  onClose: () => void;
  onSaved: () => void;
}

function AccountFormDialog({ open, initial, onClose, onSaved }: AccountFormDialogProps) {
  const { t } = useTranslation();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<AccountType>(initial?.type ?? "CASH");
  const [currency, setCurrency] = useState(initial?.currency ?? "EUR");
  const [setDefault, setSetDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setType(initial?.type ?? "CASH");
      setCurrency(initial?.currency ?? "EUR");
      setSetDefault(false);
      setError("");
    }
  }, [open, initial]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError(t("common.error")); return; }
    if (!/^[A-Z]{3}$/.test(currency.toUpperCase())) {
      setError(t("accountsPage.currencyError"));
      return;
    }
    setLoading(true);
    setError("");
    const dto: AccountDto = {
      name: name.trim(),
      type,
      currency: currency.toUpperCase(),
      setDefault: setDefault || undefined,
    };
    try {
      if (isEdit && initial) {
        await accountService.update(initial.id, dto);
      } else {
        await accountService.create(dto);
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
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            {isEdit ? t("accountsPage.editAccount") : t("accountsPage.newAccount")}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">{t("accounts.name")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder={t("accountsPage.namePlaceholder")}
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              required
            />
          </div>

          {/* Type */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">{t("accounts.type")}</label>
            <div className="grid grid-cols-3 gap-2">
              {(["CASH", "BANK", "OTHER"] as AccountType[]).map((t_) => (
                <button
                  key={t_}
                  type="button"
                  onClick={() => setType(t_)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border-2 py-2 text-sm font-medium transition ${
                    type === t_
                      ? "border-sky-500 bg-sky-50 text-sky-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {typeIcon(t_)}
                  {t(`accounts.types.${t_}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Currency */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">{t("accounts.currency")}</label>
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
              maxLength={3}
              placeholder="EUR"
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-mono uppercase outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          {/* Set default (only on create) */}
          {!isEdit && (
            <label className="flex cursor-pointer items-center gap-3">
              <div
                onClick={() => setSetDefault((v) => !v)}
                className={`flex h-5 w-5 items-center justify-center rounded border-2 transition ${
                  setDefault ? "border-sky-500 bg-sky-500" : "border-slate-300"
                }`}
              >
                {setDefault && <Check className="h-3 w-3 text-white" />}
              </div>
              <span className="text-sm text-slate-600">{t("accountsPage.setDefaultLabel")}</span>
            </label>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* Actions */}
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

// ── Account card ──────────────────────────────────────────────────────────

interface AccountCardProps {
  account: AccountSummaryDto;
  onEdit: (a: AccountSummaryDto) => void;
  onDelete: (a: AccountSummaryDto) => void;
  onSetDefault: (a: AccountSummaryDto) => void;
  onClearDefault: () => void;
}

function AccountCard({ account, onEdit, onDelete, onSetDefault, onClearDefault }: AccountCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [txs, setTxs] = useState<TransactionSummaryDto[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  useEffect(() => {
    setTxLoading(true);
    transactionService
      .getAll({ accountId: account.id })
      .then((data) => {
        const sorted = [...data].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setTxs(sorted.slice(0, 5));
      })
      .catch(() => setTxs([]))
      .finally(() => setTxLoading(false));
  }, [account.id]);

  const balanceColor =
    account.balance < 0 ? "text-red-500" : "text-slate-800";

  const handleViewAll = () => {
    navigate(ROUTES.TRANSACTIONS, { state: { accountId: account.id } });
  };

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      {/* DEFAULT ribbon */}
      {account.isDefault && (
        <div className="absolute left-0 top-0 z-10">
          <span className="inline-block rounded-br-lg bg-gradient-to-r from-sky-500 to-emerald-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
            {t("accounts.setDefault")}
          </span>
        </div>
      )}

      {/* Card header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3 mt-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${typeBg(account.type)}`}>
            {typeIcon(account.type)}
          </div>
          <div>
            <p className="font-semibold text-slate-800">{account.name}</p>
            <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${typeBg(account.type)}`}>
              {t(`accounts.types.${account.type}`)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center gap-1">
          {!account.isDefault && (
            <button
              onClick={() => onSetDefault(account)}
              title={t("accounts.setDefault")}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          {account.isDefault && (
            <button
              onClick={() => onClearDefault()}
              title={t("accounts.clearDefault")}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onEdit(account)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-sky-50 hover:text-sky-600"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(account)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Balance */}
      <div className="px-5 pb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t("accounts.balance")}
        </p>
        <p className={`mt-0.5 text-2xl font-bold tabular-nums ${balanceColor}`}>
          {account.balance.toFixed(2)}{" "}
          <span className="text-sm font-semibold text-slate-400">{account.currency}</span>
        </p>
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-slate-100" />

      {/* Recent transactions */}
      <div className="flex-1 px-5 pt-3 pb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t("accountsPage.recentActivity")}
          </span>
          <button
            onClick={handleViewAll}
            className="text-xs font-medium text-sky-500 hover:text-sky-700"
          >
            {t("accountsPage.viewAll")}
          </button>
        </div>

        {txLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-slate-300" />
          </div>
        ) : txs.length === 0 ? (
          <p className="py-3 text-center text-xs text-slate-400">
            {t("accountsPage.noTransactions")}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {txs.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {tx.type === "EXPENSE" ? (
                    <ArrowDownCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
                  ) : (
                    <ArrowUpCircle className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-700">{tx.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(tx.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <span
                  className={`flex-shrink-0 text-sm font-semibold tabular-nums ${
                    tx.type === "EXPENSE" ? "text-red-500" : "text-emerald-500"
                  }`}
                >
                  {fmtAmount(tx.amount, account.currency, tx.type)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Empty slot card ──────────────────────────────────────────────────────

function EmptyAccountCard({ onAdd }: { onAdd: () => void }) {
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
        <p className="font-semibold">{t("accountsPage.connectNew")}</p>
        <p className="mt-0.5 text-xs">{t("accountsPage.connectNewDesc")}</p>
      </div>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const { t } = useTranslation();

  const [accounts, setAccounts] = useState<AccountSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AccountSummaryDto | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      setAccounts(await accountService.getAll());
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleSaved = () => {
    setFormOpen(false);
    setEditTarget(null);
    fetchAccounts();
  };

  const handleEdit = (a: AccountSummaryDto) => {
    setEditTarget(a);
    setFormOpen(true);
  };

  const handleDelete = async (a: AccountSummaryDto) => {
    if (deleteConfirm !== a.id) { setDeleteConfirm(a.id); return; }
    try { await accountService.remove(a.id); } catch { /* ignore */ }
    setDeleteConfirm(null);
    fetchAccounts();
  };

  const handleSetDefault = async (a: AccountSummaryDto) => {
    try { await accountService.setDefault(a.id); fetchAccounts(); } catch { /* ignore */ }
  };

  const handleClearDefault = async () => {
    try { await accountService.clearDefault(); fetchAccounts(); } catch { /* ignore */ }
  };

  // ── Summary numbers ──
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const liquidAssets = accounts.reduce((s, a) => s + Math.max(0, a.balance), 0);
  const totalLiabilities = accounts.reduce((s, a) => s + Math.min(0, a.balance), 0);

  const defaultCurrency =
    accounts.find((a) => a.isDefault)?.currency ??
    accounts[0]?.currency ??
    "EUR";

  const canAdd = accounts.length < MAX_ACCOUNTS;

  return (
    <>
      <div className="space-y-6">
        {/* ── Page header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{t("accounts.title")}</h1>
            <p className="mt-0.5 text-sm text-slate-400">
              {t("accountsPage.accountCount", {
                current: accounts.length,
                max: MAX_ACCOUNTS,
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAccounts}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            {canAdd && (
              <button
                onClick={() => { setEditTarget(null); setFormOpen(true); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                {t("accounts.create")}
              </button>
            )}
          </div>
        </div>

        {/* ── Summary banner ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-500 p-6 text-white shadow-lg">
          {/* Decorative circle */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-8 right-24 h-32 w-32 rounded-full bg-white/10" />

          <div className="relative grid grid-cols-1 gap-6 sm:grid-cols-3">
            {/* Total */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                {t("accountsPage.totalNetWorth")}
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums">
                {totalBalance.toFixed(2)}{" "}
                <span className="text-base font-semibold opacity-80">{defaultCurrency}</span>
              </p>
              <p className="mt-0.5 text-xs text-white/60">
                {t("accountsPage.activeAccounts", { count: accounts.length })}
              </p>
            </div>

            {/* Liquid assets */}
            <div className="rounded-xl bg-white/15 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                {t("accountsPage.liquidAssets")}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {liquidAssets.toFixed(2)}{" "}
                <span className="text-sm font-semibold opacity-80">{defaultCurrency}</span>
              </p>
            </div>

            {/* Liabilities */}
            <div className="rounded-xl bg-white/15 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                {t("accountsPage.totalLiabilities")}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {totalLiabilities.toFixed(2)}{" "}
                <span className="text-sm font-semibold opacity-80">{defaultCurrency}</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Max warning ── */}
        {!canAdd && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700">
            {t("accounts.maxAccounts")}
          </p>
        )}

        {/* ── Account grid ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {accounts.map((a) => (
              <div key={a.id} className="relative">
                {/* Delete confirm overlay */}
                {deleteConfirm === a.id && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/95 backdrop-blur-sm">
                    <p className="text-sm font-semibold text-slate-700">
                      {t("accounts.deleteConfirm")}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        onClick={() => handleDelete(a)}
                        className="rounded-lg bg-red-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </div>
                )}
                <AccountCard
                  account={a}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onSetDefault={handleSetDefault}
                  onClearDefault={handleClearDefault}
                />
              </div>
            ))}

            {/* Empty slot */}
            {canAdd && (
              <EmptyAccountCard
                onAdd={() => { setEditTarget(null); setFormOpen(true); }}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Create / Edit dialog ── */}
      <AccountFormDialog
        open={formOpen}
        initial={editTarget}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        onSaved={handleSaved}
      />
    </>
  );
}

