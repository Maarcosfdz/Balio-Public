import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronDown, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import "react-day-picker/style.css";

type PickerMode = "single" | "range";

function toInputDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseIso(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

interface Props {
  startDate: string;
  endDate: string;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
  specificDates: string[];
  onChangeSpecificDates: (dates: string[]) => void;
}

export default function DateRangePicker({
  startDate, endDate, onChangeStart, onChangeEnd,
  specificDates, onChangeSpecificDates,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PickerMode>("range");
  const [showMultiPanel, setShowMultiPanel] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});
  const today = new Date();

  const dayPickerClassNames = {
    selected: "!bg-sky-500 !text-white rounded-md",
    range_start: "!bg-sky-600 !text-white rounded-md",
    range_end: "!bg-sky-600 !text-white rounded-md",
    range_middle: "!bg-sky-100 !text-sky-800 rounded-md",
    today: "!text-sky-700 font-semibold",
  };

  // ── Portal position ───────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    const updatePos = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const DROPDOWN_HEIGHT = 400;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow >= DROPDOWN_HEIGHT
        ? rect.bottom + 8
        : rect.top - DROPDOWN_HEIGHT - 8;
      const pickerWidth = 340;
      const clampedLeft = Math.min(rect.left, Math.max(0, window.innerWidth - pickerWidth - 8));
      setPortalStyle({
        position: "fixed",
        top,
        left: clampedLeft,
        width: pickerWidth,
        zIndex: 9999,
      });
    };

    updatePos();
    window.addEventListener("scroll", updatePos, { capture: true });
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, { capture: true });
      window.removeEventListener("resize", updatePos);
    };
  }, [open]);

  // ── Close on outside click ────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const portal = document.getElementById("date-picker-portal");
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        (!portal || !portal.contains(e.target as Node))
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Range logic ───────────────────────────────────────────────────────
  const rangeValue: DateRange | undefined = startDate
    ? { from: parseIso(startDate), to: parseIso(endDate) }
    : undefined;

  const handleRangeSelect = (range: DateRange | undefined) => {
    onChangeStart(range?.from ? toInputDate(range.from) : "");
    onChangeEnd(range?.to ? toInputDate(range.to) : "");
  };

  // ── Multiple logic ────────────────────────────────────────────────────
  const multipleDates: Date[] = specificDates
    .map((s) => parseIso(s))
    .filter((d): d is Date => !!d);

  const handleMultipleSelect = (dates: Date[] | undefined) => {
    onChangeSpecificDates((dates ?? []).map(toInputDate));
  };

  // ── Display text ──────────────────────────────────────────────────────
  const formatDisplay = (s: string) => {
    const d = parseIso(s);
    if (!d) return "";
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  };

  const hasDates = !!startDate || specificDates.length > 0;

  const displayText = !hasDates
    ? t("txPage.selectDates", "Select date(s)")
    : specificDates.length > 0 && !startDate
      ? `${specificDates.length} ${t("txPage.looseDates", "loose dates")}`
      : mode === "single"
        ? formatDisplay(startDate)
        : endDate && endDate !== startDate
          ? `${formatDisplay(startDate)} → ${formatDisplay(endDate)}`
          : `${formatDisplay(startDate)} → …`;

  const clearDates = () => {
    onChangeStart("");
    onChangeEnd("");
    onChangeSpecificDates([]);
  };

  const handleModeChange = (next: PickerMode) => {
    onChangeStart("");
    onChangeEnd("");
    setMode(next);
  };

  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-500">
        {t("txPage.selectDates", "Select date(s)")}
      </label>

      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-10 w-full items-center gap-2 rounded-lg border px-3 text-sm transition ${
          open
            ? "border-sky-400 bg-white ring-2 ring-sky-100"
            : "border-slate-300 bg-slate-50 hover:border-sky-300 hover:bg-white"
        } ${hasDates ? "text-slate-700" : "text-slate-400"}`}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="flex-1 truncate text-left">{displayText}</span>
        {hasDates && (
          <span
            role="button"
            tabIndex={0}
            className="flex h-4 w-4 items-center justify-center rounded-full text-slate-300 hover:bg-slate-200 hover:text-slate-600"
            onClick={(e) => { e.stopPropagation(); clearDates(); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); clearDates(); } }}
          >
            <X className="h-3 w-3" />
          </span>
        )}
      </button>

      {/* Portal calendar dropdown */}
      {open && typeof document !== "undefined" && createPortal(
        <div
          id="date-picker-portal"
          style={portalStyle}
          className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl ring-1 ring-black/5"
        >
          {/* Mode toggle — 2 tabs */}
          <div className="mb-2 flex gap-1 rounded-lg bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => handleModeChange("single")}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                mode === "single" ? "bg-white text-sky-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t("txPage.singleDate", "Day")}
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("range")}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                mode === "range" ? "bg-white text-sky-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t("txPage.dateRange", "Range")}
            </button>
          </div>

          {/* Calendar */}
          <div style={{ "--rdp-accent-color": "#0ea5e9", "--rdp-accent-background-color": "#e0f2fe" } as React.CSSProperties}>
            {mode === "single" ? (
              <DayPicker
                mode="single"
                selected={parseIso(startDate)}
                classNames={dayPickerClassNames}
                onSelect={(date) => {
                  const iso = date ? toInputDate(date) : "";
                  onChangeStart(iso);
                  onChangeEnd(iso);
                }}
              />
            ) : (
              <DayPicker
                mode="range"
                selected={rangeValue}
                classNames={dayPickerClassNames}
                onSelect={handleRangeSelect}
              />
            )}
          </div>

          {/* Action bar */}
          <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-2">
            {mode === "single" ? (
              <button
                type="button"
                onClick={() => { const iso = toInputDate(today); onChangeStart(iso); onChangeEnd(iso); }}
                className="tx-date-action-btn"
              >
                {t("txPage.today", "Today")}
              </button>
            ) : (
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => { const iso = toInputDate(today); onChangeStart(iso); onChangeEnd(iso); }}
                  className="tx-date-action-btn"
                >
                  {t("txPage.today", "Today")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChangeStart(toInputDate(new Date(today.getFullYear(), today.getMonth(), 1)));
                    onChangeEnd(toInputDate(today));
                  }}
                  className="tx-date-action-btn"
                >
                  {t("txPage.thisMonth", "This month")}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => { clearDates(); setOpen(false); }}
              className="tx-date-action-btn tx-date-action-btn--ghost"
            >
              {t("txPage.clearDates", "Clear")}
            </button>
          </div>

          {/* Panel colapsable: fechas sueltas (múltiples) */}
          <div className="mt-2 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={() => setShowMultiPanel((v) => !v)}
              className="flex w-full items-center justify-between text-xs font-semibold text-slate-500 transition hover:text-sky-600"
            >
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {t("txPage.looseDatesLabel", "Loose dates")}
                {specificDates.length > 0 && (
                  <span className="rounded-full bg-sky-100 px-1.5 text-sky-700">
                    {specificDates.length}
                  </span>
                )}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${showMultiPanel ? "rotate-180" : ""}`}
              />
            </button>

            {showMultiPanel && (
              <div
                className="mt-1"
                style={{ "--rdp-accent-color": "#0ea5e9", "--rdp-accent-background-color": "#e0f2fe" } as React.CSSProperties}
              >
                <DayPicker
                  mode="multiple"
                  selected={multipleDates}
                  classNames={dayPickerClassNames}
                  onSelect={handleMultipleSelect}
                />
                {specificDates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onChangeSpecificDates([])}
                    className="mt-1 text-xs text-red-400 hover:text-red-600"
                  >
                    {t("txPage.clearLooseDates", "Clear loose dates")}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
