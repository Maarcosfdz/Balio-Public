package Balio.web.model.services;

import Balio.web.enums.WidgetChartType;
import Balio.web.enums.WidgetType;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.UUID;

public interface WidgetDataResolver {

    WidgetType supports();

    JsonNode resolve(UUID userId, WidgetChartType chartType, JsonNode configuration);
}
