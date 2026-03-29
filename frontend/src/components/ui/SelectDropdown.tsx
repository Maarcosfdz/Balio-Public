import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

type Option = { value: string; label: string };

export default function SingleSelectDropdown({
  value,
  onChange,
  options,
  placeholder,
  label,
  className,
  buttonClassName,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  label?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
    placement: "bottom" | "top";
  } | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && ref.current.contains(target)) return;
      if (menuRef.current && menuRef.current.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useLayoutEffect(() => {
    if (!open || !ref.current) {
      setMenuStyle(null);
      return;
    }

    const rect = ref.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const preferBottom = spaceBelow >= 160 || spaceBelow >= spaceAbove;
    const maxHeight = preferBottom ? Math.min(240, spaceBelow) : Math.min(240, spaceAbove);

    const top = preferBottom ? rect.bottom + window.scrollY : rect.top + window.scrollY - maxHeight;
    setMenuStyle({ top, left: rect.left + window.scrollX, width: rect.width, placement: preferBottom ? "bottom" : "top" });

    const onScroll = () => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const sb = window.innerHeight - r.bottom - 8;
      const sa = r.top - 8;
      const pb = sb >= 160 || sb >= sa;
      const mh = pb ? Math.min(240, sb) : Math.min(240, sa);
      const t = pb ? r.bottom + window.scrollY : r.top + window.scrollY - mh;
      setMenuStyle({ top: t, left: r.left + window.scrollX, width: r.width, placement: pb ? "bottom" : "top" });
    };

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className={`space-y-1 ${className ?? ""}`} ref={ref}>
      {label ? <label className="text-xs font-semibold text-slate-500">{label}</label> : null}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          disabled={disabled}
          className={
            (buttonClassName ??
            "flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-xs transition hover:border-sky-300 hover:bg-sky-50/40 focus:border-sky-400 focus:ring-2 focus:ring-sky-100") +
            " relative pr-8"
          }
        >
          <span className={`${selected ? "" : "text-slate-400"} truncate text-left flex-1`}>{selected?.label ?? placeholder ?? ""}</span>
          <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>

        {open && menuStyle && createPortal(
          <ul
            ref={menuRef}
            style={{
              position: "absolute",
              top: `${menuStyle.top}px`,
              left: `${menuStyle.left}px`,
              minWidth: `${menuStyle.width}px`,
              maxHeight: 240,
              overflow: "auto",
              zIndex: 9999,
            }}
            className="mt-2 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-sky-50 ${opt.value === value ? "font-semibold text-slate-800" : "text-slate-600"}`}
                >
                  <span className="truncate">{opt.label}</span>
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
      </div>
    </div>
  );
}
