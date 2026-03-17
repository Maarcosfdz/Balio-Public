package Balio.web.rest.dtos;

import Balio.web.enums.WidgetChartType;
import Balio.web.enums.WidgetType;
import jakarta.validation.constraints.Size;

public class ChartWidgetUpdateDto {

    @Size(max = 100)
    private String name;

    private WidgetType widgetType;

    private WidgetChartType chartType;

    private String configuration;

    private Boolean pinned;
    private Boolean visible;
    private Integer displayOrder;

    @Size(max = 20)
    private String layoutSize;

    private String importFilterId;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

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

    public Boolean getPinned() {
        return pinned;
    }

    public void setPinned(Boolean pinned) {
        this.pinned = pinned;
    }

    public Boolean getVisible() {
        return visible;
    }

    public void setVisible(Boolean visible) {
        this.visible = visible;
    }

    public Integer getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(Integer displayOrder) {
        this.displayOrder = displayOrder;
    }

    public String getLayoutSize() {
        return layoutSize;
    }

    public void setLayoutSize(String layoutSize) {
        this.layoutSize = layoutSize;
    }

    public String getImportFilterId() {
        return importFilterId;
    }

    public void setImportFilterId(String importFilterId) {
        this.importFilterId = importFilterId;
    }
}
