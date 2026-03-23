import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowDownCircle, ArrowUpCircle, Check, Download, Pencil, SlidersHorizontal, Trash2, Loader2 } from "lucide-react";
import type { AccountSummaryDto, TransactionSummaryDto } from "@/types";
import { transactionService } from "@/backend/transactionService";
import { ROUTES } from "@/config/routes";
import { typeIcon, typeHeaderBg, fmtAmount } from "../utils";
import BankConnectionPanel from "./BankConnectionPanel";
import BankRulesPanel from "./BankRulesPanel";

interface AccountCardProps {
  account: AccountSummaryDto;
  onEdit: (a: AccountSummaryDto) => void;
  onDelete: (a: AccountSummaryDto) => void;
  onSetDefault: (a: AccountSummaryDto) => void;
  onClearDefault: () => void;
  onSynced?: () => void;
}

export default function AccountCard({
  account,
  onEdit,
  onDelete,
  onSetDefault,
  onClearDefault,
  onSynced,
}: AccountCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [txs, setTxs] = useState<TransactionSummaryDto[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txRefresh, setTxRefresh] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    transactionService
      .getAll({ accountId: account.id }, 0, 5)
      .then((data) => {
        // Fix: Use data.content since it is server-paged
        const sorted = [...data.content].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setTxs(sorted.slice(0, 5));
      })
      .catch(() => setTxs([]))
      .finally(() => setTxLoading(false));
  }, [account.id, txRefresh]);

  const balanceColor = account.balance < 0 ? "text-red-500" : "text-slate-800";

  const handleViewAll = () => {
    navigate(ROUTES.TRANSACTIONS, { state: { accountId: account.id } });
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await transactionService.exportCsv(account.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${account.name.replace(/[^a-zA-Z0-9]/g, "_")}_transactions.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      {/* Thin color stripe */}
      <div className={`${typeHeaderBg(account.type)} h-1 w-full`} />

      {/* Body */}
      <div className="flex flex-1 flex-col">
        {/* Header row: name + actions */}
        <div className="flex items-center justify-between px-5 pt-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700`}>{typeIcon(account.type)}</div>
            <div>
              <p className="font-semibold text-slate-800 text-base">{account.name}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">{t(`accounts.types.${account.type}`)}</span>
                {account.isDefault && (
                  <span className="text-[10px] font-semibold text-sky-500">· {t("accounts.default", "Predeterminada")}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {!account.isDefault && (
              <button
                onClick={() => onSetDefault(account)}
                title={t("accounts.setDefault", "Establecer como predeterminada")}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
            {account.isDefault && (
              <button
                onClick={() => onClearDefault()}
                title={t("accounts.clearDefault", "Quitar predeterminada")}
                className="ring-anim"
              >
                <div className="ring-inner">
                  <Check className="h-2.5 w-2.5 text-sky-600" />
                </div>
              </button>
            )}
            {account.type === "BANK" && (
              <button
                onClick={() => setRulesOpen(true)}
                className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-sky-50 hover:text-sky-600"
                title="Reglas bancarias"
              >
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal className="h-4 w-4" />
                  Reglas
                </span>
              </button>
            )}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
              title={t("csv.export")}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => onEdit(account)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-sky-50 hover:text-sky-600"
            >
              <Pencil className="btn-edit-icon h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(account)}
              className="tx-squishy-tech tx-squishy-expense p-1.5 ml-1"
              title={t("common.delete")}
            >
              <Trash2 className="tx-squishy-icon relative z-10 h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Balance (below name) */}
        <div className="px-5 pt-3 pb-3">
          <p className={`text-[10px] font-bold uppercase tracking-wider ${balanceColor} opacity-90`}>{t("accounts.balance")}</p>
          <p className={`mt-0.5 text-3xl font-bold tabular-nums tracking-tight ${balanceColor}`}>
            {fmtAmount(account.balance, account.currency)}
          </p>
        </div>

        {/* Divider */}
        <div className="mx-5 border-t border-slate-100" />

        {/* Recent transactions */}
        <div className="flex-1 px-5 pt-2 pb-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t("accountsPage.recentActivity")}
            </span>
            <button
              onClick={handleViewAll}
              className="text-xs font-semibold text-sky-500 transition hover:text-sky-600"
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
                <li key={tx.id} className="flex items-center justify-between gap-2 rounded-lg p-1 transition hover:bg-slate-50">
                  <div className="flex min-w-0 items-center gap-2">
                    {tx.type === "EXPENSE" ? (
                      <ArrowDownCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
                    ) : (
                      <ArrowUpCircle className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-700">{tx.name}</p>
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
                    className={`flex-shrink-0 text-sm font-bold tabular-nums ${
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

      {/* Panel de conexión bancaria (solo para cuentas BANK) */}
      {account.type === "BANK" && (
        <>
          <div className="mx-5 border-t border-slate-100" />
          <BankConnectionPanel
            accountId={account.id}
            onSynced={() => {
              setTxLoading(true);
              setTxRefresh((v) => v + 1);
              onSynced?.();
            }}
          />
          <BankRulesPanel
            account={account}
            open={rulesOpen}
            onClose={() => setRulesOpen(false)}
            onRulesChanged={() => {
              setTxLoading(true);
              setTxRefresh((v) => v + 1);
            }}
          />
        </>
      )}
    </div>
  );
}
