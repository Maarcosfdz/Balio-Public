import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

export type MultiSelectOption = {
  value: string;
  label: string;
};

interface MultiSelectDropdownProps {
  value: string[];
  onChange: (next: string[]) => void;
  options: MultiSelectOption[];
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
}

export default function MultiSelectDropdown({
  value,
  onChange,
  options,
  label,
  placeholder,
  searchPlaceholder,
  emptyText,
  className,
  buttonClassName,
  disabled,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
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
      setQuery("");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useLayoutEffect(() => {
    if (!open || !ref.current) return;

    const update = () => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;

      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const preferBottom = spaceBelow >= 220 || spaceBelow >= spaceAbove;
      const maxHeight = preferBottom ? Math.min(280, spaceBelow) : Math.min(280, spaceAbove);
      const top = preferBottom
        ? rect.bottom + window.scrollY
        : rect.top + window.scrollY - maxHeight;

      setMenuStyle({
        top,
        left: rect.left + window.scrollX,
        width: rect.width,
        placement: preferBottom ? "bottom" : "top",
      });
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const selectedLabels = useMemo(
    () => options.filter((o) => selectedSet.has(o.value)).map((o) => o.label),
    [options, selectedSet],
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const displayText = useMemo(() => {
    if (selectedLabels.length === 0) return placeholder ?? "Selecciona opciones";
    if (selectedLabels.length === 1) return selectedLabels[0];
    return `${selectedLabels.length} seleccionadas`;
  }, [selectedLabels, placeholder]);

  const toggleValue = (itemValue: string) => {
    if (selectedSet.has(itemValue)) {
      onChange(value.filter((v) => v !== itemValue));
      return;
    }
    onChange([...value, itemValue]);
  };

  return (
    <div className={`space-y-1 ${className ?? ""}`} ref={ref}>
      {label ? <label className="text-xs font-semibold text-slate-500">{label}</label> : null}

      <button
        type="button"
        onClick={() => {
          setOpen((prev) => {
            const next = !prev;
            if (!next) setQuery("");
            return next;
          });
        }}
        disabled={disabled}
        className={
          (buttonClassName
            ?? "flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-xs transition hover:border-sky-300 hover:bg-sky-50/40 focus:border-sky-400 focus:ring-2 focus:ring-sky-100")
          + " relative pr-8"
        }
      >
        <span className={`${selectedLabels.length > 0 ? "text-slate-700" : "text-slate-400"} truncate text-left flex-1`}>
          {displayText}
        </span>
        <ChevronDown
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && menuStyle && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "absolute",
            top: `${menuStyle.top}px`,
            left: `${menuStyle.left}px`,
            minWidth: `${menuStyle.width}px`,
            maxHeight: 280,
            overflow: "hidden",
            zIndex: 9999,
          }}
          className="rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder ?? "Buscar..."}
                className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 pl-7 pr-2 text-xs outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>

          <div className="max-h-52 overflow-auto p-1">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-2 text-xs text-slate-400">{emptyText ?? "Sin resultados"}</p>
            ) : (
              filteredOptions.map((option) => {
                const checked = selectedSet.has(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleValue(option.value)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-sky-50"
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? "border-sky-500 bg-sky-500 text-white" : "border-slate-300 bg-white text-transparent"}`}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
