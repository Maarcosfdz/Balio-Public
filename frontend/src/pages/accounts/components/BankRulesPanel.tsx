import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CircleAlert,
  HelpCircle,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  TransactionType,
  type AccountSummaryDto,
  type BankRuleDto,
  type BankRuleResponseDto,
  type CategorySummaryDto,
} from "@/types";
import { bankService } from "@/backend/bankService";
import { categoryService } from "@/backend/categoryService";
import { FieldError } from "@/components/ui/field-error";
import { GradientButton } from "@/components/ui/gradient-button";
import SingleSelectDropdown from "@/components/ui/SelectDropdown";

interface BankRulesPanelProps {
  account: AccountSummaryDto;
  open: boolean;
  onClose: () => void;
  onRulesChanged?: () => void;
}

type RuleTransactionType = TransactionType | "ANY";
type ApplyWindow = "30" | "90" | "365" | "all";

function ruleSummary(rule: BankRuleResponseDto) {
  const conditions: string[] = [];
  const effects: string[] = [];

  if (rule.transactionType === TransactionType.EXPENSE) {
    conditions.push("es un gasto");
  }
  if (rule.transactionType === TransactionType.INCOME) {
    conditions.push("es un ingreso");
  }
  if (rule.namePattern) {
    conditions.push(`nombre contiene "${rule.namePattern}"`);
  }
  if (rule.bankCategory) {
    conditions.push(`código banco = ${rule.bankCategory}`);
  }
  if (rule.mappedName) {
    effects.push(`renombrar a "${rule.mappedName}"`);
  }
  if (rule.mappedCategoryName) {
    effects.push(`categorizar como ${rule.mappedCategoryName}`);
  }

  return {
    when: conditions.join(" y ") || "sin condición",
    then: effects.join(" y ") || "sin cambios",
  };
}

function errorMessage(err: unknown, fallback: string) {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof err.response === "object" &&
    err.response !== null &&
    "data" in err.response &&
    typeof err.response.data === "object" &&
    err.response.data !== null &&
    "message" in err.response.data &&
    typeof err.response.data.message === "string"
  ) {
    return err.response.data.message;
  }
  return fallback;
}

function toRuleType(value: RuleTransactionType): TransactionType | undefined {
  return value === "ANY" ? undefined : value;
}

