package Balio.web.rest.dtos;

import Balio.web.model.entities.ChartWidget;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

@Component
public class ChartWidgetConverter {

    public ChartWidgetResponseDto toResponseDto(ChartWidget widget) {
        ChartWidgetResponseDto dto = new ChartWidgetResponseDto();
        dto.setId(widget.getId().toString());
        dto.setName(widget.getName());
        dto.setWidgetType(widget.getWidgetType().name());
        dto.setChartType(widget.getChartType().name());
        dto.setConfiguration(widget.getConfiguration());
        dto.setPinned(widget.isPinned());
        dto.setVisible(widget.isVisible());
        dto.setDisplayOrder(widget.getDisplayOrder());
        dto.setLayoutSize(widget.getLayoutSize());
        return dto;
    }

    public ChartWidgetSummaryDto toSummaryDto(ChartWidget widget) {
        ChartWidgetSummaryDto dto = new ChartWidgetSummaryDto();
        dto.setId(widget.getId().toString());
        dto.setName(widget.getName());
        dto.setWidgetType(widget.getWidgetType().name());
        dto.setChartType(widget.getChartType().name());
        dto.setPinned(widget.isPinned());
        dto.setVisible(widget.isVisible());
        dto.setDisplayOrder(widget.getDisplayOrder());
        dto.setLayoutSize(widget.getLayoutSize());
        return dto;
    }

    public ChartWidgetPreviewResponseDto toPreviewDto(String widgetType,
                                                      String chartType,
                                                      JsonNode data) {
        ChartWidgetPreviewResponseDto dto = new ChartWidgetPreviewResponseDto();
        dto.setWidgetType(widgetType);
        dto.setChartType(chartType);
        dto.setData(data);
        return dto;
    }
}
