package Balio.web.rest.dtos;

import Balio.web.enums.WidgetChartType;
import Balio.web.enums.WidgetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class ChartWidgetPreviewRequestDto {

    @NotNull
    private WidgetType widgetType;

    @NotNull
    private WidgetChartType chartType;

    @NotBlank
    private String configuration;

    private String importFilterId;

    public WidgetType getWidgetType() {
        return widgetType;
    }

    public void setWidgetType(WidgetType widgetType) {
        this.widgetType = widgetType;
    }

    public WidgetChartType getChartType() {
        return chartType;
    }

    public void setChartType(WidgetChartType chartType) {
        this.chartType = chartType;
    }

    public String getConfiguration() {
        return configuration;
    }

    public void setConfiguration(String configuration) {
        this.configuration = configuration;
    }

    public String getImportFilterId() {
        return importFilterId;
    }

    public void setImportFilterId(String importFilterId) {
        this.importFilterId = importFilterId;
    }
}
