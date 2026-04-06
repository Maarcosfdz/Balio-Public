package Balio.web.rest.dtos;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChartWidgetPreviewResponseDto {

    private String widgetType;
    private String chartType;
    private JsonNode data;
}
