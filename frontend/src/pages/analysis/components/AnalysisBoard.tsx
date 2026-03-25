import { useMemo, useState } from "react";
import { Maximize2, Pencil, Plus, Trash2 } from "lucide-react";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogDescription,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getWidgetRenderer, renderWidget } from "../registry";
import type { AnalysisTransaction, AnalysisWidget, WidgetSize } from "../types";
import { useTranslation } from "react-i18next";

const COLS = 4;
const ROW_HEIGHT = 260;
const MARGIN: [number, number] = [16, 16];

const SIZE_MAP: Record<WidgetSize, { w: number; h: number }> = {
  sm: { w: 1, h: 1 },
  md: { w: 2, h: 1 },
  lg: { w: 2, h: 2 },
};

function gridToSize(w: number, h: number): WidgetSize {
  if (h >= 2) return "lg";
  if (w >= 2) return "md";
  return "sm";
}

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

function buildLayout(widgets: AnalysisWidget[]): LayoutItem[] {
  const sorted = [...widgets].sort((a, b) => a.order - b.order);
  const layout: LayoutItem[] = [];
  // Simple packing: track the next available Y for each column
  const colHeights = new Array(COLS).fill(0) as number[];

  for (const widget of sorted) {
    const dim = SIZE_MAP[widget.size];
    // Find the first position where this widget fits
    let bestX = 0;
    let bestY = Infinity;

    for (let x = 0; x <= COLS - dim.w; x++) {
      const maxY = Math.max(...colHeights.slice(x, x + dim.w));
      if (maxY < bestY) {
        bestY = maxY;
        bestX = x;
      }
    }

    layout.push({
      i: widget.id,
      x: bestX,
      y: bestY,
      w: dim.w,
      h: dim.h,
      minW: 1,
      minH: 1,
      maxW: COLS,
      maxH: 3,
    });

    // Update column heights
    for (let c = bestX; c < bestX + dim.w; c++) {
      colHeights[c] = bestY + dim.h;
    }
  }

  return layout;
}

interface AnalysisBoardProps {
  widgets: AnalysisWidget[];
  transactions: AnalysisTransaction[];
  previewsByWidgetId: Record<string, unknown>;
  activeWidgetId?: string;
  editMode: boolean;
  onCreate: () => void;
  onEdit: (widgetId: string) => void;
  onDelete: (widgetId: string) => void;
  onLayoutChange: (updates: { id: string; order: number; size: WidgetSize }[]) => void;
}

