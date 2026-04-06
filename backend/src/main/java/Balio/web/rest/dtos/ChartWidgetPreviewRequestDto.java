package Balio.web.rest.dtos;

import Balio.web.enums.WidgetChartType;
import Balio.web.enums.WidgetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChartWidgetPreviewRequestDto {

    @NotNull
    private WidgetType widgetType;

    @NotNull
    private WidgetChartType chartType;

    @NotBlank
    private String configuration;

    private String importFilterId;
}
