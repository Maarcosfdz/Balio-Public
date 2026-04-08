import { type FormEvent, useEffect, useState } from "react";
import { Bookmark, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { GradientButton } from "@/components/ui/gradient-button";

interface SaveFilterDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

export default function SaveFilterDialog({ open, onClose, onSave }: SaveFilterDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [visible, setVisible] = useState(false);

  // Entrance animation
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      requestAnimationFrame(() => setVisible(false));
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim());
    setName("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with fade */}
      <div
        className={`fixed inset-0 bg-black/30 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      {/* Dialog with scale-up + fade */}
      <div
        className={`relative z-10 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl transition-all duration-300 ${
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-sky-500" />
            <h3 className="text-lg font-bold text-slate-900">{t("txPage.saveFilter")}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("txPage.filterNamePlaceholder")}
            className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition-all duration-200 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-cancel-draw"
            >
              {t("common.cancel")}
            </button>
            <GradientButton
              type="submit"
              disabled={!name.trim()}
              size="sm"
              iconVariant="other"
              className="rounded-lg px-4 py-2 text-sm font-semibold"
            >
              {t("common.save")}
            </GradientButton>
          </div>
        </form>
      </div>
    </div>
  );
}