export default function AnalysisBoard({
  widgets,
  transactions,
  previewsByWidgetId,
  activeWidgetId,
  editMode,
  onCreate,
  onEdit,
  onDelete,
  onLayoutChange,
}: AnalysisBoardProps) {
  const { t } = useTranslation();
  const [lightboxWidget, setLightboxWidget] = useState<AnalysisWidget | null>(null);
  const { width, containerRef, mounted } = useContainerWidth();

  const layout = useMemo(() => buildLayout(widgets), [widgets]);

  const handleDragStop = (layoutInput: unknown) => {
    const layout = (Array.isArray(layoutInput) ? layoutInput : []) as LayoutItem[];
    // Derive new order from layout positions (top-to-bottom, left-to-right)
    const sorted = [...layout].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);
    const updates = sorted.map((item, idx) => ({
      id: item.i,
      order: idx,
      size: gridToSize(item.w, item.h),
    }));
    onLayoutChange(updates);
  };

  const handleResizeStop = (layoutInput: unknown) => {
    const layout = (Array.isArray(layoutInput) ? layoutInput : []) as LayoutItem[];
    const sorted = [...layout].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);
    const updates = sorted.map((item, idx) => ({
      id: item.i,
      order: idx,
      size: gridToSize(item.w, item.h),
    }));
    onLayoutChange(updates);
  };

  return (
    <div className="space-y-4">
      {editMode && (
        <div className="analysis-edit-banner">
          <span>
            {t("analysis.board.editModeHintPrefix")} <strong>{t("analysis.board.drag")}</strong> {t("analysis.board.editModeHintMiddle")} <strong>{t("analysis.board.corners")}</strong> {t("analysis.board.editModeHintSuffix")}
          </span>
        </div>
      )}

      <div ref={containerRef}>
        {mounted && width > 0 && (
          <ResponsiveGridLayout
            className="analysis-grid"
            layouts={{ lg: layout, md: layout, sm: layout, xs: layout }}
            breakpoints={{ lg: 1200, md: 900, sm: 600, xs: 0 }}
            cols={{ lg: COLS, md: COLS, sm: 2, xs: 1 }}
            rowHeight={ROW_HEIGHT}
            margin={MARGIN}
            width={width}
            dragConfig={{ enabled: editMode, handle: ".analysis-drag-zone" }}
            resizeConfig={{ enabled: editMode }}
            onDragStop={handleDragStop}
            onResizeStop={handleResizeStop}
          >
            {widgets
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((widget) => {
                const meta = getWidgetRenderer(widget.type);

                return (
                  <div key={widget.id}>
                    <Card
                      className={[
                        "analysis-grid-card h-full bg-white",
                        widget.id === activeWidgetId
                          ? "ring-2 ring-sky-400 border-sky-300"
                          : "border-slate-200",
                        editMode ? "analysis-card-edit" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <CardHeader className={`pb-2 ${editMode ? "analysis-drag-zone cursor-grab" : ""}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-base text-slate-800">{widget.title}</CardTitle>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {widget.description || meta.label}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            {/* Lightbox expand */}
                            <button
                              type="button"
                              className="analysis-expand-btn"
                              onClick={() => setLightboxWidget(widget)}
                              title={t("analysis.board.expand")}
                            >
                              <Maximize2 className="h-3.5 w-3.5" />
                            </button>

                            {editMode && (
                              <>
                                  <Button
                                  variant="outline"
                                  size="icon"
                                  className="analysis-edit-icon-btn h-7 w-7"
                                  onClick={() => onEdit(widget.id)}
                                  title={t("analysis.board.edit")}
                                >
                                  <Pencil className="btn-edit-icon h-3.5 w-3.5" />
                                </Button>

                                <button
                                  type="button"
                                  className="btn-delete-icon"
                                  onClick={() => onDelete(widget.id)}
                                  title={t("analysis.board.delete")}
                                  aria-label={t("analysis.board.delete")}
                                >
                                  <Trash2 className="btn-delete-icon__icon h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="analysis-grid-card-content flex-1 overflow-hidden">
                        {renderWidget(widget, transactions, previewsByWidgetId[widget.id])}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
          </ResponsiveGridLayout>
        )}
      </div>

      {/* Add chart — dashed empty style */}
      <button type="button" onClick={onCreate} className="analysis-add-btn">
        <Plus className="h-4 w-4" />
        {t("analysis.actions.addWidget")}
      </button>

      {/* Lightbox dialog */}
      <Dialog
        open={lightboxWidget !== null}
        onOpenChange={(open) => {
          if (!open) setLightboxWidget(null);
        }}
      >
        <DialogContent className="!max-w-[90vw] !h-[85vh] !w-[90vw] flex flex-col">
          {lightboxWidget && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg text-slate-800">
                  {lightboxWidget.title}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {t("analysis.board.expandedDialogDescription")}
                </DialogDescription>
                <p className="text-sm text-slate-500">
                  {lightboxWidget.description || getWidgetRenderer(lightboxWidget.type).label}
                </p>
              </DialogHeader>
              <div className="analysis-lightbox-chart flex-1 overflow-auto">
                {renderWidget(
                  { ...lightboxWidget, size: "lg" },
                  transactions,
                  previewsByWidgetId[lightboxWidget.id],
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
