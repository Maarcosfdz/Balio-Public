package Balio.web.model.services;

import Balio.web.enums.WidgetChartType;
import Balio.web.enums.WidgetType;
import Balio.web.model.Exceptions.ChartWidgetInvalidException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.ChartWidget;
import Balio.web.model.entities.ChartWidgetDao;
import Balio.web.model.entities.Filter;
import Balio.web.model.entities.FilterDao;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ChartWidgetServiceImpl implements ChartWidgetService {

    private static final String PREVIEW_SAVED_CACHE = "chartPreviewSaved";
    private static final String PREVIEW_CONFIG_CACHE = "chartPreviewConfig";

    private final UserDao userDao;
    private final FilterDao filterDao;
    private final ChartWidgetDao chartWidgetDao;
    private final WidgetResolverRegistry resolverRegistry;
    private final ObjectMapper objectMapper;

    public ChartWidgetServiceImpl(UserDao userDao,
                                  FilterDao filterDao,
                                  ChartWidgetDao chartWidgetDao,
                                  WidgetResolverRegistry resolverRegistry,
                                  ObjectMapper objectMapper) {
        this.userDao = userDao;
        this.filterDao = filterDao;
        this.chartWidgetDao = chartWidgetDao;
        this.resolverRegistry = resolverRegistry;
        this.objectMapper = objectMapper;
    }

    @Override
        @Caching(evict = {
            @CacheEvict(cacheNames = PREVIEW_SAVED_CACHE, allEntries = true),
            @CacheEvict(cacheNames = PREVIEW_CONFIG_CACHE, allEntries = true)
        })
    public ChartWidget createWidget(UUID userId, String name, WidgetType widgetType,
                                    WidgetChartType chartType, String configuration,
                                    Boolean pinned, Boolean visible, Integer displayOrder,
                                    String layoutSize, UUID importFilterId) {
        User user = userDao.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        String normalizedName = validateName(name);
        validateTypeCompatibility(widgetType, chartType);
        String normalizedConfiguration = normalizeConfiguration(configuration, userId, importFilterId);

        ChartWidget widget = new ChartWidget(
                normalizedName,
                widgetType,
                chartType,
                normalizedConfiguration,
                pinned != null && pinned,
                visible == null || visible,
                displayOrder,
                normalizeLayoutSize(layoutSize),
                user
        );

        return chartWidgetDao.save(widget);
    }

    @Override
        @Caching(evict = {
            @CacheEvict(cacheNames = PREVIEW_SAVED_CACHE, allEntries = true),
            @CacheEvict(cacheNames = PREVIEW_CONFIG_CACHE, allEntries = true)
        })
    public ChartWidget modifyWidget(UUID userId, UUID widgetId, String name, WidgetType widgetType,
                                    WidgetChartType chartType, String configuration,
                                    Boolean pinned, Boolean visible, Integer displayOrder,
                                    String layoutSize, UUID importFilterId) throws InstanceNotFoundException {
        ChartWidget widget = findByIdAndUserId(widgetId, userId);

        if (name != null) {
            widget.setName(validateName(name));
        }

        WidgetType effectiveType = widgetType != null ? widgetType : widget.getWidgetType();
        WidgetChartType effectiveChartType = chartType != null ? chartType : widget.getChartType();
        validateTypeCompatibility(effectiveType, effectiveChartType);

        if (widgetType != null) {
            widget.setWidgetType(widgetType);
        }
        if (chartType != null) {
            widget.setChartType(chartType);
        }
        if (configuration != null || importFilterId != null) {
            widget.setConfiguration(normalizeConfiguration(
                    configuration != null ? configuration : widget.getConfiguration(),
                    userId,
                    importFilterId));
        }
        if (pinned != null) {
            widget.setPinned(pinned);
        }
        if (visible != null) {
            widget.setVisible(visible);
        }
        if (displayOrder != null) {
            widget.setDisplayOrder(displayOrder);
        }
        if (layoutSize != null) {
            widget.setLayoutSize(normalizeLayoutSize(layoutSize));
        }

        return chartWidgetDao.save(widget);
    }

    @Override
    @Caching(evict = {
            @CacheEvict(cacheNames = PREVIEW_SAVED_CACHE, allEntries = true),
            @CacheEvict(cacheNames = PREVIEW_CONFIG_CACHE, allEntries = true)
    })
    public void deleteWidget(UUID userId, UUID widgetId) throws InstanceNotFoundException {
        ChartWidget widget = findByIdAndUserId(widgetId, userId);
        chartWidgetDao.delete(widget);
    }

    @Override
    @Transactional(readOnly = true)
    public ChartWidget findByIdAndUserId(UUID widgetId, UUID userId) throws InstanceNotFoundException {
        return chartWidgetDao.findByIdAndUserId(widgetId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("ChartWidget", widgetId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChartWidget> findAllByUserId(UUID userId, Boolean pinned) {
        if (pinned == null) {
            return chartWidgetDao.findAllByUserIdOrderByDisplayOrderAscNameAsc(userId);
        }
        return chartWidgetDao.findAllByUserIdAndPinnedOrderByDisplayOrderAscNameAsc(userId, pinned);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ChartWidget> findPagedByUserId(UUID userId, Boolean pinned, Pageable pageable) {
        if (pinned == null) {
            return chartWidgetDao.findAllByUserIdOrderByDisplayOrderAscNameAsc(userId, pageable);
        }
        return chartWidgetDao.findAllByUserIdAndPinnedOrderByDisplayOrderAscNameAsc(userId, pinned, pageable);
    }

    @Override
    @Transactional(readOnly = true)
        @Cacheable(
            cacheNames = PREVIEW_SAVED_CACHE,
            key = "#userId + ':' + #widgetId",
            unless = "#result == null"
        )
    public JsonNode preview(UUID userId, UUID widgetId) throws InstanceNotFoundException {
        ChartWidget widget = findByIdAndUserId(widgetId, userId);
        JsonNode configuration = parseJson(widget.getConfiguration());
        return resolverRegistry.get(widget.getWidgetType())
                .resolve(userId, widget.getChartType(), configuration);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(
            cacheNames = PREVIEW_CONFIG_CACHE,
            key = "#userId + ':' + #widgetType.name() + ':' + #chartType.name() + ':' + #configuration + ':' + #importFilterId",
            unless = "#result == null"
    )
    public JsonNode previewConfiguration(UUID userId, WidgetType widgetType,
                                         WidgetChartType chartType, String configuration,
                                         UUID importFilterId) {
        validateTypeCompatibility(widgetType, chartType);
        String normalized = normalizeConfiguration(configuration, userId, importFilterId);
        JsonNode configNode = parseJson(normalized);
        return resolverRegistry.get(widgetType).resolve(userId, chartType, configNode);
    }

    @Override
    @Caching(evict = {
            @CacheEvict(cacheNames = PREVIEW_SAVED_CACHE, allEntries = true),
            @CacheEvict(cacheNames = PREVIEW_CONFIG_CACHE, allEntries = true)
    })
    public void recalculatePreviewCache() {
        // Metodo de sincronizacion explicito para forzar recalculo en siguiente preview.
    }

    private String validateName(String name) {
        if (name == null || name.isBlank()) {
            throw new ChartWidgetInvalidException("Widget name is required");
        }
        String normalized = name.trim();
        if (normalized.length() > 100) {
            throw new ChartWidgetInvalidException("Widget name cannot exceed 100 characters");
        }
        return normalized;
    }

    private void validateTypeCompatibility(WidgetType type, WidgetChartType chartType) {
        if (type == null || chartType == null) {
            throw new ChartWidgetInvalidException("widgetType and chartType are required");
        }

        boolean valid = switch (type) {
            case KPI -> chartType == WidgetChartType.KPI_CARD;
            case TABLE -> chartType == WidgetChartType.SUMMARY_TABLE;
            case CHART -> chartType != WidgetChartType.KPI_CARD
                    && chartType != WidgetChartType.SUMMARY_TABLE;
        };

        if (!valid) {
            throw new ChartWidgetInvalidException(
                    "Incompatible widgetType/chartType: " + type + " / " + chartType);
        }
    }

    private String normalizeConfiguration(String configuration,
                                          UUID userId,
                                          UUID importFilterId) {
        JsonNode root = parseJson(configuration);
        if (!root.isObject()) {
            throw new ChartWidgetInvalidException("Widget configuration must be a JSON object");
        }

        ObjectNode object = (ObjectNode) root;
        if (importFilterId != null) {
            Filter filter = filterDao.findByIdAndUserId(importFilterId, userId)
                    .orElseThrow(() -> new ChartWidgetInvalidException(
                            "Filter to import was not found for this user"));
            JsonNode filterDefinition = parseJson(filter.getDefinition());
            object.set("filter", filterDefinition);
        }

        try {
            return objectMapper.writeValueAsString(object);
        } catch (JsonProcessingException e) {
            throw new ChartWidgetInvalidException("Failed to serialize widget configuration");
        }
    }

    private JsonNode parseJson(String json) {
        if (json == null || json.isBlank()) {
            throw new ChartWidgetInvalidException("Widget configuration is required");
        }
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException e) {
            throw new ChartWidgetInvalidException("Widget configuration is not valid JSON");
        }
    }

    private String normalizeLayoutSize(String layoutSize) {
        if (layoutSize == null || layoutSize.isBlank()) {
            return null;
        }
        String normalized = layoutSize.trim().toUpperCase();
        if (normalized.length() > 20) {
            throw new ChartWidgetInvalidException("layoutSize cannot exceed 20 characters");
        }
        return normalized;
    }
}
