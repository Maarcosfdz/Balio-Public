import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpCircle,
  Bookmark,
  Check,
  Loader2,
  Pencil,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import type { FilterSummaryDto, TransactionSummaryDto } from "@/types";
import { filterService } from "@/backend/filterService";
import { ROUTES } from "@/config/routes";

// ── Filter card ───────────────────────────────────────────────────────────

interface FilterCardProps {
  filter: FilterSummaryDto;
  onDeleted: () => void;
  onEdited: (id: string, newName: string) => void;
}

function FilterCard({ filter, onDeleted, onEdited }: FilterCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [preview, setPreview] = useState<TransactionSummaryDto[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // ── Inline rename ──
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(filter.name);
  const [saving, setSaving] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) editInputRef.current?.focus();
  }, [editing]);

  const handleRename = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === filter.name) { setEditing(false); setEditName(filter.name); return; }
    setSaving(true);
    try {
      await filterService.update(filter.id, { name: trimmed });
      onEdited(filter.id, trimmed);
      setEditing(false);
    } catch {
      setEditName(filter.name);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingPreview(true);
    filterService
      .apply(filter.id)
      .then((txs) => { if (!cancelled) setPreview(txs.slice(0, 5)); })
      .catch(() => { if (!cancelled) setPreview([]); })
      .finally(() => { if (!cancelled) setLoadingPreview(false); });
    return () => { cancelled = true; };
  }, [filter.id]);

  const handleApply = () => {
    navigate(ROUTES.TRANSACTIONS, { state: { filterId: filter.id } });
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await filterService.remove(filter.id);
      onDeleted();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
        confirmDelete ? "border-red-200" : "border-slate-200"
      }`}
    >
      {/* Card header */}
      <div
        className={`flex items-start justify-between rounded-t-2xl px-5 py-4 ${
          confirmDelete ? "bg-red-50" : "bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              confirmDelete ? "bg-red-100 text-red-500" : "bg-white text-sky-600 shadow-sm"
            }`}
          >
            <Bookmark className="h-5 w-5" />
          </div>
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                ref={editInputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") { setEditing(false); setEditName(filter.name); }
                }}
                className="h-8 rounded-lg border border-sky-300 bg-sky-50/50 px-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-100"
                style={{ width: 160 }}
              />
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : (
                <>
                  <button onClick={handleRename} className="rounded-md p-0.5 text-emerald-500 hover:bg-emerald-50">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => { setEditing(false); setEditName(filter.name); }} className="rounded-md p-0.5 text-slate-400 hover:bg-slate-100">
                    <X className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ) : (
            <p className="font-bold text-slate-800">{filter.name}</p>
          )}
        </div>

        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-60"
            >
              {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
              {t("common.delete")}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-0.5">
            {!editing && (
              <>
                <button
                  onClick={() => navigate(ROUTES.TRANSACTIONS, { state: { editFilterId: filter.id, filterName: filter.name } })}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600"
                  title={t("filters.editCriteria", "Editar criterios")}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setEditing(true); setEditName(filter.name); }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600"
                  title={t("common.rename", "Renombrar")}
                >
                  <Pencil className="btn-edit-icon h-4 w-4" />
                </button>
              </>
            )}
            <button
              onClick={handleDelete}
              className="btn-delete-icon ml-0.5"
            >
              <Trash2 className="btn-delete-icon__icon h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Preview section */}
      <div className="flex-1 px-5 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t("filters.preview")}
        </p>

        {loadingPreview ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
          </div>
        ) : preview && preview.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {preview.map((tx) => (
              <li key={tx.id} className="flex items-center gap-2 py-1.5">
                {tx.type === "EXPENSE" ? (
                  <ArrowDownCircle className="h-4 w-4 shrink-0 text-red-400" />
                ) : (
                  <ArrowUpCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                  {tx.name}
                </span>
                <span className="shrink-0 text-xs text-slate-400">{formatDate(tx.date)}</span>
                <span
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    tx.type === "EXPENSE" ? "text-red-500" : "text-emerald-500"
                  }`}
                >
                  {tx.type === "EXPENSE" ? "-" : "+"}
                  {tx.amount.toFixed(2)} €
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-center text-sm text-slate-400">
            {t("filters.noPreview")}
          </p>
        )}
      </div>

      {/* Footer button */}
      <div className="border-t border-slate-100 px-5 py-3">
        <button
          onClick={handleApply}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          {t("filters.applyAndGo")}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function FiltersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [, setTotalElements] = useState(0);

  const pageRef = useRef(0);

  const fetchFilters = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = await filterService.getPaged(p, PAGE_SIZE);
      setFilters(data.content);
      setTotalPages(data.totalPages || 1);
      setTotalElements(data.totalElements);
    } catch {
      setFilters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFilters(0); }, [fetchFilters]);

  // Refresh when other parts of the app create/update filters
  useEffect(() => {
    const handler = () => fetchFilters(pageRef.current);
    window.addEventListener("balio:filters-updated", handler as EventListener);
    return () => window.removeEventListener("balio:filters-updated", handler as EventListener);
  }, [fetchFilters]);

  // Auto-refresh 30 s + visibilidad
  useEffect(() => {
    const interval = setInterval(() => fetchFilters(pageRef.current), 30_000);
    const handleVis = () => {
      if (document.visibilityState === "visible") fetchFilters(pageRef.current);
    };
    document.addEventListener("visibilitychange", handleVis);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", handleVis); };
  }, [fetchFilters]);

  const handlePageChange = (p: number) => {
    setPage(p);
    pageRef.current = p;
    fetchFilters(p);
  };

  const handleDeleted = (id: string) => {
    const newList = filters.filter((f) => f.id !== id);
    setTotalElements((n) => n - 1);
    if (newList.length === 0 && page > 0) {
      const prev = page - 1;
      setPage(prev);
      fetchFilters(prev);
    } else {
      setFilters(newList);
    }
  };

  const handleEdited = (id: string, newName: string) => {
    setFilters((prev) => prev.map((f) => f.id === id ? { ...f, name: newName } : f));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            onClick={() => navigate(ROUTES.TRANSACTIONS)}
            className="tx-back-btn mb-2"
          >
            <span className="tx-back-btn-inner">
              <ArrowLeft className="h-4 w-4" />
              <span className="tx-back-btn-text">
                {t("nav.backToTransactions", "Transacciones")}
              </span>
            </span>
          </button>
          <h1 className="text-3xl font-bold text-slate-800">{t("filters.title")}</h1>
          <p className="mt-1 text-sm text-slate-400">{t("filters.subtitle")}</p>
        </div>
        
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
        </div>
      ) : filters.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center text-slate-400">
          <Bookmark className="h-10 w-10 opacity-40" />
          <div>
            <p className="font-semibold">{t("filters.noFilters")}</p>
            <p className="mt-0.5 text-sm">{t("filters.noFiltersDesc")}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filters.map((f) => (
              <FilterCard
                key={f.id}
                filter={f}
                onDeleted={() => handleDeleted(f.id)}
                onEdited={handleEdited}
              />
            ))}
          </div>

          <Pagination
            currentPage={page + 1}
            totalPages={totalPages}
            onPageChange={(p) => handlePageChange(p - 1)}
          />
        </>
      )}
    </div>
  );
}

