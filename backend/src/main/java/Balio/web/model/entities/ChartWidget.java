package Balio.web.model.entities;

import Balio.web.enums.WidgetChartType;
import Balio.web.enums.WidgetType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Entity
@Table(name = "chart_widgets")
public class ChartWidget {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "widget_type", nullable = false, length = 20)
    private WidgetType widgetType;

    @Enumerated(EnumType.STRING)
    @Column(name = "chart_type", nullable = false, length = 30)
    private WidgetChartType chartType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "configuration", columnDefinition = "jsonb", nullable = false)
    private String configuration;

    @Column(name = "is_pinned", nullable = false)
    private boolean pinned = false;

    @Column(name = "is_visible", nullable = false)
    private boolean visible = true;

    @Column(name = "display_order")
    private Integer displayOrder;

    @Column(name = "layout_size", length = 20)
    private String layoutSize;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    protected ChartWidget() {
    }

    public ChartWidget(String name, WidgetType widgetType, WidgetChartType chartType,
                       String configuration, boolean pinned, boolean visible,
                       Integer displayOrder, String layoutSize, User user) {
        this.name = name;
        this.widgetType = widgetType;
        this.chartType = chartType;
        this.configuration = configuration;
        this.pinned = pinned;
        this.visible = visible;
        this.displayOrder = displayOrder;
        this.layoutSize = layoutSize;
        this.user = user;
    }

    public UUID getId() {
        return id;
    }

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

    public User getUser() {
        return user;
    }
}
