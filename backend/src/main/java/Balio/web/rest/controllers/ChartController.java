package Balio.web.rest.controllers;

import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.ChartWidget;
import Balio.web.model.services.WidgetService;
import Balio.web.rest.dtos.ChartWidgetConverter;
import Balio.web.rest.dtos.ChartWidgetDto;
import Balio.web.rest.dtos.ChartWidgetPreviewRequestDto;
import Balio.web.rest.dtos.ChartWidgetPreviewResponseDto;
import Balio.web.rest.dtos.ChartWidgetResponseDto;
import Balio.web.rest.dtos.ChartWidgetSummaryDto;
import Balio.web.rest.dtos.ChartWidgetUpdateDto;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/chart")
public class ChartController {

    private static final Logger log = LoggerFactory.getLogger(ChartController.class);

    private final WidgetService widgetService;
    private final ChartWidgetConverter chartWidgetConverter;

    public ChartController(WidgetService widgetService,
                           ChartWidgetConverter chartWidgetConverter) {
        this.widgetService = widgetService;
        this.chartWidgetConverter = chartWidgetConverter;
    }

    @GetMapping
    public List<ChartWidgetSummaryDto> getAllWidgets(@RequestAttribute UUID userId,
                                                     @RequestParam(required = false) Boolean pinned) {
        return widgetService.findAllByUserId(userId, pinned).stream()
                .map(chartWidgetConverter::toSummaryDto)
                .toList();
    }

    @GetMapping("/paged")
    public Page<ChartWidgetSummaryDto> getPagedWidgets(
            @RequestAttribute UUID userId,
            @RequestParam(required = false) Boolean pinned,
            @PageableDefault(size = 20, sort = "displayOrder") Pageable pageable) {
        return widgetService.findPagedByUserId(userId, pinned, pageable)
                .map(chartWidgetConverter::toSummaryDto);
    }

    @GetMapping("/{widgetId}")
    public ChartWidgetResponseDto getWidget(@RequestAttribute UUID userId,
                                            @PathVariable UUID widgetId) throws InstanceNotFoundException {
        ChartWidget widget = widgetService.findByIdAndUserId(widgetId, userId);
        return chartWidgetConverter.toResponseDto(widget);
    }

    @PostMapping
    public ResponseEntity<ChartWidgetResponseDto> createWidget(@RequestAttribute UUID userId,
                                                                @Validated @RequestBody ChartWidgetDto dto) {
        UUID importFilterId = parseOptionalUuid(dto.getImportFilterId());
        ChartWidget widget = widgetService.createWidget(
                userId,
                dto.getName(),
                dto.getWidgetType(),
                dto.getChartType(),
                dto.getConfiguration(),
                dto.getPinned(),
                dto.getVisible(),
                dto.getDisplayOrder(),
                dto.getLayoutSize(),
                importFilterId
        );

        log.info("Chart widget created: widgetId={}, userId={}, type={}",
                widget.getId(), userId, widget.getWidgetType());

        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest().path("/{id}")
                .buildAndExpand(widget.getId()).toUri();

        return ResponseEntity.created(location).body(chartWidgetConverter.toResponseDto(widget));
    }

    @PutMapping("/{widgetId}")
    public ChartWidgetResponseDto updateWidget(@RequestAttribute UUID userId,
                                               @PathVariable UUID widgetId,
                                               @Validated @RequestBody ChartWidgetUpdateDto dto)
            throws InstanceNotFoundException {
        UUID importFilterId = parseOptionalUuid(dto.getImportFilterId());
        ChartWidget widget = widgetService.modifyWidget(
                userId,
                widgetId,
                dto.getName(),
                dto.getWidgetType(),
                dto.getChartType(),
                dto.getConfiguration(),
                dto.getPinned(),
                dto.getVisible(),
                dto.getDisplayOrder(),
                dto.getLayoutSize(),
                importFilterId
        );

        return chartWidgetConverter.toResponseDto(widget);
    }

    @DeleteMapping("/{widgetId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteWidget(@RequestAttribute UUID userId,
                             @PathVariable UUID widgetId) throws InstanceNotFoundException {
        widgetService.deleteWidget(userId, widgetId);
        log.info("Chart widget deleted: widgetId={}, userId={}", widgetId, userId);
    }

    @PostMapping("/{widgetId}/preview")
    public ChartWidgetPreviewResponseDto previewSavedWidget(@RequestAttribute UUID userId,
                                                            @PathVariable UUID widgetId)
            throws InstanceNotFoundException {
        ChartWidget widget = widgetService.findByIdAndUserId(widgetId, userId);
        JsonNode data = widgetService.preview(userId, widgetId);
        return chartWidgetConverter.toPreviewDto(
                widget.getWidgetType().name(),
                widget.getChartType().name(),
                data
        );
    }

    @PostMapping("/preview")
    public ChartWidgetPreviewResponseDto previewFromConfig(@RequestAttribute UUID userId,
                                                           @Validated @RequestBody ChartWidgetPreviewRequestDto dto) {
        JsonNode data = widgetService.previewConfiguration(
                userId,
                dto.getWidgetType(),
                dto.getChartType(),
                dto.getConfiguration(),
                parseOptionalUuid(dto.getImportFilterId())
        );
        return chartWidgetConverter.toPreviewDto(
                dto.getWidgetType().name(),
                dto.getChartType().name(),
                data
        );
    }

        @PostMapping("/sync")
        @ResponseStatus(HttpStatus.NO_CONTENT)
        public void synchronizeChartCache(@RequestAttribute UUID userId) {
                widgetService.recalculatePreviewCache();
                log.info("Chart preview cache synchronized by userId={}", userId);
        }

    private UUID parseOptionalUuid(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return UUID.fromString(value);
    }
}
