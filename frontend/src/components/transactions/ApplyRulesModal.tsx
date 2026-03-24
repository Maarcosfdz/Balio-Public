import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { CategorySummaryDto, TransactionBatchRuleDto } from "@/types";
import { transactionService } from "@/backend/transactionService";
import { categoryService } from "@/backend/categoryService";

interface RuleRow {
  nameContains: string;
  categoryIds: string[];
  type: "" | "EXPENSE" | "INCOME";
  startDate: string;
  endDate: string;
  newName: string;
  newCategoryId: string;
}

const EMPTY_RULE: RuleRow = {
  nameContains: "",
  categoryIds: [],
  type: "",
  startDate: "",
  endDate: "",
  newName: "",
  newCategoryId: "",
};

interface ApplyRulesModalProps {
  open: boolean;
  onClose: () => void;
  onApplied: () => void;
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
    if (open) {
      setRules([{ ...EMPTY_RULE }]);
      setResult(null);
      setLoading(false);
      loadCategories();
    }
  }, [open, loadCategories]);

  const addRule = () => setRules((prev) => [...prev, { ...EMPTY_RULE }]);

  const removeRule = (idx: number) =>
    setRules((prev) => prev.filter((_, i) => i !== idx));

  const updateRule = (idx: number, field: keyof RuleRow, value: string | string[]) =>
    setRules((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    );

  const toggleCategory = (idx: number, catId: string) => {
    setRules((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const ids = r.categoryIds.includes(catId)
          ? r.categoryIds.filter((id) => id !== catId)
          : [...r.categoryIds, catId];
        return { ...r, categoryIds: ids };
      }),
    );
  };

  const handleApply = async () => {
    const validRules = rules.filter(
      (r) => r.newName.trim() || r.newCategoryId,
    );
    if (validRules.length === 0) return;

    setLoading(true);
    let totalUpdated = 0;

    try {
      for (const rule of validRules) {
        const dto: TransactionBatchRuleDto = {};

        // Filters
        if (rule.nameContains.trim()) dto.nameContains = rule.nameContains.trim();
        if (rule.categoryIds.length > 0) dto.categoryIds = rule.categoryIds;
        if (rule.type) dto.type = rule.type;
        if (rule.startDate) dto.startDate = rule.startDate;
        if (rule.endDate) dto.endDate = rule.endDate;

        // Actions
        if (rule.newName.trim()) dto.newName = rule.newName.trim();
        if (rule.newCategoryId) dto.newCategoryId = rule.newCategoryId;

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

  if (!open) return null;

  // Split categories by type for the selector
  const expenseCats = categories.filter((c) => c.type === "EXPENSE");
  const incomeCats = categories.filter((c) => c.type === "INCOME");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-2xl">
          <h2 className="text-lg font-bold text-slate-800">
            {t("rules.title")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Result banner */}
          {result && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              {t("rules.result", { count: result.total })}
            </div>
          )}

          <p className="text-sm text-slate-500">{t("rules.description")}</p>

          {/* Rules list */}
          {rules.map((rule, idx) => (
            <div
              key={idx}
              className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t("rules.ruleLabel", { n: idx + 1 })}
                </span>
                {rules.length > 1 && (
                  <button
                    onClick={() => removeRule(idx)}
                    className="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* ── Filters section ── */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500">
                  {t("rules.filters")}
                </p>

                {/* Name contains */}
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    {t("rules.nameContains")}
                  </label>
                  <input
                    type="text"
                    value={rule.nameContains}
                    onChange={(e) => updateRule(idx, "nameContains", e.target.value)}
                    placeholder={t("rules.nameContainsPlaceholder")}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                  />
                </div>

                {/* Type filter */}
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    {t("rules.typeFilter")}
                  </label>
                  <select
                    value={rule.type}
                    onChange={(e) => updateRule(idx, "type", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                  >
                    <option value="">{t("rules.allTypes")}</option>
                    <option value="EXPENSE">{t("transactions.expense")}</option>
                    <option value="INCOME">{t("transactions.income")}</option>
                  </select>
                </div>

                {/* Categories multi-select */}
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    {t("rules.categoryFilter")}
                  </label>
                  <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-300 bg-white p-2 max-h-28 overflow-y-auto">
                    {categories.length === 0 && (
                      <span className="text-xs text-slate-400">{t("rules.noCategories")}</span>
                    )}
                    {expenseCats.length > 0 && (
                      <>
                        <span className="w-full text-[10px] font-bold uppercase text-red-400 mt-0.5">{t("transactions.expense")}</span>
                        {expenseCats.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => toggleCategory(idx, cat.id)}
                            className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${
                              rule.categoryIds.includes(cat.id)
                                ? "bg-sky-100 text-sky-700 ring-1 ring-sky-300"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </>
                    )}
                    {incomeCats.length > 0 && (
                      <>
                        <span className="w-full text-[10px] font-bold uppercase text-emerald-400 mt-1">{t("transactions.income")}</span>
                        {incomeCats.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => toggleCategory(idx, cat.id)}
                            className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${
                              rule.categoryIds.includes(cat.id)
                                ? "bg-sky-100 text-sky-700 ring-1 ring-sky-300"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                  {rule.categoryIds.length === 0 && (
                    <p className="mt-0.5 text-[10px] text-slate-400">{t("rules.allCategories")}</p>
                  )}
                </div>

                {/* Date range */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">
                      {t("rules.startDate")}
                    </label>
                    <input
                      type="date"
                      value={rule.startDate}
                      onChange={(e) => updateRule(idx, "startDate", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">
                      {t("rules.endDate")}
                    </label>
                    <input
                      type="date"
                      value={rule.endDate}
                      onChange={(e) => updateRule(idx, "endDate", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                    />
                  </div>
                </div>
              </div>

              {/* ── Actions section ── */}
              <div className="space-y-2 border-t border-slate-200 pt-3">
                <p className="text-xs font-semibold text-slate-500">
                  {t("rules.actions")}
                </p>

                {/* New name */}
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    {t("rules.newName")}
                  </label>
                  <input
                    type="text"
                    value={rule.newName}
                    onChange={(e) => updateRule(idx, "newName", e.target.value)}
                    placeholder={t("rules.newNamePlaceholder")}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                  />
                </div>

                {/* New category */}
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    {t("rules.newCategory")}
                  </label>
                  <select
                    value={rule.newCategoryId}
                    onChange={(e) => updateRule(idx, "newCategoryId", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                  >
                    <option value="">{t("rules.keepCategory")}</option>
                    {expenseCats.length > 0 && (
                      <optgroup label={t("transactions.expense")}>
                        {expenseCats.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {incomeCats.length > 0 && (
                      <optgroup label={t("transactions.income")}>
                        {incomeCats.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>
            </div>
          ))}

          {/* Add rule button */}
          <button
            type="button"
            onClick={addRule}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 transition hover:border-sky-400 hover:text-sky-500"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("rules.addRule")}
          </button>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4 rounded-b-2xl">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            {t("rules.close")}
          </button>
          <button
            onClick={handleApply}
            disabled={loading || rules.every((r) => !r.newName.trim() && !r.newCategoryId)}
            className="flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("rules.apply")}
          </button>
        </div>
      </div>
    </div>
  );
}
