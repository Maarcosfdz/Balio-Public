import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Wallet, Loader2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import type { AccountSummaryDto } from "@/types";
import { accountService } from "@/backend/accountService";

import AccountCard from "./components/AccountCard";
import EmptyAccountCard from "./components/EmptyAccountCard";
import AccountsSummary from "./components/AccountsSummary";
import AccountFormDialog from "./components/AccountFormDialog";

const MAX_ACCOUNTS = 5;

export default function AccountsPage() {
  const { t } = useTranslation();

  const [accounts, setAccounts] = useState<AccountSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AccountSummaryDto | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fetchAccounts = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const raw = await accountService.getAll();
      // Normalize: ensure at most one default (keep first found)
      const firstDefault = raw.find((a) => a.isDefault)?.id ?? null;
      const normalized = raw.map((a) => ({ ...a, isDefault: firstDefault ? a.id === firstDefault : !!a.isDefault }));
      setAccounts(normalized);
    } catch {
      setAccounts([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchAccounts();

    const interval = setInterval(() => {
      fetchAccounts(false);
    }, 30_000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchAccounts(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchAccounts]);

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

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  const defaultCurrency =
    accounts.find((a) => a.isDefault)?.currency ??
    accounts[0]?.currency ??
    "EUR";

  const canAdd = accounts.length < MAX_ACCOUNTS;

  return (
    <>
      <div className="space-y-6">
        {/* ── Page header ── */}
        <div className="rounded-xl bg-white px-5 py-4">
          <PageHeader
            left={<Wallet className="h-8 w-8 text-sky-500" />}
            title={t("accounts.title")}
          />
        </div>

        {/* ── Summary banner ── */}
        <AccountsSummary
          totalBalance={totalBalance}
          defaultCurrency={defaultCurrency}
          canAdd={canAdd}
          onAdd={() => { setEditTarget(null); setFormOpen(true); }}
          accountCount={accounts.length}
          maxAccounts={MAX_ACCOUNTS}
        />

        {/* ── Account grid ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
            <EmptyAccountCard
              onAdd={() => { setEditTarget(null); setFormOpen(true); }}
              currentCount={accounts.length}
            />
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
