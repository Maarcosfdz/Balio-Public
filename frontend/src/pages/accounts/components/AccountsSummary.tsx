import { Download, Plus, Upload, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fmtAmount } from "../utils";

interface AccountsSummaryProps {
  totalBalance: number;
  defaultCurrency: string;
  canAdd: boolean;
  onAdd: () => void;
  onImport: () => void;
  onExport: () => void;
  accountCount: number;
  maxAccounts: number;
}

export default function AccountsSummary({
  totalBalance,
  defaultCurrency,
  canAdd,
  onAdd,
  onImport,
  onExport,
  accountCount,
  maxAccounts,
}: AccountsSummaryProps) {
  const { t } = useTranslation();
  return (
    <div className="accounts-hero-section">
      <div className="accounts-hero-inner">
        <div className="flex flex-wrap items-end justify-between gap-4">
          {/* Balance block */}
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-slate-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {t("accounts.totalBalance", "Patrimonio Total")}
              </p>
            </div>
            <p className="text-5xl font-extrabold tabular-nums tracking-tight text-slate-900">
              {fmtAmount(totalBalance, defaultCurrency)}
            </p>
            <p className="mt-1.5 text-xs text-slate-400">
              {accountCount} {t("accounts.of", "de")} {maxAccounts} {t("accounts.accounts", "cuentas")}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              onClick={onExport}
              className="accounts-glass-btn"
            >
              <Download className="h-4 w-4" />
              {t("csv.export", "Exportar")}
            </button>
            <button
              onClick={onImport}
              className="accounts-glass-btn"
            >
              <Upload className="h-4 w-4" />
              {t("csv.import", "Importar")}
            </button>
            {canAdd && (
              <button
                onClick={onAdd}
                className="accounts-glass-btn accounts-glass-btn--primary"
              >
                <Plus className="h-4 w-4" />
                {t("accounts.newAccount", "Nueva cuenta")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
