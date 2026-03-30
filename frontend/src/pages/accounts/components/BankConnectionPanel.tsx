import { useEffect, useState } from "react";
import { Building2, Link2, Loader2, RefreshCw, Search, X } from "lucide-react";
import { bankService, type BankInstitution } from "@/backend/bankService";
import type { BankConnectionDto } from "@/types";
import SingleSelectDropdown from "@/components/ui/SelectDropdown";

interface BankConnectionPanelProps {
  accountId: string;
  onSynced?: () => void;
}

export default function BankConnectionPanel({ accountId, onSynced }: BankConnectionPanelProps) {
  const [status, setStatus] = useState<BankConnectionDto | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncResult, setSyncResult] = useState<number | null>(null);
  const [lookBackDays, setLookBackDays] = useState(90);

  // Institution picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [institutions, setInstitutions] = useState<BankInstitution[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [institutionsError, setInstitutionsError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoadingStatus(true);
    bankService
      .getStatus(accountId)
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoadingStatus(false));
  }, [accountId]);

  // Fetch institutions when picker opens
  useEffect(() => {
    if (!pickerOpen || institutions.length > 0) return;
    setLoadingInstitutions(true);
    setInstitutionsError(null);
    bankService
      .listAspsps("ES")
      .then((list) => {
        if (list.length === 0) {
          setInstitutionsError("No se recibieron bancos del servidor. Comprueba la API key de Enable Banking.");
        }
        setInstitutions(list);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message ?? err?.message ?? "Error al cargar bancos";
        setInstitutionsError(msg);
        setInstitutions([]);
      })
      .finally(() => setLoadingInstitutions(false));
  }, [pickerOpen, institutions.length]);

  const handleSelectInstitution = async (inst: BankInstitution) => {
    setConnecting(true);
    setPickerOpen(false);
    try {
      const { authUrl } = await bankService.initEnableBankingConnection(
        accountId, inst.name, inst.country ?? "ES");
      window.location.href = authUrl;
    } catch {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await bankService.sync(accountId, lookBackDays);
      setSyncResult(result.imported);
      onSynced?.();
      const newStatus = await bankService.getStatus(accountId);
      setStatus(newStatus);
    } catch {
      // ignorar
    } finally {
      setSyncing(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center py-3 px-5">
        <Loader2 className="h-4 w-4 animate-spin text-slate-300" />
      </div>
    );
  }

  const isLinked = status?.linked === true;
  const filtered = institutions.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="px-5 pb-4 pt-2">
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-sky-500" />
            <div className="min-w-0">
              {isLinked ? (
                <>
                  <p className="truncate text-xs font-semibold text-slate-700">
                    {status?.provider ?? "Banco vinculado"}
                  </p>
                  {status?.lastSync ? (
                    <p className="text-[10px] text-slate-400">
                      Último sync:{" "}
                      {new Date(status.lastSync).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400">Sin sincronizar aún</p>
                  )}
                </>
              ) : (
                <p className="text-xs font-semibold text-slate-500">Sin vincular</p>
              )}
            </div>
          </div>

          {isLinked ? (
            <div className="flex items-center gap-1.5">
              <SingleSelectDropdown
                value={String(lookBackDays)}
                onChange={(v) => setLookBackDays(Number(v))}
                options={[
                  { value: "90", label: "90 días" },
                  { value: "365", label: "1 año" },
                  { value: "730", label: "2 años" },
                  { value: "1095", label: "3 años" },
                ]}
                disabled={syncing}
                buttonClassName="h-7 rounded-lg border border-slate-200 bg-white px-1.5 text-[11px] text-slate-600 outline-none"
              />
              <button
                onClick={handleSync}
                disabled={syncing}
                className="accounts-sync-btn flex shrink-0 items-center gap-1 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-600 disabled:opacity-60"
              >
                {syncing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="accounts-sync-btn__icon h-3.5 w-3.5" />
                )}
                Sincronizar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setPickerOpen(true)}
              disabled={connecting}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
            >
              {connecting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Link2 className="h-3.5 w-3.5" />
              )}
              Conectar banco
            </button>
          )}
        </div>

        {syncResult !== null && (
          <p className="mt-2 text-[10px] font-semibold text-emerald-600">
            ✓{" "}
            {syncResult === 0
              ? "Todo al día, sin transacciones nuevas"
              : `${syncResult} transacción${syncResult !== 1 ? "es" : ""} importada${syncResult !== 1 ? "s" : ""}`}
          </p>
        )}
      </div>

      {/* ── Institution picker modal ── */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setPickerOpen(false)}
          />
          <div className="relative z-10 flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h3 className="text-base font-bold text-slate-800">
                Selecciona tu banco
              </h3>
              <button
                onClick={() => setPickerOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="border-b px-5 py-3">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar banco..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  autoFocus
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {loadingInstitutions ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                </div>
              ) : institutionsError ? (
                <p className="py-6 text-center text-sm text-red-400">
                  ⚠ {institutionsError}
                </p>
              ) : filtered.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  No se encontraron bancos
                </p>
              ) : (
                <ul className="space-y-1">
                  {filtered.map((inst) => (
                    <li key={inst.name}>
                      <button
                        onClick={() => handleSelectInstitution(inst)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-sky-50"
                      >
                        {inst.logo ? (
                          <img
                            src={inst.logo}
                            alt={inst.name}
                            className="h-8 w-8 rounded-lg object-contain"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                            <Building2 className="h-4 w-4 text-slate-400" />
                          </div>
                        )}
                        <span className="text-sm font-medium text-slate-700">
                          {inst.name}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
