package Balio.web.rest.dtos;

import Balio.web.enums.WidgetChartType;
import Balio.web.enums.WidgetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChartWidgetDto {

    @NotBlank
    @Size(max = 100)
    private String name;

    @NotNull
    private WidgetType widgetType;

    @NotNull
    private WidgetChartType chartType;

    @NotBlank
    private String configuration;

    private Boolean pinned;
    private Boolean visible;
    private Integer displayOrder;

    @Size(max = 20)
    private String layoutSize;

    private String importFilterId;
}
