import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AppIcon } from "./AppIcon";
import { ASSET_ICON_OPTIONS } from "./assetIconRegistry";
import { IconAvatar } from "./IconAvatar";
import {
  APP_ICON_OPTIONS,
  DEFAULT_ICON_BG_COLOR,
  ICON_BG_COLOR_OPTIONS,
  isAssetIconName,
  isAppIconName,
  normalizeIconBgColor,
  readEmojiFromIconName,
  resolveEntityIconName,
  toEmojiIconName,
} from "./iconRegistry";
import { cn } from "@/lib/utils";

interface IconPickerValue {
  iconName: string;
  iconBgColor: string;
}

interface IconPickerProps {
  iconName?: string | null;
  iconBgColor?: string | null;
  defaultIconName: string;
  defaultIconBgColor?: string;
  onChange: (value: IconPickerValue) => void;
  className?: string;
}

export function IconPicker({
  iconName,
  iconBgColor,
  defaultIconName,
  defaultIconBgColor = DEFAULT_ICON_BG_COLOR,
  onChange,
  className,
}: IconPickerProps) {
  const selectedIconName = resolveEntityIconName(iconName, undefined);
  const selectedColor = normalizeIconBgColor(iconBgColor, defaultIconBgColor);
  const selectedEmoji = readEmojiFromIconName(selectedIconName) ?? "";
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(true);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredAppIcons = useMemo(() => {
    if (!normalizedQuery) return APP_ICON_OPTIONS;
    return APP_ICON_OPTIONS.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery]);
  const filteredAssetIcons = useMemo(() => {
    if (!normalizedQuery) return ASSET_ICON_OPTIONS;
    return ASSET_ICON_OPTIONS.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery]);

  const handleEmojiChange = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      onChange({ iconName: defaultIconName, iconBgColor: selectedColor });
      return;
    }
    const emoji = Array.from(trimmed)[0];
    if (!emoji) return;
    onChange({ iconName: toEmojiIconName(emoji), iconBgColor: selectedColor });
  };

  return (
    <div className={cn("overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {/* ── Collapsible header ── */}
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2.5 transition hover:bg-slate-50"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-2.5">
          <p className="text-xs font-semibold text-slate-600">Icono</p>
          <IconAvatar
            iconName={selectedIconName}
            iconBgColor={selectedColor}
            className="h-6 w-6 rounded-md shadow-sm"
            iconClassName="h-3 w-3"
          />
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-400 transition-transform duration-250",
            collapsed ? "-rotate-90" : "rotate-0",
          )}
        />
      </button>

      {/* ── Animated body ── */}
      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: collapsed ? "0px" : "560px" }}
      >
        <div className="space-y-3 border-t border-slate-100 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Selecciona un icono o emoji</span>
            <button
              type="button"
              className="text-[11px] font-semibold text-sky-600 hover:text-sky-700"
              onClick={() =>
                onChange({
                  iconName: defaultIconName,
                  iconBgColor: normalizeIconBgColor(defaultIconBgColor),
                })
              }
            >
              Default
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
            <IconAvatar
              iconName={selectedIconName}
              iconBgColor={selectedColor}
              className="h-10 w-10 rounded-xl"
              iconClassName="h-5 w-5"
            />
            <label className="flex-1">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Emoji (opcional)</span>
              <input
                type="text"
                value={selectedEmoji}
                maxLength={4}
                onChange={(e) => handleEmojiChange(e.target.value)}
                placeholder="🙂"
                className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm outline-none focus:border-sky-400"
              />
            </label>
          </div>

          <div className="grid max-h-44 grid-cols-7 gap-1.5 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar icono..."
              className="col-span-full mb-1 h-8 rounded-md border border-slate-200 bg-white px-2 text-[12px] outline-none focus:border-sky-400"
            />
            {filteredAppIcons.map((option) => {
              const selected = isAppIconName(selectedIconName) && selectedIconName === option.name;
              return (
                <button
                  key={option.name}
                  type="button"
                  title={option.label}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border transition",
                    selected
                      ? "border-sky-500 bg-sky-50 text-sky-600"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50",
                  )}
                  onClick={() => onChange({ iconName: option.name, iconBgColor: selectedColor })}
                >
                  <AppIcon name={option.name} className="h-4 w-4" />
                </button>
              );
            })}
            {filteredAssetIcons.length > 0 && (
              <p className="col-span-full mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Assets
              </p>
            )}
            {filteredAssetIcons.map((option) => {
              const selected = isAssetIconName(selectedIconName) && selectedIconName === option.name;
              return (
                <button
                  key={option.name}
                  type="button"
                  title={option.label}
                  className={cn(
                    "h-9 w-9 overflow-hidden rounded-lg border transition",
                    selected
                      ? "border-sky-500 ring-2 ring-sky-200"
                      : "border-slate-200 hover:border-slate-300",
                  )}
                  onClick={() => onChange({ iconName: option.name, iconBgColor: selectedColor })}
                >
                  <img src={option.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              );
            })}
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-slate-500">Color de fondo</p>
            <div className="flex flex-wrap gap-1.5">
              {ICON_BG_COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition",
                    selectedColor === color ? "border-slate-500 scale-110" : "border-white hover:border-slate-300",
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => onChange({ iconName: selectedIconName, iconBgColor: color })}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
