import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FileUp,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type {
  AccountSummaryDto,
  CategorySummaryDto,
  CsvImportRuleDto,
  CsvImportResultDto,
} from "@/types";
import { transactionService } from "@/backend/transactionService";
import { categoryService } from "@/backend/categoryService";

interface ImportCsvModalProps {
  open: boolean;
  accounts: AccountSummaryDto[];
  onClose: () => void;
  onImported: () => void;
}

interface RuleRow {
  pattern: string;
  categoryId: string;
  transactionType: string;
  mappedName: string;
}

export default function ImportCsvModal({
  open,
  accounts,
  onClose,
  onImported,
}: ImportCsvModalProps) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState("");
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [categories, setCategories] = useState<CategorySummaryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CsvImportResultDto | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await categoryService.getAll();
      setCategories(cats);
    } catch {
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setFile(null);
      setAccountId("");
      setRules([]);
      setResult(null);
      setLoading(false);
      loadCategories();
    }
  }, [open, loadCategories]);

  const addRule = () => {
    setRules((prev) => [...prev, { pattern: "", categoryId: "", transactionType: "", mappedName: "" }]);
  };

  const updateRule = (idx: number, field: keyof RuleRow, value: string) => {
    setRules((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    );
  };

  const removeRule = (idx: number) => {
    setRules((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || loading) return;

    setLoading(true);
    setResult(null);

    const validRules: CsvImportRuleDto[] = rules
      .filter((r) => r.pattern.trim())
      .map((r) => ({
        pattern: r.pattern.trim(),
        categoryId: r.categoryId || undefined!,
        transactionType: r.transactionType || undefined,
        mappedName: r.mappedName.trim() || undefined,
      }));

    try {
      const res = await transactionService.importCsv(
        file,
        accountId || undefined,
        validRules.length > 0 ? validRules : undefined,
      );
      setResult(res);
      if (res.imported > 0) onImported();
    } catch {
      setResult({ imported: 0, skipped: 0, errors: [t("common.error")] });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-sky-500" />
            <h2 className="text-lg font-bold text-slate-800">
              {t("csv.importTitle")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="px-6 text-xs text-slate-400">{t("csv.importDesc")}</p>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
          {/* File picker */}
          <div className="space-y-1">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.txt"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileUp className="h-4 w-4 shrink-0 text-sky-500" />
                  <span className="truncate text-sm font-medium text-slate-700">
                    {file.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-xs font-semibold text-sky-500 hover:text-sky-600"
                >
                  {t("csv.changeFile")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-500 transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-600"
              >
                <FileUp className="h-5 w-5" />
                {t("csv.selectFile")}
              </button>
            )}
            <p className="text-[10px] text-slate-400">{t("csv.formatHint")}</p>
          </div>

          {/* Account selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">
              {t("csv.associateAccount")}
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">{t("csv.noAccount")}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Rules section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-500">
                  {t("csv.applyRules")}
                </label>
                <p className="text-[10px] text-slate-400">
                  {t("csv.applyRulesDesc")}
                </p>
              </div>
              <button
                type="button"
                onClick={addRule}
                className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-sky-100 hover:text-sky-600"
              >
                <Plus className="h-3 w-3" />
                {t("csv.addRule")}
              </button>
            </div>

            {rules.map((rule, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 bg-slate-50 p-2 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={rule.pattern}
                    onChange={(e) => updateRule(idx, "pattern", e.target.value)}
                    placeholder={t("csv.rulePattern")}
                    className="h-8 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-sky-400"
                  />
                  <select
                    value={rule.transactionType}
                    onChange={(e) =>
                      updateRule(idx, "transactionType", e.target.value)
                    }
                    className="h-8 w-28 rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-sky-400"
                  >
                    <option value="">{t("csv.ruleTypeBoth")}</option>
                    <option value="EXPENSE">{t("csv.ruleTypeExpense")}</option>
                    <option value="INCOME">{t("csv.ruleTypeIncome")}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeRule(idx)}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={rule.mappedName}
                    onChange={(e) => updateRule(idx, "mappedName", e.target.value)}
                    placeholder={t("csv.ruleMappedName")}
                    className="h-8 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-sky-400"
                  />
                  <select
                    value={rule.categoryId}
                    onChange={(e) =>
                      updateRule(idx, "categoryId", e.target.value)
                    }
                    className="h-8 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-sky-400"
                  >
                    <option value="">{t("csv.ruleCategory")}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Result */}
          {result && (
            <div
              className={`rounded-xl border px-4 py-3 ${
                result.imported > 0
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {result.imported > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                )}
                <span className="text-sm font-semibold text-slate-700">
                  {t("csv.resultTitle")}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                {t("csv.imported", { count: result.imported })}
                {result.skipped > 0 &&
                  ` · ${t("csv.skipped", { count: result.skipped })}`}
              </p>
              {result.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold text-red-500">
                    {t("csv.errors")} ({result.errors.length})
                  </summary>
                  <ul className="mt-1 max-h-24 overflow-y-auto space-y-0.5">
                    {result.errors.map((err, i) => (
                      <li key={i} className="text-[10px] text-red-500">
                        {err}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn-cancel-draw flex-1 justify-center"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={!file || loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("csv.importing")}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {t("csv.importBtn")}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
