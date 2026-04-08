import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Check, ChevronDown, Filter, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CategorySummaryDto, TransactionBatchRuleDto } from "@/types";
import { transactionService } from "@/backend/transactionService";
import { categoryService } from "@/backend/categoryService";
import DateRangePicker from "@/components/ui/DateRangePicker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GradientButton } from "@/components/ui/gradient-button";

interface RuleRow {
  nameContains: string;
  categoryIds: string[];
  type: "" | "EXPENSE" | "INCOME";
  startDate: string;
  endDate: string;
  newName: string;
  newCategoryId: string;
  excludeMatch: boolean;
  amountMultiplier: string;
}

const EMPTY_RULE: RuleRow = {
  nameContains: "",
  categoryIds: [],
  type: "",
  startDate: "",
  endDate: "",
  newName: "",
  newCategoryId: "",
  excludeMatch: false,
  amountMultiplier: "",
};

const EMPTY_DATES: string[] = [];

interface ApplyRulesModalProps {
  open: boolean;
  onClose: () => void;
  onApplied: () => void;
}

const controlClassName =
  "h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100";

type SelectOption = { value: string; label: string };

function SingleSelectDropdown({
  value,
  onChange,
  label,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: SelectOption[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((opt) => opt.value === value);

  return (
    <div className="space-y-1" ref={ref}>
      <label className="text-xs font-semibold text-slate-500">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-xs transition hover:border-sky-300 hover:bg-sky-50/40 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        >
          <span className={`truncate ${selected ? "text-slate-700" : "text-slate-400"}`}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-slate-500 transition hover:bg-sky-50 hover:text-slate-700"
            >
              {placeholder}
              {!selected && <Check className="h-3.5 w-3.5 text-sky-500" />}
            </button>
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-sky-50 hover:text-slate-800"
              >
                {option.label}
                {value === option.value && <Check className="h-3.5 w-3.5 text-sky-500" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: CategorySummaryDto[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  };

  const displayLabel =
    selected.length === 0
      ? <span className="text-slate-400">{t("txPage.allCategories")}</span>
      : selected.length === 1
        ? options.find((opt) => opt.id === selected[0])?.name ?? label
        : t("txPage.selectedCategories", { count: selected.length });

  return (
    <div className="space-y-1" ref={ref}>
      <label className="text-xs font-semibold text-slate-500">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-xs transition hover:border-sky-300 hover:bg-sky-50/40 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown className={`ml-2 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            {options.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">{t("categories.noCategories")}</p>
            ) : (
              options.map((option) => (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-600 transition hover:bg-sky-50 hover:text-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option.id)}
                    onChange={() => toggle(option.id)}
                    className="h-3.5 w-3.5 rounded accent-sky-500"
                  />
                  {option.name}
                </label>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApplyRulesModal({
  open,
  onClose,
  onApplied,
}: ApplyRulesModalProps) {
  const { t } = useTranslation();

  const [rules, setRules] = useState<RuleRow[]>([{ ...EMPTY_RULE }]);
  const [categories, setCategories] = useState<CategorySummaryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ total: number } | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await categoryService.getAll());
    } catch {
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setRules([{ ...EMPTY_RULE }]);
    setResult(null);
    setLoading(false);
    loadCategories();
  }, [open, loadCategories]);

  const addRule = () => setRules((prev) => [...prev, { ...EMPTY_RULE }]);

  const removeRule = (idx: number) =>
    setRules((prev) => prev.filter((_, i) => i !== idx));

  const updateRule = (idx: number, field: keyof RuleRow, value: string | string[] | boolean) =>
    setRules((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    );

  // toggleCategory removed — not used

  const rulesWithActions = useMemo(
    () =>
      rules.filter((r) => {
        const parsed = Number.parseFloat(r.amountMultiplier);
        const hasMultiplierAction = Number.isFinite(parsed) && parsed > 0 && parsed !== 1;
        return r.newName.trim() || r.newCategoryId || r.excludeMatch || hasMultiplierAction;
      }),
    [rules],
  );

  const handleApply = async () => {
    if (rulesWithActions.length === 0 || loading) return;

    setLoading(true);
    let totalUpdated = 0;

    try {
      for (const rule of rulesWithActions) {
        const dto: TransactionBatchRuleDto = {};

        if (rule.nameContains.trim()) dto.nameContains = rule.nameContains.trim();
        if (rule.categoryIds.length > 0) dto.categoryIds = rule.categoryIds;
        if (rule.type) dto.type = rule.type;
        if (rule.startDate) dto.startDate = rule.startDate;
        if (rule.endDate) dto.endDate = rule.endDate;
        if (rule.newName.trim()) dto.newName = rule.newName.trim();
        if (rule.newCategoryId) dto.newCategoryId = rule.newCategoryId;
        if (rule.excludeMatch) dto.excludeMatch = true;
        if (rule.amountMultiplier.trim()) {
          const parsed = Number.parseFloat(rule.amountMultiplier);
          if (Number.isFinite(parsed) && parsed > 0 && parsed !== 1) {
            dto.amountMultiplier = parsed;
          }
        }

        const res = await transactionService.applyBatchRules(dto);
        totalUpdated += res.updated;
      }

      setResult({ total: totalUpdated });
      onApplied();
    } catch {
      // Fail silently
    } finally {
      setLoading(false);
    }
  };

  const expenseCats = categories.filter((c) => c.type === "EXPENSE");
  const incomeCats = categories.filter((c) => c.type === "INCOME");

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[92vh] w-[96vw] max-w-5xl overflow-visible rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-sky-50/50 px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <Sparkles className="h-5 w-5 text-sky-600" />
            {t("rules.title")}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {t("rules.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[68vh] space-y-4 overflow-y-auto px-6 py-5">
          {result && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              {t("rules.result", { count: result.total })}
            </div>
          )}

          {rules.map((rule, idx) => (
            <div
              key={idx}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("rules.ruleLabel", { n: idx + 1 })}
                </div>
                {rules.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRule(idx)}
                    className="btn-delete-icon"
                    title={t("common.delete")}
                  >
                    <Trash2 className="btn-delete-icon__icon h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Filter className="h-3.5 w-3.5" />
                    {t("rules.filters")}
                  </p>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">
                      {t("rules.nameContains")}
                    </label>
                    <input
                      type="text"
                      value={rule.nameContains}
                      onChange={(e) => updateRule(idx, "nameContains", e.target.value)}
                      placeholder={t("rules.nameContainsPlaceholder")}
                      className={controlClassName}
                    />
                  </div>

                  <SingleSelectDropdown
                    value={rule.type}
                    onChange={(next) => updateRule(idx, "type", next)}
                    label={t("rules.typeFilter")}
                    placeholder={t("rules.allTypes")}
                    options={[
                      { value: "EXPENSE", label: t("transactions.expense") },
                      { value: "INCOME", label: t("transactions.income") },
                    ]}
                  />

                  <MultiSelectDropdown
                    label={t("transactions.category")}
                    options={rule.type ? categories.filter((c) => !c.type || c.type === rule.type) : categories}
                    selected={rule.categoryIds}
                    onChange={(ids) => updateRule(idx, "categoryIds", ids)}
                  />

                  <DateRangePicker
                    label={t("txPage.dateRange", "Range")}
                    allowLooseDates={false}
                    startDate={rule.startDate}
                    endDate={rule.endDate}
                    onChangeStart={(value) => updateRule(idx, "startDate", value)}
                    onChangeEnd={(value) => updateRule(idx, "endDate", value)}
                    specificDates={EMPTY_DATES}
                    onChangeSpecificDates={() => {}}
                  />
                  <p className="mt-1 text-xs text-slate-400">{t("rules.dateHint", "Déjalo vacío para no poner límite de fecha")}</p>
                </div>

                <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Sparkles className="h-3.5 w-3.5" />
                    {t("rules.actions")}
                  </p>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">
                      {t("rules.newName")}
                    </label>
                    <input
                      type="text"
                      value={rule.newName}
                      onChange={(e) => updateRule(idx, "newName", e.target.value)}
                      placeholder={t("rules.newNamePlaceholder")}
                      className={controlClassName}
                    />
                  </div>

                  <SingleSelectDropdown
                    value={rule.newCategoryId}
                    onChange={(next) => updateRule(idx, "newCategoryId", next)}
                    label={t("rules.newCategory")}
                    placeholder={t("rules.keepCategory")}
                    options={[
                      ...expenseCats.map((c) => ({ value: c.id, label: c.name })),
                      ...incomeCats.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                  />

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">
                      {t("rules.amountMultiplier", "Multiplicador de importe")}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rule.amountMultiplier}
                      onChange={(e) => updateRule(idx, "amountMultiplier", e.target.value)}
                      placeholder={t("rules.amountMultiplierPlaceholder", "1.00 = sin cambios, 0.90 = -10%")}
                      className={controlClassName}
                    />
                  </div>

                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={rule.excludeMatch}
                      onChange={(e) => updateRule(idx, "excludeMatch", e.target.checked)}
                      className="h-4 w-4 rounded accent-sky-500"
                    />
                    <span>{t("rules.excludeMatch", "Excluir transacciones que cumplan esta regla")}</span>
                  </label>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addRule}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-600"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("rules.addRule")}
          </button>
        </div>

        <DialogFooter className="border-t border-slate-100 bg-white px-6 py-4 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-cancel-draw"
          >
            {t("rules.close")}
          </button>
          <GradientButton
            onClick={handleApply}
            disabled={loading || rulesWithActions.length === 0}
            size="sm"
            weight="normal"
            iconVariant={loading ? "none" : "other"}
            icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
            className="px-5 py-2 text-sm"
          >
            {t("rules.apply")}
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
