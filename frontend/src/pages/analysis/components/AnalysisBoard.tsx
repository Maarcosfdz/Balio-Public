import { ArrowDown, ArrowUp, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWidgetRenderer, renderWidget } from "../registry";
import type { AnalysisTransaction, AnalysisWidget } from "../types";

interface AnalysisBoardProps {
  widgets: AnalysisWidget[];
  transactions: AnalysisTransaction[];
  previewsByWidgetId: Record<string, unknown>;
  activeWidgetId?: string;
  onCreate: () => void;
  onEdit: (widgetId: string) => void;
  onDelete: (widgetId: string) => void;
  onMove: (widgetId: string, direction: "up" | "down") => void;
  onReorder: (fromId: string, toId: string) => void;
}

function sizeClass(size: AnalysisWidget["size"]): string {
  if (size === "lg") return "md:col-span-2";
  return "md:col-span-1";
}

function sizeHeightClass(size: AnalysisWidget["size"]): string {
  if (size === "sm") return "min-h-[260px]";
  if (size === "md") return "min-h-[320px]";
  return "min-h-[380px]";
}

export default function AnalysisBoard({
  widgets,
  transactions,
  previewsByWidgetId,
  activeWidgetId,
  onCreate,
  onEdit,
  onDelete,
  onMove,
  onReorder,
}: AnalysisBoardProps) {
  const ordered = [...widgets].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {ordered.map((widget, index) => {
          const meta = getWidgetRenderer(widget.type);
          return (
            <Card
              key={widget.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", widget.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                const fromId = event.dataTransfer.getData("text/plain");
                if (!fromId || fromId === widget.id) return;
                onReorder(fromId, widget.id);
              }}
              className={`border-slate-200 bg-white ${sizeClass(widget.size)} ${sizeHeightClass(widget.size)} ${
                widget.id === activeWidgetId ? "ring-2 ring-sky-400" : ""
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base text-slate-800">{widget.title}</CardTitle>
                    <p className="mt-1 text-xs text-slate-500">{widget.description || meta.label}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onMove(widget.id, "up")}
                      disabled={index === 0}
                      title="Mover arriba"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onMove(widget.id, "down")}
                      disabled={index === ordered.length - 1}
                      title="Mover abajo"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(widget.id)} title="Editar">
                      <Pencil className="h-4 w-4 text-slate-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(widget.id)} title="Borrar">
                      <Trash2 className="h-4 w-4 text-rose-600" />
                    </Button>
                    <span
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400"
                      title="Arrastra para mover"
                    >
                      <GripVertical className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>{renderWidget(widget, transactions, previewsByWidgetId[widget.id])}</CardContent>
            </Card>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onCreate}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-sky-300 bg-sky-50 p-5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
      >
        <Plus className="h-4 w-4" />
        Añadir gráfico
      </button>
    </div>
  );
}
