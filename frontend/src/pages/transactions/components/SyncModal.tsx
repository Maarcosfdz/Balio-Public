import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import "@/styles/components/buttons.css";

interface SyncModalProps {
  open: boolean;
  onConfirm: (ignoreSyncLimit: boolean) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function SyncModal({ open, onConfirm, onCancel, loading }: SyncModalProps) {
  const { t } = useTranslation();
  const [selectedMode, setSelectedMode] = useState<boolean | null>(null);

  if (!open) return null;

  const handleSync = () => {
    if (selectedMode !== null) {
      onConfirm(selectedMode);
    }
  };

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 z-50 animate-in fade-in slide-in-from-bottom-4">
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t("txPage.syncConfirmTitle", "Sincronizar bancos")}
        </h2>

        <p className="text-sm text-gray-600 mb-6">
          {t("txPage.syncConfirmDesc", "¿Quieres sincronizar las transacciones bancarias ahora?")}
        </p>

        <div className="space-y-3 mb-6">
          <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg border transition-all ${
            selectedMode === false
              ? "border-sky-500 bg-sky-50"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }`}>
            <input
              type="radio"
              name="syncMode"
              value="incremental"
              checked={selectedMode === false}
              onChange={() => setSelectedMode(false)}
              disabled={loading}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-gray-900 text-sm">
                {t("txPage.syncIncremental", "Solo nuevas transacciones")}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {t("txPage.syncIncrementalDesc", "Sincroniza solo desde la última actualización")}
              </div>
            </div>
          </label>

          <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg border transition-all ${
            selectedMode === true
              ? "border-sky-500 bg-sky-50"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }`}>
            <input
              type="radio"
              name="syncMode"
              value="full"
              checked={selectedMode === true}
              onChange={() => setSelectedMode(true)}
              disabled={loading}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-gray-900 text-sm">
                {t("txPage.syncFull", "Histórico completo")}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {t("txPage.syncFullDesc", "Trae todas las transacciones del último año")}
              </div>
            </div>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn-cancel-draw flex-1"
          >
            {t("common.cancel", "Cancelar")}
          </button>
          <button
            onClick={handleSync}
            disabled={loading || selectedMode === null}
            className="btn-register flex-1 justify-center text-sm"
          >
            {loading ? t("common.syncing", "Sincronizando...") : t("common.sync", "Sincronizar")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
