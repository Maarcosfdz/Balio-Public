package Balio.web.rest.dtos;

import com.fasterxml.jackson.databind.JsonNode;

public class ChartWidgetPreviewResponseDto {

    private String widgetType;
    private String chartType;
    private JsonNode data;

    public String getWidgetType() {
        return widgetType;
    }

    public void setWidgetType(String widgetType) {
        this.widgetType = widgetType;
    }

    public String getChartType() {
        return chartType;
    }

    public void setChartType(String chartType) {
        this.chartType = chartType;
    }

    public JsonNode getData() {
        return data;
    }

    public void setData(JsonNode data) {
        this.data = data;
    }
}
