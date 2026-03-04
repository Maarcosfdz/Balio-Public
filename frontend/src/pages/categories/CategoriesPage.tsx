import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import type { CategorySummaryDto, TransactionType } from "@/types";
import { categoryService } from "@/backend/categoryService";

// ── Inline editable chip ──────────────────────────────────────────────────

interface CategoryChipProps {
  category: CategorySummaryDto;
  onDeleted: () => void;
  onRenamed: (id: string, newName: string) => void;
}

function CategoryChip({ category, onDeleted, onRenamed }: CategoryChipProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = async () => {
    if (!name.trim() || name.trim() === category.name) {
      setName(category.name);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await categoryService.update(category.id, {
        name: name.trim(),
        type: category.type,
      });
      onRenamed(category.id, name.trim());
      setEditing(false);
    } catch {
      setName(category.name);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try {
      await categoryService.remove(category.id);
      onDeleted();
    } catch {
      setConfirmDelete(false);
    }
  };

  return (
    <div
      className={`group relative flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 shadow-sm transition ${
        confirmDelete
          ? "border-red-300 bg-red-50"
          : "border-slate-200 hover:border-slate-300 hover:shadow"
      }`}
    >
      {editing ? (
        <>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") { setName(category.name); setEditing(false); }
            }}
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none"
          />
          {saving ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />
          ) : (
            <>
              <button onClick={handleSave} className="rounded-md p-0.5 text-emerald-500 hover:bg-emerald-50">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={() => { setName(category.name); setEditing(false); }} className="rounded-md p-0.5 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </>
      ) : confirmDelete ? (
        <>
          <span className="flex-1 truncate text-sm font-medium text-red-700">{t("categories.deleteConfirm")}</span>
          <button onClick={handleDelete} className="rounded-lg bg-red-500 px-2 py-0.5 text-xs font-bold text-white hover:bg-red-600">
            {t("common.delete")}
          </button>
          <button onClick={() => setConfirmDelete(false)} className="rounded-md p-0.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
            {category.name}
          </span>
          <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
            <button
              onClick={() => setEditing(true)}
              className="rounded-md p-1 text-slate-400 hover:bg-sky-50 hover:text-sky-600"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDelete}
              className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Create chip ───────────────────────────────────────────────────────────

interface CreateChipProps {
  type: TransactionType;
  onCreated: (cat: CategorySummaryDto) => void;
}

function CreateChip({ type, onCreated }: CreateChipProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const created = await categoryService.create({ name: name.trim(), type });
      onCreated({ id: created.id, name: created.name, type: created.type });
      setName("");
      setOpen(false);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-3 py-2.5 text-sm text-slate-400 transition hover:border-sky-300 hover:bg-sky-50/50 hover:text-sky-500"
      >
        <Plus className="h-4 w-4 shrink-0" />
        {t("categories.createNew")}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-50/50 px-3 py-2.5 shadow-sm"
    >
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder={t("categories.namePlaceholder")}
        className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
      />
      {saving ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />
      ) : (
        <>
          <button type="submit" disabled={!name.trim()} className="rounded-md p-0.5 text-emerald-500 hover:bg-emerald-50 disabled:opacity-40">
            <Check className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => { setName(""); setOpen(false); }} className="rounded-md p-0.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </>
      )}
    </form>
  );
}

// ── Column section ────────────────────────────────────────────────────────

interface CategoryColumnProps {
  title: string;
  icon: React.ReactNode;
  type: TransactionType;
  categories: CategorySummaryDto[];
  onDeleted: (id: string) => void;
  onRenamed: (id: string, newName: string) => void;
  onCreated: (cat: CategorySummaryDto) => void;
}

function CategoryColumn({
  title,
  icon,
  type,
  categories,
  onDeleted,
  onRenamed,
  onCreated,
}: CategoryColumnProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Column header */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            type === "EXPENSE" ? "bg-red-100 text-red-500" : "bg-emerald-100 text-emerald-600"
          }`}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">{title}</p>
          <p className="text-xs text-slate-400">{categories.length} categorías</p>
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-col gap-2">
        {categories.map((cat) => (
          <CategoryChip
            key={cat.id}
            category={cat}
            onDeleted={() => onDeleted(cat.id)}
            onRenamed={onRenamed}
          />
        ))}
        <CreateChip type={type} onCreated={onCreated} />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<CategorySummaryDto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await categoryService.getAll());
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleDeleted = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleRenamed = (id: string, newName: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: newName } : c))
    );
  };

  const handleCreated = (cat: CategorySummaryDto) => {
    setCategories((prev) => [...prev, cat]);
  };

  const expenseCategories = categories.filter((c) => !c.type || c.type === "EXPENSE");
  const incomeCategories  = categories.filter((c) => c.type === "INCOME");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{t("categories.title")}</h1>
          <p className="mt-1 text-sm text-slate-400">{t("categories.subtitle")}</p>
        </div>
        <button
          onClick={fetchCategories}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Expenses */}
          <CategoryColumn
            title={t("categories.expenseSection")}
            icon={<ArrowDownCircle className="h-4 w-4" />}
            type="EXPENSE"
            categories={expenseCategories}
            onDeleted={handleDeleted}
            onRenamed={handleRenamed}
            onCreated={handleCreated}
          />

          {/* Income */}
          <CategoryColumn
            title={t("categories.incomeSection")}
            icon={<ArrowUpCircle className="h-4 w-4" />}
            type="INCOME"
            categories={incomeCategories}
            onDeleted={handleDeleted}
            onRenamed={handleRenamed}
            onCreated={handleCreated}
          />
        </div>
      )}
    </div>
  );
}

