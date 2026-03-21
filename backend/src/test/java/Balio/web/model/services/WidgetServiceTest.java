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
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link WidgetServiceImpl}.
 * Validates CRUD, preview, type-compatibility checks, and cache eviction flows.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("WidgetService")
class WidgetServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID WIDGET_ID = UUID.randomUUID();
    private static final UUID FILTER_ID = UUID.randomUUID();
    private static final String VALID_CONFIG = "{\"filter\":{}}";

    @Mock private UserDao userDao;
    @Mock private FilterDao filterDao;
    @Mock private ChartWidgetDao chartWidgetDao;
    @Mock private WidgetResolverRegistry resolverRegistry;

    private WidgetServiceImpl widgetService;
    private User user;

    @BeforeEach
    void setUp() {
        widgetService = new WidgetServiceImpl(
                userDao, filterDao, chartWidgetDao, resolverRegistry, new ObjectMapper());
        user = new User("Ana", "ana@test.com", "pwd");
        setFieldViaReflection(user, "id", USER_ID);
    }

    /* ════════════════════════════════════════════════════════════
     *  createWidget
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("createWidget")
    class CreateWidgetTests {

        @Test
        @DisplayName("creates a KPI widget successfully")
        void shouldCreateKpiWidget() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(chartWidgetDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ChartWidget result = widgetService.createWidget(
                    USER_ID, "My KPI", WidgetType.KPI, WidgetChartType.KPI_CARD,
                    VALID_CONFIG, false, true, 0, "md", null);

            assertNotNull(result);
            assertEquals("My KPI", result.getName());
            assertEquals(WidgetType.KPI, result.getWidgetType());
            verify(chartWidgetDao).save(any());
        }

        @Test
        @DisplayName("creates a CHART/BAR widget successfully")
        void shouldCreateChartBarWidget() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(chartWidgetDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ChartWidget result = widgetService.createWidget(
                    USER_ID, "Revenue", WidgetType.CHART, WidgetChartType.BAR,
                    VALID_CONFIG, null, null, null, "lg", null);

            assertNotNull(result);
            assertEquals("LG", result.getLayoutSize());
        }

        @Test
        @DisplayName("creates a TABLE widget successfully")
        void shouldCreateTableWidget() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(chartWidgetDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ChartWidget result = widgetService.createWidget(
                    USER_ID, "Summary", WidgetType.TABLE, WidgetChartType.SUMMARY_TABLE,
                    VALID_CONFIG, false, true, 0, null, null);

            assertNotNull(result);
        }

        @Test
        @DisplayName("throws UserNotFoundException when user does not exist")
        void shouldThrow_whenUserNotFound() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.empty());

            assertThrows(UserNotFoundException.class, () ->
                    widgetService.createWidget(USER_ID, "W", WidgetType.KPI, WidgetChartType.KPI_CARD,
                            VALID_CONFIG, false, true, 0, null, null));
            verify(chartWidgetDao, never()).save(any());
        }

        @Test
        @DisplayName("throws ChartWidgetInvalidException when name is blank")
        void shouldThrow_whenNameBlank() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            assertThrows(ChartWidgetInvalidException.class, () ->
                    widgetService.createWidget(USER_ID, "   ", WidgetType.KPI, WidgetChartType.KPI_CARD,
                            VALID_CONFIG, false, true, 0, null, null));
        }

        @Test
        @DisplayName("throws ChartWidgetInvalidException when name exceeds 100 characters")
        void shouldThrow_whenNameTooLong() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            String longName = "A".repeat(101);

            assertThrows(ChartWidgetInvalidException.class, () ->
                    widgetService.createWidget(USER_ID, longName, WidgetType.KPI, WidgetChartType.KPI_CARD,
                            VALID_CONFIG, false, true, 0, null, null));
        }

        @Test
        @DisplayName("throws ChartWidgetInvalidException for KPI + BAR incompatibility")
        void shouldThrow_whenKpiWithBar() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            assertThrows(ChartWidgetInvalidException.class, () ->
                    widgetService.createWidget(USER_ID, "W", WidgetType.KPI, WidgetChartType.BAR,
                            VALID_CONFIG, false, true, 0, null, null));
        }

        @Test
        @DisplayName("throws ChartWidgetInvalidException for TABLE + LINE incompatibility")
        void shouldThrow_whenTableWithLine() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            assertThrows(ChartWidgetInvalidException.class, () ->
                    widgetService.createWidget(USER_ID, "W", WidgetType.TABLE, WidgetChartType.LINE,
                            VALID_CONFIG, false, true, 0, null, null));
        }

        @Test
        @DisplayName("throws ChartWidgetInvalidException for CHART + KPI_CARD incompatibility")
        void shouldThrow_whenChartWithKpiCard() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            assertThrows(ChartWidgetInvalidException.class, () ->
                    widgetService.createWidget(USER_ID, "W", WidgetType.CHART, WidgetChartType.KPI_CARD,
                            VALID_CONFIG, false, true, 0, null, null));
        }

        @Test
        @DisplayName("throws ChartWidgetInvalidException for CHART + SUMMARY_TABLE incompatibility")
        void shouldThrow_whenChartWithSummaryTable() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            assertThrows(ChartWidgetInvalidException.class, () ->
                    widgetService.createWidget(USER_ID, "W", WidgetType.CHART, WidgetChartType.SUMMARY_TABLE,
                            VALID_CONFIG, false, true, 0, null, null));
        }

        @Test
        @DisplayName("throws ChartWidgetInvalidException for invalid JSON configuration")
        void shouldThrow_whenConfigInvalidJson() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            assertThrows(ChartWidgetInvalidException.class, () ->
                    widgetService.createWidget(USER_ID, "W", WidgetType.KPI, WidgetChartType.KPI_CARD,
                            "not-json-at-all", false, true, 0, null, null));
        }

        @Test
        @DisplayName("throws ChartWidgetInvalidException when configuration is a JSON array, not object")
        void shouldThrow_whenConfigIsArray() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            assertThrows(ChartWidgetInvalidException.class, () ->
                    widgetService.createWidget(USER_ID, "W", WidgetType.KPI, WidgetChartType.KPI_CARD,
                            "[1,2,3]", false, true, 0, null, null));
        }

        @Test
        @DisplayName("imports filter definition when importFilterId is present")
        void shouldImportFilter_whenProvided() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            Filter filter = mock(Filter.class);
            when(filter.getDefinition()).thenReturn("{\"type\":\"EXPENSE\"}");
            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(filter));
            when(chartWidgetDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ChartWidget result = widgetService.createWidget(
                    USER_ID, "W", WidgetType.KPI, WidgetChartType.KPI_CARD,
                    VALID_CONFIG, false, true, 0, null, FILTER_ID);

            assertNotNull(result);
            verify(filterDao).findByIdAndUserId(FILTER_ID, USER_ID);
        }

        @Test
        @DisplayName("throws ChartWidgetInvalidException when importFilterId not found")
        void shouldThrow_whenImportFilterNotFound() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(ChartWidgetInvalidException.class, () ->
                    widgetService.createWidget(USER_ID, "W", WidgetType.KPI, WidgetChartType.KPI_CARD,
                            VALID_CONFIG, false, true, 0, null, FILTER_ID));
        }

        @Test
        @DisplayName("normalizes layoutSize to uppercase")
        void shouldNormalizeLayoutSizeToUppercase() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(chartWidgetDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ChartWidget result = widgetService.createWidget(
                    USER_ID, "W", WidgetType.KPI, WidgetChartType.KPI_CARD,
                    VALID_CONFIG, false, true, 0, "sm", null);

            assertEquals("SM", result.getLayoutSize());
        }

        @Test
        @DisplayName("pinned defaults to false when null")
        void shouldDefaultPinnedToFalse_whenNull() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(chartWidgetDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ChartWidget result = widgetService.createWidget(
                    USER_ID, "W", WidgetType.KPI, WidgetChartType.KPI_CARD,
                    VALID_CONFIG, null, true, 0, null, null);

            assertFalse(result.isPinned());
        }

        @Test
        @DisplayName("visible defaults to true when null")
        void shouldDefaultVisibleToTrue_whenNull() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(chartWidgetDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ChartWidget result = widgetService.createWidget(
                    USER_ID, "W", WidgetType.KPI, WidgetChartType.KPI_CARD,
                    VALID_CONFIG, false, null, 0, null, null);

            assertTrue(result.isVisible());
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  modifyWidget
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("modifyWidget")
    class ModifyWidgetTests {

        private ChartWidget existing;

        @BeforeEach
        void setup() {
            existing = new ChartWidget(
                    "Old Name", WidgetType.KPI, WidgetChartType.KPI_CARD,
                    VALID_CONFIG, false, true, 0, "MD", user);
            setFieldViaReflection(existing, "id", WIDGET_ID);
        }

        @Test
        @DisplayName("updates name when provided")
        void shouldUpdateName() throws InstanceNotFoundException {
            when(chartWidgetDao.findByIdAndUserId(WIDGET_ID, USER_ID)).thenReturn(Optional.of(existing));
            when(chartWidgetDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ChartWidget result = widgetService.modifyWidget(
                    USER_ID, WIDGET_ID, "New Name", null, null, null, null, null, null, null, null);

            assertEquals("New Name", result.getName());
        }

        @Test
        @DisplayName("throws InstanceNotFoundException when widget not found")
        void shouldThrow_whenWidgetNotFound() {
            when(chartWidgetDao.findByIdAndUserId(WIDGET_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class, () ->
                    widgetService.modifyWidget(
                            USER_ID, WIDGET_ID, "Name", null, null, null, null, null, null, null, null));
        }

        @Test
        @DisplayName("throws ChartWidgetInvalidException when new type combination is incompatible")
        void shouldThrow_whenIncompatibleTypeOnModify() {
            when(chartWidgetDao.findByIdAndUserId(WIDGET_ID, USER_ID)).thenReturn(Optional.of(existing));

            // Existing KPI + updated to BAR → incompatible
            assertThrows(ChartWidgetInvalidException.class, () ->
                    widgetService.modifyWidget(
                            USER_ID, WIDGET_ID, null, null, WidgetChartType.BAR, null, null, null, null, null, null));
        }

        @Test
        @DisplayName("updates layoutSize and normalizes to uppercase")
        void shouldNormalizeLayoutSizeOnModify() throws InstanceNotFoundException {
            when(chartWidgetDao.findByIdAndUserId(WIDGET_ID, USER_ID)).thenReturn(Optional.of(existing));
            when(chartWidgetDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ChartWidget result = widgetService.modifyWidget(
                    USER_ID, WIDGET_ID, null, null, null, null, null, null, null, "lg", null);

            assertEquals("LG", result.getLayoutSize());
        }

        @Test
        @DisplayName("does not touch configuration when both configuration and importFilterId are null")
        void shouldNotTouchConfig_whenBothNull() throws InstanceNotFoundException {
            when(chartWidgetDao.findByIdAndUserId(WIDGET_ID, USER_ID)).thenReturn(Optional.of(existing));
            when(chartWidgetDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ChartWidget result = widgetService.modifyWidget(
                    USER_ID, WIDGET_ID, null, null, null, null, null, null, null, null, null);

            assertEquals(VALID_CONFIG, result.getConfiguration());
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  deleteWidget
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("deleteWidget")
    class DeleteWidgetTests {

        @Test
        @DisplayName("deletes widget when it exists")
        void shouldDeleteWidget() throws InstanceNotFoundException {
            ChartWidget widget = new ChartWidget(
                    "W", WidgetType.KPI, WidgetChartType.KPI_CARD, VALID_CONFIG, false, true, 0, null, user);
            when(chartWidgetDao.findByIdAndUserId(WIDGET_ID, USER_ID)).thenReturn(Optional.of(widget));

            widgetService.deleteWidget(USER_ID, WIDGET_ID);

            verify(chartWidgetDao).delete(widget);
        }

        @Test
        @DisplayName("throws InstanceNotFoundException when widget not found")
        void shouldThrow_whenWidgetNotFound() {
            when(chartWidgetDao.findByIdAndUserId(WIDGET_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class, () ->
                    widgetService.deleteWidget(USER_ID, WIDGET_ID));
            verify(chartWidgetDao, never()).delete(any());
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  findByIdAndUserId
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("findByIdAndUserId")
    class FindByIdTests {

        @Test
        @DisplayName("returns widget when found")
        void shouldReturn_whenFound() throws InstanceNotFoundException {
            ChartWidget widget = new ChartWidget(
                    "W", WidgetType.KPI, WidgetChartType.KPI_CARD, VALID_CONFIG, false, true, 0, null, user);
            when(chartWidgetDao.findByIdAndUserId(WIDGET_ID, USER_ID)).thenReturn(Optional.of(widget));

            ChartWidget result = widgetService.findByIdAndUserId(WIDGET_ID, USER_ID);

            assertEquals(widget, result);
        }

        @Test
        @DisplayName("throws InstanceNotFoundException when not found")
        void shouldThrow_whenNotFound() {
            when(chartWidgetDao.findByIdAndUserId(WIDGET_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class, () ->
                    widgetService.findByIdAndUserId(WIDGET_ID, USER_ID));
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  findAllByUserId / findPagedByUserId
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("findAllByUserId")
    class FindAllTests {

        private ChartWidget w1, w2;

        @BeforeEach
        void setup() {
            w1 = new ChartWidget("W1", WidgetType.KPI, WidgetChartType.KPI_CARD, VALID_CONFIG, true, true, 0, null, user);
            w2 = new ChartWidget("W2", WidgetType.CHART, WidgetChartType.BAR, VALID_CONFIG, false, true, 1, null, user);
        }

        @Test
        @DisplayName("returns all widgets when pinned filter is null")
        void shouldReturnAll_whenPinnedNull() {
            when(chartWidgetDao.findAllByUserIdOrderByDisplayOrderAscNameAsc(USER_ID))
                    .thenReturn(List.of(w1, w2));

            List<ChartWidget> result = widgetService.findAllByUserId(USER_ID, null);

            assertEquals(2, result.size());
        }

        @Test
        @DisplayName("returns only pinned widgets when pinned=true")
        void shouldReturnOnlyPinned_whenPinnedTrue() {
            when(chartWidgetDao.findAllByUserIdAndPinnedOrderByDisplayOrderAscNameAsc(USER_ID, true))
                    .thenReturn(List.of(w1));

            List<ChartWidget> result = widgetService.findAllByUserId(USER_ID, true);

            assertEquals(1, result.size());
            assertEquals("W1", result.get(0).getName());
        }

        @Test
        @DisplayName("returns only unpinned widgets when pinned=false")
        void shouldReturnOnlyUnpinned_whenPinnedFalse() {
            when(chartWidgetDao.findAllByUserIdAndPinnedOrderByDisplayOrderAscNameAsc(USER_ID, false))
                    .thenReturn(List.of(w2));

            List<ChartWidget> result = widgetService.findAllByUserId(USER_ID, false);

            assertEquals(1, result.size());
            assertEquals("W2", result.get(0).getName());
        }

        @Test
        @DisplayName("returns paged result when pinned filter is null")
        void shouldReturnPaged_whenPinnedNull() {
            Page<ChartWidget> page = new PageImpl<>(List.of(w1, w2));
            when(chartWidgetDao.findAllByUserIdOrderByDisplayOrderAscNameAsc(USER_ID, Pageable.unpaged()))
                    .thenReturn(page);

            Page<ChartWidget> result = widgetService.findPagedByUserId(USER_ID, null, Pageable.unpaged());

            assertEquals(2, result.getTotalElements());
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  preview / previewConfiguration
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("preview")
    class PreviewTests {

        @Test
        @DisplayName("resolves preview for saved widget")
        void shouldResolvePreview() throws InstanceNotFoundException {
            ChartWidget widget = new ChartWidget(
                    "W", WidgetType.KPI, WidgetChartType.KPI_CARD, VALID_CONFIG, false, true, 0, null, user);
            when(chartWidgetDao.findByIdAndUserId(WIDGET_ID, USER_ID)).thenReturn(Optional.of(widget));
            WidgetDataResolver resolver = mock(WidgetDataResolver.class);
            when(resolverRegistry.get(WidgetType.KPI)).thenReturn(resolver);
            when(resolver.resolve(any(), any(), any())).thenReturn(new ObjectMapper().createObjectNode());

            JsonNode result = widgetService.preview(USER_ID, WIDGET_ID);

            assertNotNull(result);
            verify(resolverRegistry).get(WidgetType.KPI);
        }

        @Test
        @DisplayName("throws InstanceNotFoundException when widget not found for preview")
        void shouldThrow_whenWidgetNotFoundForPreview() {
            when(chartWidgetDao.findByIdAndUserId(WIDGET_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class, () ->
                    widgetService.preview(USER_ID, WIDGET_ID));
        }
    }

    @Nested
    @DisplayName("previewConfiguration")
    class PreviewConfigTests {

        @Test
        @DisplayName("resolves preview for arbitrary configuration")
        void shouldResolveFromConfig() {
            WidgetDataResolver resolver = mock(WidgetDataResolver.class);
            when(resolverRegistry.get(WidgetType.KPI)).thenReturn(resolver);
            when(resolver.resolve(any(), any(), any())).thenReturn(new ObjectMapper().createObjectNode());

            JsonNode result = widgetService.previewConfiguration(
                    USER_ID, WidgetType.KPI, WidgetChartType.KPI_CARD, VALID_CONFIG, null);

            assertNotNull(result);
        }

        @Test
        @DisplayName("throws ChartWidgetInvalidException for incompatible type in preview")
        void shouldThrow_whenIncompatibleTypeInPreview() {
            assertThrows(ChartWidgetInvalidException.class, () ->
                    widgetService.previewConfiguration(
                            USER_ID, WidgetType.KPI, WidgetChartType.BAR, VALID_CONFIG, null));
        }

        @Test
        @DisplayName("throws ChartWidgetInvalidException for null widgetType")
        void shouldThrow_whenWidgetTypeNull() {
            assertThrows(ChartWidgetInvalidException.class, () ->
                    widgetService.previewConfiguration(
                            USER_ID, null, WidgetChartType.KPI_CARD, VALID_CONFIG, null));
        }
    }

    /* ─── helpers ─────────────────────────────────────────────── */

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
