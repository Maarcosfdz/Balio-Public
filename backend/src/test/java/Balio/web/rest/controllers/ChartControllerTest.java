package Balio.web.rest.controllers;

import Balio.web.enums.WidgetChartType;
import Balio.web.enums.WidgetType;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.ChartWidget;
import Balio.web.model.entities.User;
import Balio.web.model.services.WidgetService;
import Balio.web.rest.common.CommonControllerAdvice;
import Balio.web.rest.dtos.ChartWidgetConverter;
import Balio.web.rest.dtos.ChartWidgetPreviewResponseDto;
import Balio.web.rest.dtos.ChartWidgetResponseDto;
import Balio.web.rest.dtos.ChartWidgetSummaryDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class ChartControllerTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID WIDGET_ID = UUID.randomUUID();

    @Mock
    private WidgetService widgetService;

    @Mock
    private ChartWidgetConverter chartWidgetConverter;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        ChartController controller = new ChartController(widgetService, chartWidgetConverter);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
            .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setControllerAdvice(new CommonControllerAdvice())
                .build();
    }

    @Nested
    @DisplayName("GET endpoints")
    class GetEndpoints {

        @Test
        @DisplayName("GET /chart returns summary list")
        void shouldReturnSummaries() throws Exception {
            ChartWidget widget = sampleWidget(WIDGET_ID);
            ChartWidgetSummaryDto summary = new ChartWidgetSummaryDto();
            summary.setId(WIDGET_ID.toString());
            summary.setName("Cash Flow");
            summary.setWidgetType("CHART");
            summary.setChartType("LINE");
            summary.setPinned(true);

            when(widgetService.findAllByUserId(USER_ID, true)).thenReturn(List.of(widget));
            when(chartWidgetConverter.toSummaryDto(widget)).thenReturn(summary);

            mockMvc.perform(get("/chart")
                            .requestAttr("userId", USER_ID)
                            .param("pinned", "true"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].id", is(WIDGET_ID.toString())))
                    .andExpect(jsonPath("$[0].name", is("Cash Flow")));
        }

        @Test
        @DisplayName("GET /chart/paged returns page content")
        void shouldReturnPagedSummaries() throws Exception {
            ChartWidget widget = sampleWidget(WIDGET_ID);
            ChartWidgetSummaryDto summary = new ChartWidgetSummaryDto();
            summary.setId(WIDGET_ID.toString());
            summary.setName("Monthly KPI");

            when(widgetService.findPagedByUserId(eq(USER_ID), isNull(), any()))
                    .thenReturn(new PageImpl<>(List.of(widget), PageRequest.of(0, 20), 1));
            when(chartWidgetConverter.toSummaryDto(widget)).thenReturn(summary);

            mockMvc.perform(get("/chart/paged")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].id", is(WIDGET_ID.toString())));
        }

        @Test
        @DisplayName("GET /chart/{id} returns widget")
        void shouldReturnWidgetById() throws Exception {
            ChartWidget widget = sampleWidget(WIDGET_ID);
            ChartWidgetResponseDto response = new ChartWidgetResponseDto();
            response.setId(WIDGET_ID.toString());
            response.setName("Savings");

            when(widgetService.findByIdAndUserId(WIDGET_ID, USER_ID)).thenReturn(widget);
            when(chartWidgetConverter.toResponseDto(widget)).thenReturn(response);

            mockMvc.perform(get("/chart/{id}", WIDGET_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(WIDGET_ID.toString())))
                    .andExpect(jsonPath("$.name", is("Savings")));
        }

        @Test
        @DisplayName("GET /chart/{id} maps not found to 404")
        void shouldReturn404WhenWidgetNotFound() throws Exception {
            when(widgetService.findByIdAndUserId(WIDGET_ID, USER_ID))
                    .thenThrow(new InstanceNotFoundException("ChartWidget", WIDGET_ID));

            mockMvc.perform(get("/chart/{id}", WIDGET_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code", is("project.exceptions.InstanceNotFoundException")));
        }
    }

    @Nested
    @DisplayName("Create/Update endpoints")
    class MutatingEndpoints {

        @Test
        @DisplayName("POST /chart creates widget with blank importFilterId as null")
        void shouldCreateWidgetWithBlankImportFilterId() throws Exception {
            ChartWidget widget = sampleWidget(WIDGET_ID);
            ChartWidgetResponseDto response = new ChartWidgetResponseDto();
            response.setId(WIDGET_ID.toString());
            response.setName("Created");

            when(widgetService.createWidget(
                    eq(USER_ID), eq("Created"), eq(WidgetType.CHART), eq(WidgetChartType.BAR),
                    eq("{\"metric\":\"expenses\"}"), eq(true), eq(true), eq(3), eq("md"), isNull()))
                    .thenReturn(widget);
            when(chartWidgetConverter.toResponseDto(widget)).thenReturn(response);

            mockMvc.perform(post("/chart")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "name": "Created",
                                      "widgetType": "CHART",
                                      "chartType": "BAR",
                                      "configuration": "{\\\"metric\\\":\\\"expenses\\\"}",
                                      "pinned": true,
                                      "visible": true,
                                      "displayOrder": 3,
                                      "layoutSize": "md",
                                      "importFilterId": "   "
                                    }
                                    """))
                    .andExpect(status().isCreated())
                    .andExpect(header().exists("Location"))
                    .andExpect(jsonPath("$.id", is(WIDGET_ID.toString())));
        }

        @Test
        @DisplayName("POST /chart returns 400 when importFilterId is malformed")
        void shouldReturn400WhenCreateImportFilterIdMalformed() throws Exception {
            mockMvc.perform(post("/chart")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "name": "Created",
                                      "widgetType": "CHART",
                                      "chartType": "BAR",
                                      "configuration": "{}",
                                      "importFilterId": "not-a-uuid"
                                    }
                                    """))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code", is("project.exceptions.IllegalArgumentException")));
        }

        @Test
        @DisplayName("PUT /chart/{id} updates widget")
        void shouldUpdateWidget() throws Exception {
            ChartWidget widget = sampleWidget(WIDGET_ID);
            ChartWidgetResponseDto response = new ChartWidgetResponseDto();
            response.setId(WIDGET_ID.toString());
            response.setName("Updated");

            when(widgetService.modifyWidget(
                    eq(USER_ID), eq(WIDGET_ID), eq("Updated"), eq(WidgetType.KPI), eq(WidgetChartType.KPI_CARD),
                    eq("{}"), eq(false), eq(true), eq(5), eq("lg"), isNull()))
                    .thenReturn(widget);
            when(chartWidgetConverter.toResponseDto(widget)).thenReturn(response);

            mockMvc.perform(put("/chart/{id}", WIDGET_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "name": "Updated",
                                      "widgetType": "KPI",
                                      "chartType": "KPI_CARD",
                                      "configuration": "{}",
                                      "pinned": false,
                                      "visible": true,
                                      "displayOrder": 5,
                                      "layoutSize": "lg",
                                      "importFilterId": ""
                                    }
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(WIDGET_ID.toString())));
        }

        @Test
        @DisplayName("DELETE /chart/{id} returns 204")
        void shouldDeleteWidget() throws Exception {
            doNothing().when(widgetService).deleteWidget(USER_ID, WIDGET_ID);

            mockMvc.perform(delete("/chart/{id}", WIDGET_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNoContent());
        }
    }

    @Nested
    @DisplayName("Preview and sync endpoints")
    class PreviewAndSyncEndpoints {

        @Test
        @DisplayName("POST /chart/{id}/preview returns preview from saved widget")
        void shouldPreviewSavedWidget() throws Exception {
            ChartWidget widget = sampleWidget(WIDGET_ID);
            ObjectNode data = objectMapper.createObjectNode().put("total", 42);

            ChartWidgetPreviewResponseDto preview = new ChartWidgetPreviewResponseDto();
            preview.setWidgetType("CHART");
            preview.setChartType("LINE");
            preview.setData(data);

            when(widgetService.findByIdAndUserId(WIDGET_ID, USER_ID)).thenReturn(widget);
            when(widgetService.preview(USER_ID, WIDGET_ID)).thenReturn(data);
            when(chartWidgetConverter.toPreviewDto(any(), any(), any())).thenReturn(preview);

            mockMvc.perform(post("/chart/{id}/preview", WIDGET_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.widgetType", is("CHART")))
                    .andExpect(jsonPath("$.chartType", is("LINE")));
        }

        @Test
        @DisplayName("POST /chart/preview returns 400 when importFilterId is malformed")
        void shouldReturn400WhenPreviewImportFilterIdMalformed() throws Exception {
            mockMvc.perform(post("/chart/preview")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "widgetType": "CHART",
                                      "chartType": "LINE",
                                      "configuration": "{}",
                                      "importFilterId": "bad-uuid"
                                    }
                                    """))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code", is("project.exceptions.IllegalArgumentException")));
        }

        @Test
        @DisplayName("POST /chart/sync returns 204 and triggers cache refresh")
        void shouldSyncPreviewCache() throws Exception {
            doNothing().when(widgetService).recalculatePreviewCache();

            mockMvc.perform(post("/chart/sync")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNoContent());

            verify(widgetService).recalculatePreviewCache();
        }
    }

    private static ChartWidget sampleWidget(UUID id) {
        User user = new User("Test", "test@example.com", "pwd");
        ChartWidget widget = new ChartWidget(
                "Widget", WidgetType.CHART, WidgetChartType.LINE,
                "{}", true, true, 1, "md", user);
        setFieldViaReflection(widget, "id", id);
        return widget;
    }

    private static void setFieldViaReflection(Object target, String fieldName, Object value) {
        try {
            java.lang.reflect.Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException("Cannot set field " + fieldName, e);
        }
    }
}
