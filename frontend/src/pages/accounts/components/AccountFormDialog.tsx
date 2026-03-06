import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2, X } from "lucide-react";
import type { AccountDto, AccountSummaryDto, AccountType } from "@/types";
import { accountService } from "@/backend/accountService";
import { typeIcon } from "../utils";

interface AccountFormDialogProps {
  open: boolean;
  initial?: AccountSummaryDto | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AccountFormDialog({ open, initial, onClose, onSaved }: AccountFormDialogProps) {
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
