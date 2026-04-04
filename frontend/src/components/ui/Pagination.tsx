import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const safeTotalPages = Number.isFinite(totalPages)
    ? Math.max(1, Math.trunc(totalPages))
    : 1;
  const safeCurrentPage = Number.isFinite(currentPage)
    ? Math.min(Math.max(1, Math.trunc(currentPage)), safeTotalPages)
    : 1;

  if (safeTotalPages <= 1) return null;

  // Build visible page numbers (max 7 buttons)
  const pages: (number | "...")[] = [];
  if (safeTotalPages <= 7) {
    for (let i = 1; i <= safeTotalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (safeCurrentPage > 3) pages.push("...");
    const start = Math.max(2, safeCurrentPage - 1);
    const end = Math.min(safeTotalPages - 1, safeCurrentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (safeCurrentPage < safeTotalPages - 2) pages.push("...");
    pages.push(safeTotalPages);
  }

  const base =
    "flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg text-sm font-medium transition";

  return (
    <nav className="mt-6 flex items-center justify-center gap-1" aria-label="Pagination">
      {/* Prev */}
      <button
        disabled={safeCurrentPage === 1}
        onClick={() => onPageChange(safeCurrentPage - 1)}
        className={`${base} border border-slate-300 px-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40`}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((p, i) => {
        if (p === "...") {
          return (
            <span key={`dots-${i}`} className="px-1 text-slate-400">…</span>
          );
        }

        return (
          <button
            key={`page-${p}-${i}`}
            onClick={() => onPageChange(p)}
            className={`${base} ${
              p === safeCurrentPage
                ? "bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-sm"
                : "border border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {p}
          </button>
        );
      })}

      {/* Next */}
      <button
        disabled={safeCurrentPage === safeTotalPages}
        onClick={() => onPageChange(safeCurrentPage + 1)}
        className={`${base} border border-slate-300 px-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40`}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
