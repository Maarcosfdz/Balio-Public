import { Plus, Wallet } from "lucide-react";
import { fmtAmount } from "../utils";

interface AccountsSummaryProps {
  totalBalance: number;
  defaultCurrency: string;
  canAdd: boolean;
  onAdd: () => void;
  accountCount: number;
  maxAccounts: number;
}

export default function AccountsSummary({
  totalBalance,
  defaultCurrency,
  canAdd,
  onAdd,
  accountCount,
  maxAccounts,
}: AccountsSummaryProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-400 via-sky-500 to-emerald-500 p-6 text-white shadow-md">
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -right-10 -bottom-10 h-44 w-44 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute right-20 -bottom-2 h-28 w-28 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 rounded-full bg-white/5" />

      <div className="relative flex items-start justify-between gap-4">
        {/* Balance */}
        <div>
          <div className="mb-1 flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-white/70" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
              Patrimonio Total
            </p>
          </div>
          <p className="text-4xl font-bold tabular-nums tracking-tight">
            {fmtAmount(totalBalance, defaultCurrency)}
          </p>
          <p className="mt-1.5 text-xs text-white/60">
            {accountCount} de {maxAccounts} cuentas
          </p>
        </div>

        {/* Nueva cuenta button */}
        {canAdd && (
          <button
            onClick={onAdd}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/30 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Nueva cuenta
          </button>
        )}
      </div>
    </div>
  );
}
