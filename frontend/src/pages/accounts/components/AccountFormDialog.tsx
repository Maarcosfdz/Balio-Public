import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2, Check, Loader2, Save, Search, X } from "lucide-react";
import type { AccountDto, AccountSummaryDto, AccountType } from "@/types";
import { accountService } from "@/backend/accountService";
import { bankService, type BankInstitution } from "@/backend/bankService";
import { typeIcon } from "../utils";
import { FieldError } from "@/components/ui/field-error";
import { GradientButton } from "@/components/ui/gradient-button";

interface AccountFormDialogProps {
  open: boolean;
  initial?: AccountSummaryDto | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AccountFormDialog({ open, initial, onClose, onSaved }: AccountFormDialogProps) {
  const { t } = useTranslation();
  const isEdit = !!initial;
  const isBankEdit = isEdit && initial?.type === "BANK";

  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<AccountType>(initial?.type ?? "CASH");
  const [currency, setCurrency] = useState(initial?.currency ?? "EUR");
  const [balance, setBalance] = useState<string>(initial ? initial.balance.toFixed(2) : "0.00");
  const [setDefault, setSetDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Bank picker state (only for new BANK accounts)
  const [selectedBank, setSelectedBank] = useState<BankInstitution | null>(null);
  const [institutions, setInstitutions] = useState<BankInstitution[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [institutionsError, setInstitutionsError] = useState<string | null>(null);
  const [institutionSearch, setInstitutionSearch] = useState("");

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setType(initial?.type ?? "CASH");
      setCurrency(initial?.currency ?? "EUR");
      setBalance(initial ? initial.balance.toFixed(2) : "0.00");
      setSetDefault(false);
      setLoading(false);
      setError("");
      setSelectedBank(null);
      setInstitutionSearch("");
    }
  }, [open, initial]);

  // When type switches to BANK while creating, lock currency to EUR; reset bank on type change
  useEffect(() => {
    if (!isEdit && type === "BANK") {
      setCurrency("EUR");
    }
    if (type !== "BANK") {
      setSelectedBank(null);
      setInstitutionSearch("");
    }
  }, [type, isEdit]);

  // Load institutions when type=BANK on new account
  const isBankCreate = !isEdit && type === "BANK" && open;
  useEffect(() => {
    if (!isBankCreate || institutions.length > 0) return;
    setLoadingInstitutions(true);
    setInstitutionsError(null);
    bankService
      .listAspsps("ES")
      .then((list) => {
        if (list.length === 0) setInstitutionsError("No se recibieron bancos del servidor.");
        setInstitutions(list);
      })
      .catch((err) => {
        setInstitutionsError(err?.response?.data?.message ?? "Error al cargar bancos");
        setInstitutions([]);
      })
      .finally(() => setLoadingInstitutions(false));
  }, [isBankCreate, institutions.length]);

  const filteredInstitutions = institutions.filter((i) =>
    i.name.toLowerCase().includes(institutionSearch.toLowerCase()),
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError(t("common.error")); return; }

    if (type === "BANK" && !isEdit && !selectedBank) {
      setError("Debes seleccionar un banco para vincular");
      return;
    }

    if (type !== "BANK" && !/^[A-Z]{3}$/.test(currency.toUpperCase())) {
      setError(t("accountsPage.currencyError"));
      return;
    }
    setLoading(true);
    setError("");
    const dto: AccountDto = {
      name: name.trim(),
      type,
      currency: type === "BANK" ? "EUR" : currency.toUpperCase(),
      setDefault: setDefault || undefined,
    };
    const parsedBalance = parseFloat(balance.replace(",", "."));

    try {
      if (isEdit && initial) {
        await accountService.update(initial.id, dto);
        // Adjust balance if changed and account is not BANK
        if (type !== "BANK" && !isNaN(parsedBalance) && parsedBalance !== initial.balance) {
          await accountService.adjustBalance(initial.id, parsedBalance);
        }
        onSaved();
      } else if (type === "BANK") {
        const created = await accountService.create(dto);
        try {
          const { authUrl } = await bankService.initEnableBankingConnection(
            created.id,
            selectedBank!.name,
            selectedBank!.country ?? "ES",
          );
          window.location.href = authUrl;
        } catch {
          await accountService.remove(created.id).catch(() => {});
          setError("Error al iniciar la conexión con el banco. Inténtalo de nuevo.");
          setLoading(false);
        }
      } else {
        const created = await accountService.create(dto);
        // Set initial balance if different from 0
        if (!isNaN(parsedBalance) && parsedBalance !== 0) {
          await accountService.adjustBalance(created.id, parsedBalance);
        }
        onSaved();
      }
    } catch {
      setError(t("common.error"));
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-lg font-bold text-slate-800">
            {isEdit ? t("accountsPage.editAccount") : t("accountsPage.newAccount")}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
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
          {!isBankEdit && (
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
          )}

          {/* Bank picker */}
          {type === "BANK" && !isEdit && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Banco a vincular</label>
              {selectedBank ? (
                <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    {selectedBank.logo ? (
                      <img src={selectedBank.logo} alt={selectedBank.name} className="h-6 w-6 rounded object-contain" />
                    ) : (
                      <Building2 className="h-4 w-4 text-slate-400" />
                    )}
                    <span className="text-sm font-medium text-slate-700">{selectedBank.name}</span>
                  </div>
                  <button type="button" onClick={() => setSelectedBank(null)} className="text-xs text-slate-400 hover:text-slate-600">
                    Cambiar
                  </button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                    <Search className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                      type="text"
                      value={institutionSearch}
                      onChange={(e) => setInstitutionSearch(e.target.value)}
                      placeholder="Buscar banco..."
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto">
                    {loadingInstitutions ? (
                      <div className="flex items-center justify-center py-5">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                      </div>
                    ) : institutionsError ? (
                      <p className="px-3 py-4 text-center text-xs text-red-400">⚠ {institutionsError}</p>
                    ) : filteredInstitutions.length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs text-slate-400">No se encontraron bancos</p>
                    ) : (
                      <ul>
                        {filteredInstitutions.map((inst) => (
                          <li key={inst.name}>
                            <button
                              type="button"
                              onClick={() => setSelectedBank(inst)}
                              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-sky-50"
                            >
                              {inst.logo ? (
                                <img src={inst.logo} alt={inst.name} className="h-7 w-7 rounded-lg object-contain" />
                              ) : (
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200">
                                  <Building2 className="h-4 w-4 text-slate-400" />
                                </div>
                              )}
                              <span className="text-sm font-medium text-slate-700">{inst.name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Currency */}
          {type !== "BANK" && (
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
          )}

          {/* Balance — for non-BANK accounts */}
          {type !== "BANK" && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">
                {isEdit ? t("accounts.adjustBalance", "Ajustar saldo") : "Saldo inicial"}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  placeholder="0.00"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 pr-14 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  {currency || "EUR"}
                </span>
              </div>
            </div>
          )}

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

          {error && <FieldError message={error} />}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-cancel-draw flex-1 justify-center">
              {t("common.cancel")}
            </button>
            <GradientButton
              type="submit"
              disabled={loading}
              weight="normal"
              iconVariant={loading ? "none" : "other"}
              icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              className="flex-1 justify-center"
            >
              {type === "BANK" && !isEdit ? "Guardar y vincular" : t("common.save")}
            </GradientButton>
          </div>
        </form>
      </div>
    </div>
  );
}
