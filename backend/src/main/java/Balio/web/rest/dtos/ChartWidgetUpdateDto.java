package Balio.web.rest.dtos;

import Balio.web.enums.WidgetChartType;
import Balio.web.enums.WidgetType;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
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
}
