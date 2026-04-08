import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";

interface EmptyAccountCardProps {
  onAdd: () => void;
  currentCount: number;
}

export default function EmptyAccountCard({ onAdd, currentCount }: EmptyAccountCardProps) {
  const { t } = useTranslation();
  const isFull = currentCount >= 5;

  return (
    <button
      onClick={isFull ? undefined : onAdd}
      disabled={isFull}
      className={`app-add-dashed flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed py-12 transition ${
        isFull
          ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
          : "border-slate-200 bg-white text-slate-400 hover:border-sky-300 hover:bg-sky-50/50 hover:text-sky-500"
      }`}
    >
      <div className={`app-add-dashed-ring flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-current ${isFull ? 'bg-slate-100' : ''}`}>
        <Plus className="h-7 w-7" />
      </div>
      <div className="text-center">
        <p className="font-semibold flex items-center justify-center gap-1">
          {t("accounts.create")}
        </p>
        <p className="mt-0.5 text-xs">
          {isFull ? "no más cuentas disponibles" : `${currentCount} de 5 cuentas`}
        </p>
      </div>
    </button>
  );
}
