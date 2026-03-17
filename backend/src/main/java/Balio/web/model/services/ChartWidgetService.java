package Balio.web.model.services;

import Balio.web.enums.WidgetChartType;
import Balio.web.enums.WidgetType;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.ChartWidget;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface ChartWidgetService {

    ChartWidget createWidget(UUID userId, String name, WidgetType widgetType,
                             WidgetChartType chartType, String configuration,
                             Boolean pinned, Boolean visible, Integer displayOrder,
                             String layoutSize, UUID importFilterId);

    ChartWidget modifyWidget(UUID userId, UUID widgetId, String name, WidgetType widgetType,
                             WidgetChartType chartType, String configuration,
                             Boolean pinned, Boolean visible, Integer displayOrder,
                             String layoutSize, UUID importFilterId) throws InstanceNotFoundException;

    void deleteWidget(UUID userId, UUID widgetId) throws InstanceNotFoundException;

    ChartWidget findByIdAndUserId(UUID widgetId, UUID userId) throws InstanceNotFoundException;

    List<ChartWidget> findAllByUserId(UUID userId, Boolean pinned);

    Page<ChartWidget> findPagedByUserId(UUID userId, Boolean pinned, Pageable pageable);

    JsonNode preview(UUID userId, UUID widgetId) throws InstanceNotFoundException;

    JsonNode previewConfiguration(UUID userId, WidgetType widgetType,
                                  WidgetChartType chartType, String configuration,
                                  UUID importFilterId);

    void recalculatePreviewCache();
}
