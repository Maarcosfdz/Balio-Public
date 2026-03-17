package Balio.web.rest.dtos;

public class ChartWidgetSummaryDto {

    private String id;
    private String name;
    private String widgetType;
    private String chartType;
    private boolean pinned;
    private boolean visible;
    private Integer displayOrder;
    private String layoutSize;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

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

    public boolean isPinned() {
        return pinned;
    }

    public void setPinned(boolean pinned) {
        this.pinned = pinned;
    }

    public boolean isVisible() {
        return visible;
    }

    public void setVisible(boolean visible) {
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
}
