import { ChevronLeft, ChevronRight } from "lucide-react";
import { Fragment } from "react";

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
  if (totalPages <= 1) return null;

  // Build visible page numbers (max 7 buttons)
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  const base =
    "flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg text-sm font-medium transition";

  return (
    <nav className="mt-6 flex items-center justify-center gap-1" aria-label="Pagination">
      {/* Prev */}
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className={`${base} border border-slate-300 px-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40`}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((p, i) => {
        const itemKey = p === "..." ? `dots-${i}` : `page-${p}-${i}`;

        return (
          <Fragment key={itemKey}>
            {p === "..." ? (
              <span className="px-1 text-slate-400">…</span>
            ) : (
              <button
                onClick={() => onPageChange(p)}
                className={`${base} ${
                  p === currentPage
                    ? "bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-sm"
                    : "border border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            )}
          </Fragment>
        );
      })}

      {/* Next */}
      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className={`${base} border border-slate-300 px-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40`}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
