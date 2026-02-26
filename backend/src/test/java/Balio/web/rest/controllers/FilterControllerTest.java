package Balio.web.rest.controllers;

import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.FilterInvalidException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.Filter;
import Balio.web.model.entities.Transaction;
import Balio.web.model.entities.User;
import Balio.web.model.services.FilterService;
import Balio.web.rest.common.CommonControllerAdvice;
import Balio.web.rest.dtos.FilterConverter;
import Balio.web.rest.dtos.TransactionConverter;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class FilterControllerTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID FILTER_ID = UUID.randomUUID();
    private static final String VALID_NAME = "Monthly Expenses";
    private static final String VALID_DEFINITION = "{\"type\":\"EXPENSE\"}";

    @Mock private FilterService filterService;

    private final FilterConverter filterConverter = new FilterConverter();
    private final TransactionConverter transactionConverter = new TransactionConverter();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private MockMvc mockMvc;
    private User testUser;
    private Filter testFilter;

    @BeforeEach
    void setUp() {
        FilterController controller = new FilterController(filterService, filterConverter, transactionConverter);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new CommonControllerAdvice())
                .build();

        testUser = new User("Nick", "nick@example.com", "encodedPwd");
        setFieldViaReflection(testUser, "id", USER_ID);

        testFilter = new Filter(VALID_NAME, VALID_DEFINITION, testUser);
        setFieldViaReflection(testFilter, "id", FILTER_ID);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  GET /filter
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("GET /filter")
    class GetAllFilters {

        @Test
        @DisplayName("200 – returns list of filter summaries")
        void returnsList() throws Exception {
            Filter f2 = new Filter("Income Only", "{\"type\":\"INCOME\"}", testUser);
            setFieldViaReflection(f2, "id", UUID.randomUUID());

            when(filterService.findAllByUserId(USER_ID)).thenReturn(List.of(testFilter, f2));

            mockMvc.perform(get("/filter")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)))
                    .andExpect(jsonPath("$[0].name", is(VALID_NAME)));
        }

        @Test
        @DisplayName("200 – returns empty list when no filters")
        void returnsEmptyList() throws Exception {
            when(filterService.findAllByUserId(USER_ID)).thenReturn(List.of());

            mockMvc.perform(get("/filter")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  GET /filter/{filterId}
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("GET /filter/{filterId}")
    class GetFilterById {

        @Test
        @DisplayName("200 – returns filter detail with definition")
        void returnsFilter() throws Exception {
            when(filterService.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(testFilter);

            mockMvc.perform(get("/filter/{filterId}", FILTER_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(FILTER_ID.toString())))
                    .andExpect(jsonPath("$.name", is(VALID_NAME)))
                    .andExpect(jsonPath("$.definition", is(VALID_DEFINITION)));
        }

        @Test
        @DisplayName("404 – filter not found")
        void notFound() throws Exception {
            when(filterService.findByIdAndUserId(FILTER_ID, USER_ID))
                    .thenThrow(new InstanceNotFoundException("Filter", FILTER_ID));

            mockMvc.perform(get("/filter/{filterId}", FILTER_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound());
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  POST /filter
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("POST /filter")
    class CreateFilterEndpoint {

        @Test
        @DisplayName("201 – creates filter with valid data")
        void createsFilter() throws Exception {
            when(filterService.createFilter(eq(USER_ID), eq(VALID_NAME), any()))
                    .thenReturn(testFilter);

            mockMvc.perform(post("/filter")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(filterJson(VALID_NAME, VALID_DEFINITION)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id", is(FILTER_ID.toString())))
                    .andExpect(jsonPath("$.name", is(VALID_NAME)));
        }

        @Test
        @DisplayName("400 – validation: name blank")
        void nameBlank() throws Exception {
            mockMvc.perform(post("/filter")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(filterJson("", VALID_DEFINITION)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – validation: definition blank")
        void definitionBlank() throws Exception {
            mockMvc.perform(post("/filter")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(filterJson(VALID_NAME, "")))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – service throws FilterInvalidException (invalid JSON)")
        void serviceThrowsInvalid() throws Exception {
            when(filterService.createFilter(eq(USER_ID), any(), any()))
                    .thenThrow(new FilterInvalidException("Filter definition is not valid JSON"));

            mockMvc.perform(post("/filter")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(filterJson(VALID_NAME, "some-value")))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message", is("Filter definition is not valid JSON")));
        }

        @Test
        @DisplayName("400 – validation: name too long")
        void nameTooLong() throws Exception {
            String longName = "A".repeat(81);

            mockMvc.perform(post("/filter")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(filterJson(longName, VALID_DEFINITION)))
                    .andExpect(status().isBadRequest());
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  PUT /filter/{filterId}
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("PUT /filter/{filterId}")
    class UpdateFilterEndpoint {

        @Test
        @DisplayName("200 – updates filter name")
        void updatesName() throws Exception {
            Filter updated = new Filter("Renamed", VALID_DEFINITION, testUser);
            setFieldViaReflection(updated, "id", FILTER_ID);

            when(filterService.modifyFilter(USER_ID, FILTER_ID, "Renamed", null))
                    .thenReturn(updated);

            mockMvc.perform(put("/filter/{filterId}", FILTER_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\":\"Renamed\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name", is("Renamed")));
        }

        @Test
        @DisplayName("200 – updates filter definition")
        void updatesDefinition() throws Exception {
            String newDef = "{\"type\":\"INCOME\"}";
            Filter updated = new Filter(VALID_NAME, newDef, testUser);
            setFieldViaReflection(updated, "id", FILTER_ID);

            when(filterService.modifyFilter(USER_ID, FILTER_ID, null, newDef))
                    .thenReturn(updated);

            mockMvc.perform(put("/filter/{filterId}", FILTER_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"definition\":\"" + newDef.replace("\"", "\\\"") + "\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.definition", is(newDef)));
        }

        @Test
        @DisplayName("404 – filter not found")
        void notFound() throws Exception {
            when(filterService.modifyFilter(eq(USER_ID), eq(FILTER_ID), any(), any()))
                    .thenThrow(new InstanceNotFoundException("Filter", FILTER_ID));

            mockMvc.perform(put("/filter/{filterId}", FILTER_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\":\"X\"}"))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("400 – name exceeds max length")
        void nameTooLong() throws Exception {
            String longName = "A".repeat(81);

            mockMvc.perform(put("/filter/{filterId}", FILTER_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\":\"" + longName + "\"}"))
                    .andExpect(status().isBadRequest());
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  DELETE /filter/{filterId}
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("DELETE /filter/{filterId}")
    class DeleteFilterEndpoint {

        @Test
        @DisplayName("204 – deletes filter successfully")
        void deletesFilter() throws Exception {
            doNothing().when(filterService).deleteFilter(USER_ID, FILTER_ID);

            mockMvc.perform(delete("/filter/{filterId}", FILTER_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNoContent());

            verify(filterService).deleteFilter(USER_ID, FILTER_ID);
        }

        @Test
        @DisplayName("404 – filter not found")
        void notFound() throws Exception {
            doThrow(new InstanceNotFoundException("Filter", FILTER_ID))
                    .when(filterService).deleteFilter(USER_ID, FILTER_ID);

            mockMvc.perform(delete("/filter/{filterId}", FILTER_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound());
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  POST /filter/{filterId}/apply
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("POST /filter/{filterId}/apply")
    class ApplyFilterEndpoint {

        @Test
        @DisplayName("200 – returns matching transaction summaries")
        void returnsTransactions() throws Exception {
            Transaction t1 = new Transaction("Grocery", new BigDecimal("50.00"),
                    LocalDate.of(2024, 3, 15), TransactionType.EXPENSE, testUser);
            setFieldViaReflection(t1, "id", UUID.randomUUID());

            Transaction t2 = new Transaction("Transport", new BigDecimal("20.00"),
                    LocalDate.of(2024, 3, 16), TransactionType.EXPENSE, testUser);
            setFieldViaReflection(t2, "id", UUID.randomUUID());

            when(filterService.applyFilter(USER_ID, FILTER_ID)).thenReturn(List.of(t1, t2));

            mockMvc.perform(post("/filter/{filterId}/apply", FILTER_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)))
                    .andExpect(jsonPath("$[0].name", is("Grocery")))
                    .andExpect(jsonPath("$[1].name", is("Transport")));
        }

        @Test
        @DisplayName("200 – returns empty list when no matches")
        void returnsEmptyList() throws Exception {
            when(filterService.applyFilter(USER_ID, FILTER_ID)).thenReturn(List.of());

            mockMvc.perform(post("/filter/{filterId}/apply", FILTER_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }

        @Test
        @DisplayName("404 – filter not found")
        void notFound() throws Exception {
            when(filterService.applyFilter(USER_ID, FILTER_ID))
                    .thenThrow(new InstanceNotFoundException("Filter", FILTER_ID));

            mockMvc.perform(post("/filter/{filterId}/apply", FILTER_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound());
        }
    }

    /* ───── helpers ───── */

    private String filterJson(String name, String definition) {
        // Escape the definition string for embedding in JSON
        String escapedDef = definition.replace("\\", "\\\\").replace("\"", "\\\"");
        return String.format("{\"name\":\"%s\",\"definition\":\"%s\"}", name, escapedDef);
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
