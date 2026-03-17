import api from "./api";

export type BackendWidgetType = "CHART" | "KPI" | "TABLE";
export type BackendChartType =
  | "BAR"
  | "LINE"
  | "AREA"
  | "PIE"
  | "DONUT"
  | "STACKED_BAR"
  | "KPI_CARD"
  | "SUMMARY_TABLE";

export interface ChartWidgetRequestDto {
  name: string;
  widgetType: BackendWidgetType;
  chartType: BackendChartType;
  configuration: string;
  importFilterId?: string;
  pinned?: boolean;
  visible?: boolean;
  displayOrder?: number;
  layoutSize?: string;
}

export interface ChartWidgetResponseDto {
  id: string;
  name: string;
  widgetType: BackendWidgetType;
  chartType: BackendChartType;
  configuration: string;
  importFilterId?: string;
  pinned: boolean;
  visible: boolean;
  displayOrder: number | null;
  layoutSize: string | null;
}

export interface ChartWidgetSummaryDto {
  id: string;
  name: string;
  widgetType: BackendWidgetType;
  chartType: BackendChartType;
  importFilterId?: string;
  pinned: boolean;
  visible: boolean;
  displayOrder: number | null;
  layoutSize: string | null;
}

export interface ChartWidgetPreviewRequestDto {
  widgetType: BackendWidgetType;
  chartType: BackendChartType;
  configuration: string;
  importFilterId?: string;
}

export interface ChartWidgetPreviewResponseDto {
  widgetType: BackendWidgetType;
  chartType: BackendChartType;
  data: unknown;
}

export const chartService = {
  getAll(): Promise<ChartWidgetSummaryDto[]> {
    return api.get("/chart").then((r) => r.data);
  },

  getById(widgetId: string): Promise<ChartWidgetResponseDto> {
    return api.get(`/chart/${widgetId}`).then((r) => r.data);
  },

  create(data: ChartWidgetRequestDto): Promise<ChartWidgetResponseDto> {
    return api.post("/chart", data).then((r) => r.data);
  },

  update(widgetId: string, data: Partial<ChartWidgetRequestDto>): Promise<ChartWidgetResponseDto> {
    return api.put(`/chart/${widgetId}`, data).then((r) => r.data);
  },

  remove(widgetId: string): Promise<void> {
    return api.delete(`/chart/${widgetId}`);
  },

  previewSaved(widgetId: string): Promise<ChartWidgetPreviewResponseDto> {
    return api.post(`/chart/${widgetId}/preview`).then((r) => r.data);
  },

  previewFromConfig(data: ChartWidgetPreviewRequestDto): Promise<ChartWidgetPreviewResponseDto> {
    return api.post("/chart/preview", data).then((r) => r.data);
  },

  synchronizeCache(): Promise<void> {
    return api.post("/chart/sync");
  },
};