export default function BankRulesPanel({ account, open, onClose, onRulesChanged }: BankRulesPanelProps) {
  const { t } = useTranslation();
  const [rules, setRules] = useState<BankRuleResponseDto[]>([]);
  const [categories, setCategories] = useState<CategorySummaryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [namePattern, setNamePattern] = useState("");
  const [bankCategory, setBankCategory] = useState("");
  const [transactionType, setTransactionType] = useState<RuleTransactionType>("ANY");
  const [mappedName, setMappedName] = useState("");
  const [mappedCategoryId, setMappedCategoryId] = useState("");
  const [applyToExisting, setApplyToExisting] = useState(false);
  const [applyWindow, setApplyWindow] = useState<ApplyWindow>("365");

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setError("");
    setSuccess("");

    Promise.all([bankService.listRules(account.id), categoryService.getAll()])
      .then(([loadedRules, loadedCategories]) => {
        setRules(loadedRules);
        setCategories(loadedCategories);
      })
      .catch((err) => {
        setError(errorMessage(err, "No se pudieron cargar las reglas."));
      })
      .finally(() => setLoading(false));
  }, [open, account.id]);

  const resetForm = () => {
    setEditingId(null);
    setNamePattern("");
    setBankCategory("");
    setTransactionType("ANY");
    setMappedName("");
    setMappedCategoryId("");
    setApplyToExisting(false);
    setApplyWindow("365");
  };

  useEffect(() => {
    if (!open) {
      resetForm();
      setError("");
      setSuccess("");
    }
  }, [open]);

  const sortedRules = useMemo(
    () => [...rules].sort((left, right) => right.priority - left.priority),
    [rules],
  );

  const startEditing = (rule: BankRuleResponseDto) => {
    setEditingId(rule.id);
    setNamePattern(rule.namePattern ?? "");
    setBankCategory(rule.bankCategory ?? "");
    setTransactionType(rule.transactionType ?? "ANY");
    setMappedName(rule.mappedName ?? "");
    setMappedCategoryId(rule.mappedCategoryId ?? "");
    setApplyToExisting(false);
    setApplyWindow("365");
    setError("");
    setSuccess("");
  };

  const [reapplyingId, setReapplyingId] = useState<string | null>(null);

  const handleReapplyRule = async (rule: BankRuleResponseDto, windowDays = 0) => {
    if (reapplyingId) return;
    setReapplyingId(rule.id);
    setError("");
    setSuccess("");
    try {
      const payload = {
        namePattern: rule.namePattern ?? undefined,
        bankCategory: rule.bankCategory ?? undefined,
        transactionType: rule.transactionType ?? undefined,
        mappedName: rule.mappedName ?? undefined,
        mappedCategoryId: rule.mappedCategoryId ?? undefined,
        applyToExisting: true,
        applyWindowDays: windowDays,
      } as any;

      const saved = await bankService.updateRule(account.id, rule.id, payload);
      setRules((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      const appliedText = saved.appliedTransactions > 0
        ? ` ${t("accounts.ruleTransactionsUpdated", { count: saved.appliedTransactions })}`
        : ` ${t("accounts.ruleReappliedNoChanges")}`;
      setSuccess(`${t("accounts.ruleReapplied")}${appliedText}`);
      onRulesChanged?.();
    } catch (err) {
      setError(errorMessage(err, t("accounts.ruleReapplyError")));
    } finally {
      setReapplyingId(null);
    }
  };

  const applyActionLabel = editingId
    ? "Reaplicar también a transacciones ya importadas"
    : "Aplicar también a transacciones ya importadas";

  const applyActionDescription = editingId
    ? "Si la activas al guardar cambios, se volverán a revisar las transacciones del periodo elegido con la versión nueva de la regla."
    : "Por defecto se reaplica solo sobre el último año para evitar revisar todo el histórico si no hace falta.";

  const buildPayload = (): BankRuleDto => ({
    namePattern: namePattern.trim() || undefined,
    bankCategory: bankCategory.trim() || undefined,
    transactionType: toRuleType(transactionType),
    mappedName: mappedName.trim() || undefined,
    mappedCategoryId: mappedCategoryId || undefined,
    applyToExisting,
    applyWindowDays: applyToExisting
      ? (applyWindow === "all" ? 0 : Number.parseInt(applyWindow, 10))
      : undefined,
  });

  const validateForm = () => {
    if (!namePattern.trim() && !bankCategory.trim() && transactionType === "ANY") {
      setError("La regla debe tener al menos una condición: nombre, tipo o código bancario.");
      return false;
    }

    if (!mappedName.trim() && !mappedCategoryId) {
      setError("La regla debe cambiar el nombre o asignar una categoría.");
      return false;
    }

    if (mappedCategoryId) {
      const sel = categories.find((c) => c.id === mappedCategoryId);
      if (transactionType !== "ANY" && sel && sel.type && sel.type !== transactionType) {
        setError("La categoría seleccionada no coincide con el tipo de la regla.");
        return false;
      }
    }

    return true;
  };

  const handleSaveRule = async () => {
    if (saving) return;
    if (!validateForm()) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = buildPayload();
      const saved = editingId
        ? await bankService.updateRule(account.id, editingId, payload)
        : await bankService.createRule(account.id, payload);

      setRules((prev) => {
        if (editingId) {
          return prev.map((rule) => (rule.id === editingId ? saved : rule));
        }
        return [...prev, saved];
      });

      const appliedText = saved.appliedTransactions > 0
        ? ` ${saved.appliedTransactions} transacción${saved.appliedTransactions !== 1 ? "es" : ""} actualizada${saved.appliedTransactions !== 1 ? "s" : ""}.`
        : "";

      setSuccess(editingId ? `Regla actualizada.${appliedText}` : `Regla creada.${appliedText}`);
      resetForm();
      onRulesChanged?.();
    } catch (err) {
      setError(errorMessage(err, editingId ? "No se pudo actualizar la regla." : "No se pudo guardar la regla."));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (deletingId) return;
    setDeletingId(ruleId);
    setError("");
    setSuccess("");

    try {
      await bankService.deleteRule(account.id, ruleId);
      setRules((prev) => prev.filter((rule) => rule.id !== ruleId));
      if (editingId === ruleId) {
        resetForm();
      }
      setSuccess("Regla eliminada.");
      onRulesChanged?.();
    } catch (err) {
      setError(errorMessage(err, "No se pudo eliminar la regla."));
    } finally {
      setDeletingId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Reglas bancarias</p>
            <h2 className="truncate text-xl font-bold text-slate-800">{account.name}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[1.2fr_0.9fr]">
          <section className="flex min-h-0 flex-col border-b border-slate-100 lg:border-b-0 lg:border-r lg:border-slate-100">
            <div className="flex items-center gap-2 px-6 py-4">
              <SlidersHorizontal className="h-4 w-4 text-sky-500" />
              <h3 className="text-sm font-bold text-slate-700">Reglas creadas</h3>
            </div>

            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
              </div>
            ) : sortedRules.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Tag className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Todavía no hay reglas para esta cuenta.</p>
                  <p className="mt-1 text-xs text-slate-400">Crea una para renombrar movimientos o asignar categorías automáticamente.</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-6 pb-6">
                <ul className="space-y-3">
                  {sortedRules.map((rule) => {
                    const summary = ruleSummary(rule);
                    const isEditing = editingId === rule.id;
                    return (
                      <li key={rule.id} className={`rounded-2xl border p-4 ${isEditing ? "border-sky-300 bg-sky-50/80" : "border-slate-200 bg-slate-50/70"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{isEditing ? "Editando regla" : "Regla automática"}</p>
                            <p className="mt-1 text-xs text-slate-500">Si {summary.when}</p>
                            <p className="mt-1 text-xs font-medium text-slate-700">Entonces {summary.then}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEditing(rule)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-sky-100 hover:text-sky-700"
                              title="Editar regla"
                            >
                              <Pencil className="btn-edit-icon h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReapplyRule(rule)}
                              disabled={reapplyingId === rule.id}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-sky-100 hover:text-sky-700"
                              title={t("accounts.reapplyRule")}
                            >
                              {reapplyingId === rule.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(rule.id)}
                              disabled={deletingId === rule.id}
                              className="tx-squishy-tech tx-squishy-expense p-1.5"
                              title="Eliminar regla"
                            >
                              {deletingId === rule.id ? (
                                <Loader2 className="tx-squishy-icon relative z-10 h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="tx-squishy-icon relative z-10 h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {rule.transactionType && (
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                              {rule.transactionType === TransactionType.EXPENSE ? "Solo gastos" : "Solo ingresos"}
                            </span>
                          )}
                          {rule.namePattern && (
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                              Nombre: {rule.namePattern}
                            </span>
                          )}
                          {rule.bankCategory && (
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                              Código: {rule.bankCategory}
                            </span>
                          )}
                          {rule.mappedCategoryName && (
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-600 ring-1 ring-emerald-200">
                              Categoría: {rule.mappedCategoryName}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          <section className="flex min-h-0 flex-col bg-white px-6 py-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">{editingId ? "Editar regla" : "Crear regla"}</h3>
                <p className="text-xs text-slate-400">La regla solo se guardará para esta cuenta bancaria.</p>
              </div>
            </div>

            {success && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {success}
              </div>
            )}
            {error && <div className="mb-4"><FieldError message={error} /></div>}

            <div className="grid gap-4 overflow-y-auto pr-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Tipo de movimiento</label>
                <SingleSelectDropdown
                  value={String(transactionType)}
                  onChange={(v) => setTransactionType(v as RuleTransactionType)}
                  options={[
                    { value: "ANY", label: "Cualquiera" },
                    { value: TransactionType.EXPENSE, label: "Solo gastos" },
                    { value: TransactionType.INCOME, label: "Solo ingresos" },
                  ]}
                  buttonClassName="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Coincide si el nombre contiene</label>
                <input
                  type="text"
                  value={namePattern}
                  onChange={(e) => setNamePattern(e.target.value)}
                  placeholder="Ej. amazon, nomina, bizum"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-500">O código bancario exacto</label>
                  <div className="group relative inline-flex">
                    <HelpCircle className="h-3.5 w-3.5 text-slate-300 transition group-hover:text-slate-500" />
                    <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-64 -translate-x-1/2 rounded-xl bg-slate-800 px-3 py-2 text-[11px] leading-4 text-white shadow-xl group-hover:block">
                      Es un código técnico que a veces envía el banco con la transacción. Normalmente te bastará con usar el texto del nombre.
                    </div>
                  </div>
                </div>
                <input
                  type="text"
                  value={bankCategory}
                  onChange={(e) => setBankCategory(e.target.value)}
                  placeholder="Opcional"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Renombrar transacción a</label>
                <input
                  type="text"
                  value={mappedName}
                  onChange={(e) => setMappedName(e.target.value)}
                  placeholder="Opcional"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Asignar categoría</label>
                {(() => {
                  const filteredCategories =
                    transactionType === "ANY"
                      ? categories
                      : categories.filter((c) => !c.type || c.type === transactionType);

                  return (
                    <>
                      <SingleSelectDropdown
                        value={mappedCategoryId}
                        onChange={(v) => setMappedCategoryId(v)}
                        options={[{ value: "", label: "Sin categoría" }, ...filteredCategories.map((c) => ({ value: c.id, label: c.name }))]}
                        buttonClassName="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                      />
                      {mappedCategoryId && (() => {
                        const sel = categories.find((c) => c.id === mappedCategoryId);
                        if (sel && transactionType !== "ANY" && sel.type && sel.type !== transactionType) {
                          return (
                            <p className="mt-1 text-xs text-amber-700">La categoría seleccionada no coincide con el tipo de movimiento de la regla.</p>
                          );
                        }
                        return null;
                      })()}
                    </>
                  );
                })()}
              </div>

              <>
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setApplyToExisting((value) => !value)}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${
                      applyToExisting ? "border-sky-500 bg-sky-500 text-white" : "border-slate-300 bg-white text-transparent"
                    }`}
                  >
                    <Plus className="h-3 w-3 rotate-45" />
                  </button>
                  <span>
                    <span className="block text-sm font-semibold text-slate-700">{applyActionLabel}</span>
                    <span className="mt-1 block text-xs text-slate-400">
                      {applyActionDescription}
                    </span>
                  </span>
                </label>

                {applyToExisting && (
                  <div className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <label className="text-xs font-semibold text-slate-500">Límite temporal</label>
                    <SingleSelectDropdown
                      value={applyWindow}
                      onChange={(v) => setApplyWindow(v as ApplyWindow)}
                      options={[
                        { value: "30", label: "Últimos 30 días" },
                        { value: "90", label: "Últimos 90 días" },
                        { value: "365", label: "Último año" },
                        { value: "all", label: "Todo el histórico" },
                      ]}
                      buttonClassName="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                )}
              </>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                <div className="flex items-start gap-2">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Las reglas se aplican solo a la cuenta {account.name}. Cuando varias podrían encajar, se usa automáticamente la más específica.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-3 border-t border-slate-100 pt-4">
              {editingId ? (
                <button type="button" onClick={resetForm} className="btn-cancel-draw flex-1 justify-center">
                  Cancelar edición
                </button>
              ) : (
                <button type="button" onClick={onClose} className="btn-cancel-draw flex-1 justify-center">
                  Cancelar
                </button>
              )}
              <GradientButton
                type="button"
                onClick={handleSaveRule}
                disabled={saving}
                weight="normal"
                iconVariant={saving ? "none" : editingId ? "other" : "plus"}
                icon={
                  saving
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : editingId
                      ? <Pencil className="h-4 w-4" />
                      : <Plus className="h-4 w-4" />
                }
                className="flex-1 justify-center"
              >
                {editingId ? "Guardar cambios" : "Guardar regla"}
              </GradientButton>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
