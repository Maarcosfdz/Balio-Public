import { useMemo } from "react";
import { Eye, Save } from "lucide-react";
import type { FilterSummaryDto } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { renderWidget } from "../registry";
import type {
  AnalysisTransaction,
  AnalysisWidget,
  DateRangePreset,
  WidgetDraft,
  WidgetTemplate,
  WidgetType,
} from "../types";

interface AnalysisConfiguratorProps {
  draft: WidgetDraft | null;
  draftPreviewData?: unknown;
  templates: WidgetTemplate[];
  transactions: AnalysisTransaction[];
  savedFilters: FilterSummaryDto[];
  onStartCreate: (templateId?: string) => void;
  onDraftChange: (next: WidgetDraft) => void;
  onImportFilter: (filterId: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const dateRangeOptions: Array<{ value: DateRangePreset; label: string }> = [
  { value: "30d", label: "Ultimos 30 dias" },
  { value: "90d", label: "Ultimos 90 dias" },
  { value: "365d", label: "Ultimos 12 meses" },
  { value: "ytd", label: "Anio actual (YTD)" },
];

const typeOptions: WidgetType[] = [
  "kpi",
  "table",
  "bar",
  "line",
  "donut",
  "stackedBar",
  "heatmap",
  "comparison",
];

function getTypeLabel(type: WidgetType): string {
  const labels: Record<WidgetType, string> = {
    kpi: "KPI",
    table: "Tabla",
    bar: "Barras",
    line: "Linea/Area",
    donut: "Donut",
    stackedBar: "Barras apiladas",
    heatmap: "Heatmap",
    comparison: "Comparativa",
  };
  return labels[type];
}

export default function AnalysisConfigurator({
  draft,
  draftPreviewData,
  templates,
  transactions,
  savedFilters,
  onStartCreate,
  onDraftChange,
  onImportFilter,
  onSave,
  onCancel,
}: AnalysisConfiguratorProps) {
  const accountOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const tx of transactions) map.set(tx.accountId, tx.accountName);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [transactions]);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const tx of transactions) {
      if (tx.categoryId) map.set(tx.categoryId, tx.categoryName);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions]);

  const previewWidget: AnalysisWidget | null = useMemo(() => {
    if (!draft) return null;
    return {
      id: "preview",
      order: 0,
      title: draft.title,
      description: draft.description,
      type: draft.type,
      size: draft.size,
      config: draft.config,
    };
  }, [draft]);

  const changeDraftConfig = (patch: Partial<WidgetDraft["config"]>) => {
    if (!draft) return;
    onDraftChange({
      ...draft,
      config: { ...draft.config, ...patch },
    });
  };

  const parsedSpecificDates = draft?.config.specificDates.join(", ") ?? "";

  return (
    <div className="sticky top-4 space-y-4">
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Configurador de gráfico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!draft && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Elige una plantilla para empezar a previsualizar sin entrar en modo gestion.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => onStartCreate(tpl.id)}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-sky-300 hover:bg-sky-50"
                  >
                    <p className="text-sm font-semibold text-slate-800">{tpl.label}</p>
                    <p className="text-xs text-slate-500">{tpl.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {draft && (
            <>
              <div className="rounded-lg border border-sky-100 bg-sky-50/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                  Importar filtro guardado
                </p>
                <div className="mt-2 flex gap-2">
                  <select
                    className="h-9 flex-1 rounded-lg border border-sky-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={draft.importedFilterId ?? ""}
                    onChange={(event) => {
                      const nextFilterId = event.target.value;
                      if (!nextFilterId) {
                        onDraftChange({ ...draft, importedFilterId: undefined });
                        return;
                      }
                      onImportFilter(nextFilterId);
                    }}
                  >
                    <option value="">Selecciona un filtro</option>
                    {savedFilters.map((filter) => (
                      <option key={filter.id} value={filter.id}>{filter.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <label className="text-sm font-medium text-slate-700">
                  Titulo
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={draft.title}
                    onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Descripcion
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={draft.description}
                    onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium text-slate-700">
                  Tipo
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={draft.type}
                    onChange={(event) => onDraftChange({ ...draft, type: event.target.value as WidgetType })}
                  >
                    {typeOptions.map((type) => (
                      <option key={type} value={type}>{getTypeLabel(type)}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Tamano
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={draft.size}
                    onChange={(event) =>
                      onDraftChange({ ...draft, size: event.target.value as AnalysisWidget["size"] })}
                  >
                    <option value="sm">Pequeño</option>
                    <option value="md">Mediano</option>
                    <option value="lg">Grande</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium text-slate-700">
                  Rango rapido
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={draft.config.dateRange}
                    onChange={(event) =>
                      changeDraftConfig({ dateRange: event.target.value as DateRangePreset })}
                  >
                    {dateRangeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Tipo movimiento
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={draft.config.transactionType ?? ""}
                    onChange={(event) =>
                      changeDraftConfig({
                        transactionType:
                          event.target.value === "INCOME" || event.target.value === "EXPENSE"
                            ? event.target.value
                            : undefined,
                      })}
                  >
                    <option value="">Todos</option>
                    <option value="INCOME">Ingresos</option>
                    <option value="EXPENSE">Gastos</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium text-slate-700">
                  Desde
                  <input
                    type="date"
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={draft.config.startDate ?? ""}
                    onChange={(event) => changeDraftConfig({ startDate: event.target.value || undefined })}
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Hasta
                  <input
                    type="date"
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={draft.config.endDate ?? ""}
                    onChange={(event) => changeDraftConfig({ endDate: event.target.value || undefined })}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium text-slate-700">
                  Cuenta
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={draft.config.accountId ?? ""}
                    onChange={(event) => changeDraftConfig({ accountId: event.target.value || undefined })}
                  >
                    <option value="">Todas</option>
                    {accountOptions.map((account) => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Buscar nombre
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={draft.config.nameQuery}
                    onChange={(event) => changeDraftConfig({ nameQuery: event.target.value })}
                    placeholder="Ej. alquiler, nomina..."
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium text-slate-700">
                  Importe minimo
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={draft.config.amountMin ?? ""}
                    onChange={(event) =>
                      changeDraftConfig({
                        amountMin: event.target.value ? Number(event.target.value) : undefined,
                      })}
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Importe maximo
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={draft.config.amountMax ?? ""}
                    onChange={(event) =>
                      changeDraftConfig({
                        amountMax: event.target.value ? Number(event.target.value) : undefined,
                      })}
                  />
                </label>
              </div>

              <label className="text-sm font-medium text-slate-700">
                Fechas especificas (YYYY-MM-DD, separadas por coma)
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  value={parsedSpecificDates}
                  onChange={(event) =>
                    changeDraftConfig({
                      specificDates: event.target.value
                        .split(",")
                        .map((item) => item.trim())
                        .filter((item) => item.length > 0),
                    })}
                  placeholder="2026-03-01, 2026-03-15"
                />
              </label>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Categorias</p>
                <div className="max-h-36 overflow-auto rounded-lg border border-slate-200 bg-white p-2">
                  {categoryOptions.length === 0 ? (
                    <p className="px-2 py-1 text-xs text-slate-400">No hay categorias disponibles</p>
                  ) : (
                    categoryOptions.map((category) => {
                      const checked = draft.config.categoryIds.includes(category.id);
                      return (
                        <label
                          key={category.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-600 transition hover:bg-sky-50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = checked
                                ? draft.config.categoryIds.filter((id) => id !== category.id)
                                : [...draft.config.categoryIds, category.id];
                              changeDraftConfig({ categoryIds: next });
                            }}
                            className="h-3.5 w-3.5 accent-sky-500"
                          />
                          {category.name}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {"metric" in draft.config && (
                <label className="text-sm font-medium text-slate-700">
                  Metrica KPI
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={draft.config.metric}
                    onChange={(event) =>
                      changeDraftConfig({
                        metric: event.target.value as "income" | "expense" | "balance" | "savingsRate",
                      })}
                  >
                    <option value="income">Ingresos</option>
                    <option value="expense">Gastos</option>
                    <option value="balance">Balance</option>
                    <option value="savingsRate">Tasa de ahorro</option>
                  </select>
                </label>
              )}

              {"groupBy" in draft.config && (
                <label className="text-sm font-medium text-slate-700">
                  Agrupar por
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={draft.config.groupBy}
                    onChange={(event) =>
                      changeDraftConfig({ groupBy: event.target.value as "category" | "account" })}
                  >
                    <option value="category">Categoria</option>
                    <option value="account">Cuenta</option>
                  </select>
                </label>
              )}

              {"compare" in draft.config && (
                <label className="text-sm font-medium text-slate-700">
                  Comparacion
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={draft.config.compare}
                    onChange={(event) =>
                      changeDraftConfig({
                        compare: event.target.value as "monthVsPrevious" | "quarterVsPrevious",
                      })}
                  >
                    <option value="monthVsPrevious">Mes actual vs anterior</option>
                    <option value="quarterVsPrevious">Trimestre actual vs anterior</option>
                  </select>
                </label>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button className="flex-1" onClick={onSave}>
                  <Save className="mr-1 h-4 w-4" />
                  {draft.mode === "create" ? "Guardar gráfico" : "Actualizar gráfico"}
                </Button>
                <Button variant="outline" onClick={onCancel}>Cancelar</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {previewWidget && (
        <Card className="border-sky-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4 text-sky-700" />
              Previsualizacion
            </CardTitle>
          </CardHeader>
          <CardContent>{renderWidget(previewWidget, transactions, draftPreviewData)}</CardContent>
        </Card>
      )}
    </div>
  );
}
