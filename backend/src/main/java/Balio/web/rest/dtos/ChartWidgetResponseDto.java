package Balio.web.rest.dtos;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChartWidgetResponseDto {

    private String id;
    private String name;
    private String widgetType;
    private String chartType;
    private String configuration;
    private boolean pinned;
    private boolean visible;
    private Integer displayOrder;
    private String layoutSize;
}
