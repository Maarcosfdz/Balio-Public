package Balio.web.rest.dtos;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChartWidgetSummaryDto {

    private String id;
    private String name;
    private String widgetType;
    private String chartType;
    private boolean pinned;
    private boolean visible;
    private Integer displayOrder;
    private String layoutSize;
}
