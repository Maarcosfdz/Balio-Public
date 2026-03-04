import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CategorySummaryDto, TransactionType } from "@/types";
import { categoryService } from "@/backend/categoryService";

interface CategoryComboboxProps {
  categories: CategorySummaryDto[];
  value: string | null;
  transactionType: TransactionType;
  onChange: (categoryId: string | null) => void;
  onCategoryCreated: (cat: CategorySummaryDto) => void;
}

/** Normalise for searching: lowercase, strip whitespace */
function normalise(s: string) {
  return s.toLowerCase().replace(/\s+/g, "");
}

export default function CategoryCombobox({
  categories,
  value,
  transactionType,
  onChange,
  onCategoryCreated,
}: CategoryComboboxProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounced query
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const filtered = useMemo(() => {
    if (!debouncedQuery.trim()) return categories;
    const norm = normalise(debouncedQuery);
    return categories.filter((c) => normalise(c.name).includes(norm));
  }, [categories, debouncedQuery]);

  const exactMatch = useMemo(
    () =>
      categories.some(
        (c) => normalise(c.name) === normalise(debouncedQuery)
      ),
    [categories, debouncedQuery]
  );

  const selectedLabel = useMemo(
    () => categories.find((c) => c.id === value)?.name ?? "",
    [categories, value]
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!query.trim() || creating) return;
    setCreating(true);
    try {
      const created = await categoryService.create({
        name: query.trim(),
        type: transactionType,
      });
      const summary: CategorySummaryDto = { id: created.id, name: created.name };
      onCategoryCreated(summary);
      onChange(created.id);
      setQuery("");
      setOpen(false);
    } catch {
      // silently ignore – server validation
    } finally {
      setCreating(false);
    }
  }, [query, creating, transactionType, onCategoryCreated, onChange]);

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm transition focus-within:border-sky-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        <Tag className="h-4 w-4 text-slate-400" />
        {open ? (
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("txPage.searchCategory")}
            className="flex-1 bg-transparent outline-none"
          />
        ) : (
          <span className={selectedLabel ? "text-slate-900" : "text-slate-400"}>
            {selectedLabel || t("txPage.selectCategory")}
          </span>
        )}
        <Search className="ml-auto h-4 w-4 text-slate-400" />
      </div>

      {open && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filtered.map((cat) => (
            <li
              key={cat.id}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-sky-50 ${
                cat.id === value ? "bg-sky-50 font-medium text-sky-700" : "text-slate-700"
              }`}
              onClick={() => {
                onChange(cat.id);
                setQuery("");
                setOpen(false);
              }}
            >
              <Tag className="h-3.5 w-3.5" />
              {cat.name}
            </li>
          ))}

          {/* Create option */}
          {query.trim() && !exactMatch && (
            <li
              className="flex cursor-pointer items-center gap-2 border-t px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50"
              onClick={handleCreate}
            >
              <Plus className="h-4 w-4" />
              {t("txPage.createCategory", { name: query.trim() })}
            </li>
          )}

          {filtered.length === 0 && !query.trim() && (
            <li className="px-3 py-2 text-sm text-slate-400">
              {t("common.noResults")}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
