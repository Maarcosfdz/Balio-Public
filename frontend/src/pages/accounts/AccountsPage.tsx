import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, Loader2 } from "lucide-react";
import { ToastBanner } from "@/components/ui/toast-banner";
import type { AccountSummaryDto } from "@/types";
import { accountService } from "@/backend/accountService";
import { transactionService } from "@/backend/transactionService";

import AccountCard from "./components/AccountCard";
import EmptyAccountCard from "./components/EmptyAccountCard";
import AccountsSummary from "./components/AccountsSummary";
import AccountFormDialog from "./components/AccountFormDialog";
import ImportCsvModal from "./components/ImportCsvModal";

const MAX_ACCOUNTS = 5;

interface DeleteState {
  account: AccountSummaryDto;
  deleteTransactions: boolean;
  confirmName: string;
  submitting: boolean;
  error: string;
}

export default function AccountsPage() {
  const { t } = useTranslation();

  const [searchParams, setSearchParams] = useSearchParams();
  const [linkedBanner, setLinkedBanner] = useState(false);
  const [linkError, setLinkError] = useState(false);

  const [accounts, setAccounts] = useState<AccountSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AccountSummaryDto | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const fetchAccounts = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const raw = await accountService.getAll();
      // Normalize: ensure exactly one visual default when there are accounts.
      // If backend returns none marked, fallback to the first account.
      const firstDefault = raw.find((a) => a.isDefault)?.id ?? raw[0]?.id ?? null;
      const normalized = raw.map((a) => ({ ...a, isDefault: firstDefault ? a.id === firstDefault : false }));
      setAccounts(normalized);
    } catch {
      setAccounts([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Detect return from Enable Banking callback (?linked=true / ?link_error=true)
  useEffect(() => {
    if (searchParams.get("linked") === "true") {
      setLinkedBanner(true);
      setSearchParams({}, { replace: true });
      fetchAccounts();
      const timer = setTimeout(() => setLinkedBanner(false), 5000);
      return () => clearTimeout(timer);
    }
    if (searchParams.get("link_error") === "true") {
      setLinkError(true);
      setSearchParams({}, { replace: true });
      const timer = setTimeout(() => setLinkError(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, setSearchParams, fetchAccounts]);

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

  const openDeleteDialog = (account: AccountSummaryDto) => {
    setDeleteState({
      account,
      deleteTransactions: false,
      confirmName: "",
      submitting: false,
      error: "",
    });
  };

  const closeDeleteDialog = () => {
    setDeleteState(null);
  };

  const handleDelete = async () => {
    if (!deleteState || deleteState.submitting) return;

    setDeleteState((current) => current ? { ...current, submitting: true, error: "" } : current);

    try {
      await accountService.remove(deleteState.account.id, {
        deleteTransactions: deleteState.deleteTransactions,
      });
      setDeleteState(null);
      fetchAccounts();
    } catch {
      setDeleteState((current) => current ? {
        ...current,
        submitting: false,
        error: "No se pudo eliminar la cuenta. Inténtalo de nuevo.",
      } : current);
    }
  };

  const handleSetDefault = async (a: AccountSummaryDto) => {
    try { await accountService.setDefault(a.id); fetchAccounts(); } catch { /* ignore */ }
  };

  const handleClearDefault = async () => {
    try { await accountService.clearDefault(); fetchAccounts(); } catch { /* ignore */ }
  };

  const handleExportAll = async () => {
    for (const a of accounts) {
      try {
        const blob = await transactionService.exportCsv(a.id);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${a.name.replace(/[^a-zA-Z0-9]/g, "_")}_transactions.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch { /* ignore */ }
    }
  };

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  const defaultCurrency =
    accounts.find((a) => a.isDefault)?.currency ??
    accounts[0]?.currency ??
    "EUR";

  const canAdd = accounts.length < MAX_ACCOUNTS;
  const canConfirmDelete = deleteState !== null
    && deleteState.confirmName.trim() === deleteState.account.name;

  return (
    <>
      <div className="space-y-6">
        {/* ── Linked bank account banner ── */}
        {linkedBanner && (
          <ToastBanner
            tone="success"
            message={t("accounts.linkedSynced", "¡Cuenta bancaria vinculada y sincronizada correctamente!")}
            onClose={() => setLinkedBanner(false)}
          />
        )}

        {/* ── Bank linking error banner ── */}
        {linkError && (
          <ToastBanner
            tone="error"
            message={t(
              "accounts.linkError",
              "Error al enlazar la cuenta bancaria. La cuenta se ha eliminado automáticamente. Inténtalo de nuevo.",
            )}
            onClose={() => setLinkError(false)}
          />
        )}

        {/* ── Hero + summary ── */}
        <AccountsSummary
          totalBalance={totalBalance}
          defaultCurrency={defaultCurrency}
          canAdd={canAdd}
          onAdd={() => { setEditTarget(null); setFormOpen(true); }}
          onImport={() => setImportOpen(true)}
          onExport={handleExportAll}
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
                <AccountCard
                  account={a}
                  onEdit={handleEdit}
                  onDelete={openDeleteDialog}
                  onSetDefault={handleSetDefault}
                  onClearDefault={handleClearDefault}
                  onSynced={() => fetchAccounts(false)}
                  onBalanceAdjusted={() => fetchAccounts(false)}
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

      <ImportCsvModal
        open={importOpen}
        accounts={accounts}
        onClose={() => setImportOpen(false)}
        onImported={() => fetchAccounts()}
      />

      {deleteState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/35 backdrop-blur-sm" onClick={closeDeleteDialog} />
          <div className="relative z-10 w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Eliminar cuenta</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Vas a eliminar la cuenta {deleteState.account.name}. Los enlaces bancarios y las reglas asociadas se borrarán automáticamente.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={deleteState.deleteTransactions}
                  onChange={(e) => setDeleteState((current) => current ? {
                    ...current,
                    deleteTransactions: e.target.checked,
                  } : current)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-red-500 focus:ring-red-200"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-700">Eliminar también las transacciones asociadas</span>
                  <span className="mt-1 block text-xs text-slate-400">
                    Si lo dejas desmarcado, las transacciones se conservarán pero quedarán sin cuenta asociada.
                  </span>
                </span>
              </label>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">
                  Escribe exactamente el nombre de la cuenta para confirmar
                </label>
                <input
                  type="text"
                  value={deleteState.confirmName}
                  onChange={(e) => setDeleteState((current) => current ? {
                    ...current,
                    confirmName: e.target.value,
                    error: "",
                  } : current)}
                  placeholder={deleteState.account.name}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
                />
              </div>

              {deleteState.error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {deleteState.error}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={deleteState.submitting}
                className="btn-cancel-draw flex-1 justify-center disabled:opacity-60"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canConfirmDelete || deleteState.submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteState.submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
