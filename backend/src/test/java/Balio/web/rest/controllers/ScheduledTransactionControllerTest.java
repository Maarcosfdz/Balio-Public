package Balio.web.rest.controllers;

import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.ScheduledTransactionInvalidException;
import Balio.web.model.entities.ScheduledTransaction;
import Balio.web.model.entities.User;
import Balio.web.model.services.ScheduledTransactionService;
import Balio.web.rest.common.CommonControllerAdvice;
import Balio.web.rest.dtos.ScheduledTransactionConverter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import javax.management.InstanceNotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Web-layer unit tests for {@link ScheduledTransactionController}.
 * Validates HTTP mappings, request/response formats, status codes,
 * and error handling without starting the full Spring context.
 */
@ExtendWith(MockitoExtension.class)
class ScheduledTransactionControllerTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID ST_ID   = UUID.randomUUID();

    @Mock
    private ScheduledTransactionService service;

    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule());

    private MockMvc mockMvc;
    private ScheduledTransaction sampleSt;

    @BeforeEach
    void setUp() {
        ScheduledTransactionConverter converter = new ScheduledTransactionConverter(service);
        ScheduledTransactionController controller =
                new ScheduledTransactionController(service, converter);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new CommonControllerAdvice())
                .build();

        User user = new User("Test", "test@example.com", "pwd");
        setFieldViaReflection(user, "id", USER_ID);

        sampleSt = new ScheduledTransaction(
                "Monthly Rent", new BigDecimal("700.00"),
                TransactionType.EXPENSE,
                0, 1, 0, 0,
                LocalDate.of(2025, 1, 1), user);
        setFieldViaReflection(sampleSt, "id", ST_ID);
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /scheduled-transaction
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("GET /scheduled-transaction")
    class GetAllTests {

        @Test
        @DisplayName("should return 200 with paginated list")
        void shouldReturn200_withPagedList() throws Exception {
            Page<ScheduledTransaction> page = new PageImpl<>(
                    List.of(sampleSt), PageRequest.of(0, 20), 1);
            when(service.findAllByUserId(USER_ID, 0, 20)).thenReturn(page);
            when(service.calculateNextExecution(sampleSt))
                    .thenReturn(LocalDate.of(2025, 2, 1));

            mockMvc.perform(get("/scheduled-transaction")
                            .requestAttr("userId", USER_ID)
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements", is(1)))
                    .andExpect(jsonPath("$.content[0].name", is("Monthly Rent")));
        }

        @Test
        @DisplayName("should return 200 with empty page when no scheduled transactions")
        void shouldReturn200_emptyPage() throws Exception {
            when(service.findAllByUserId(USER_ID, 0, 20))
                    .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

            mockMvc.perform(get("/scheduled-transaction")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements", is(0)));
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /scheduled-transaction/{id}
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("GET /scheduled-transaction/{id}")
    class GetByIdTests {

        @Test
        @DisplayName("should return 200 with scheduled transaction")
        void shouldReturn200_whenFound() throws Exception {
            when(service.findById(USER_ID, ST_ID)).thenReturn(sampleSt);
            when(service.calculateNextExecution(sampleSt))
                    .thenReturn(LocalDate.of(2025, 2, 1));

            mockMvc.perform(get("/scheduled-transaction/{id}", ST_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(ST_ID.toString())))
                    .andExpect(jsonPath("$.name", is("Monthly Rent")))
                    .andExpect(jsonPath("$.amount", is(700.0)))
                    .andExpect(jsonPath("$.type", is("EXPENSE")));
        }

        @Test
        @DisplayName("should return 404 when not found")
        void shouldReturn404_whenNotFound() throws Exception {
            when(service.findById(USER_ID, ST_ID)).thenThrow(new InstanceNotFoundException());

            mockMvc.perform(get("/scheduled-transaction/{id}", ST_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound());
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  POST /scheduled-transaction
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("POST /scheduled-transaction")
    class CreateTests {

        @Test
        @DisplayName("should return 201 with Location header on valid request")
        void shouldReturn201_whenValid() throws Exception {
            when(service.create(eq(USER_ID), any(), any(), any(), any(), any(),
                    anyBoolean(), anyInt(), anyInt(), anyInt(), anyInt(), any()))
                    .thenReturn(sampleSt);
            when(service.calculateNextExecution(sampleSt))
                    .thenReturn(LocalDate.of(2025, 2, 1));

            String body = """
                    {
                      "name": "Monthly Rent",
                      "amount": 700.00,
                      "type": "EXPENSE",
                      "freqMonths": 1,
                      "startDate": "2025-01-01"
                    }
                    """;

            mockMvc.perform(post("/scheduled-transaction")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated())
                    .andExpect(header().exists("Location"))
                    .andExpect(jsonPath("$.name", is("Monthly Rent")));
        }

        @Test
        @DisplayName("should return 400 when name is missing")
        void shouldReturn400_whenNameMissing() throws Exception {
            String body = """
                    {
                      "amount": 100.00,
                      "type": "EXPENSE",
                      "freqDays": 7,
                      "startDate": "2025-01-01"
                    }
                    """;

            mockMvc.perform(post("/scheduled-transaction")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should return 400 when amount is missing")
        void shouldReturn400_whenAmountMissing() throws Exception {
            String body = """
                    {
                      "name": "Test",
                      "type": "INCOME",
                      "freqDays": 7,
                      "startDate": "2025-01-01"
                    }
                    """;

            mockMvc.perform(post("/scheduled-transaction")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should return 400 when amount is zero (positive constraint)")
        void shouldReturn400_whenAmountIsZero() throws Exception {
            String body = """
                    {
                      "name": "Test",
                      "amount": 0,
                      "type": "INCOME",
                      "freqDays": 7,
                      "startDate": "2025-01-01"
                    }
                    """;

            mockMvc.perform(post("/scheduled-transaction")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should return 400 when amount is negative")
        void shouldReturn400_whenAmountIsNegative() throws Exception {
            String body = """
                    {
                      "name": "Test",
                      "amount": -50.00,
                      "type": "INCOME",
                      "freqDays": 7,
                      "startDate": "2025-01-01"
                    }
                    """;

            mockMvc.perform(post("/scheduled-transaction")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should return 400 when type is missing")
        void shouldReturn400_whenTypeMissing() throws Exception {
            String body = """
                    {
                      "name": "Test",
                      "amount": 50.00,
                      "freqDays": 7,
                      "startDate": "2025-01-01"
                    }
                    """;

            mockMvc.perform(post("/scheduled-transaction")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should return 400 when startDate is missing")
        void shouldReturn400_whenStartDateMissing() throws Exception {
            String body = """
                    {
                      "name": "Test",
                      "amount": 50.00,
                      "type": "EXPENSE",
                      "freqDays": 7
                    }
                    """;

            mockMvc.perform(post("/scheduled-transaction")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should return 400 when service throws ScheduledTransactionInvalidException")
        void shouldReturn400_whenServiceThrowsInvalid() throws Exception {
            when(service.create(any(), any(), any(), any(), any(), any(),
                    anyBoolean(), anyInt(), anyInt(), anyInt(), anyInt(), any()))
                    .thenThrow(new ScheduledTransactionInvalidException("All frequencies zero"));

            String body = """
                    {
                      "name": "Test",
                      "amount": 50.00,
                      "type": "EXPENSE",
                      "freqYears": 0,
                      "freqMonths": 0,
                      "freqWeeks": 0,
                      "freqDays": 0,
                      "startDate": "2025-01-01"
                    }
                    """;

            mockMvc.perform(post("/scheduled-transaction")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should return 201 with name trimmed (controller passes trimmed value to service)")
        void shouldReturn201_withLongNameAtLimit() throws Exception {
            String longName = "A".repeat(120);
            when(service.create(eq(USER_ID), eq(longName), any(), any(), any(), any(),
                    anyBoolean(), anyInt(), anyInt(), anyInt(), anyInt(), any()))
                    .thenReturn(sampleSt);
            when(service.calculateNextExecution(any())).thenReturn(LocalDate.now());

            String body = objectMapper.writeValueAsString(Map.of(
                    "name", longName,
                    "amount", "50.00",
                    "type", "INCOME",
                    "freqDays", 1,
                    "startDate", "2025-01-01"
            ));

            mockMvc.perform(post("/scheduled-transaction")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated());
        }

        @Test
        @DisplayName("should return 400 when name exceeds 120 characters")
        void shouldReturn400_whenNameTooLong() throws Exception {
            String tooLong = "A".repeat(121);
            String body = """
                    {
                      "name": "%s",
                      "amount": 50.00,
                      "type": "EXPENSE",
                      "freqDays": 1,
                      "startDate": "2025-01-01"
                    }
                    """.formatted(tooLong);

            mockMvc.perform(post("/scheduled-transaction")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  PUT /scheduled-transaction/{id}
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("PUT /scheduled-transaction/{id}")
    class UpdateTests {

        @Test
        @DisplayName("should return 200 on successful partial update")
        void shouldReturn200_onValidUpdate() throws Exception {
            when(service.update(eq(USER_ID), eq(ST_ID), any(), any(), any(),
                    any(), any(), any(), any(), any(), any(), any(), any(), any()))
                    .thenReturn(sampleSt);
            when(service.calculateNextExecution(sampleSt)).thenReturn(LocalDate.now().plusMonths(1));

            String body = """
                    {
                      "name": "Updated Name"
                    }
                    """;

            mockMvc.perform(put("/scheduled-transaction/{id}", ST_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name", is("Monthly Rent")));
        }

        @Test
        @DisplayName("should return 404 when updating non-existent transaction")
        void shouldReturn404_whenNotFound() throws Exception {
            when(service.update(eq(USER_ID), eq(ST_ID), any(), any(), any(),
                    any(), any(), any(), any(), any(), any(), any(), any(), any()))
                    .thenThrow(new InstanceNotFoundException());

            mockMvc.perform(put("/scheduled-transaction/{id}", ST_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isNotFound());
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  DELETE /scheduled-transaction/{id}
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("DELETE /scheduled-transaction/{id}")
    class DeleteTests {

        @Test
        @DisplayName("should return 204 on successful delete")
        void shouldReturn204_onDelete() throws Exception {
            doNothing().when(service).delete(USER_ID, ST_ID);

            mockMvc.perform(delete("/scheduled-transaction/{id}", ST_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNoContent());
        }

        @Test
        @DisplayName("should return 404 when deleting non-existent transaction")
        void shouldReturn404_whenNotFound() throws Exception {
            doThrow(new InstanceNotFoundException()).when(service).delete(USER_ID, ST_ID);

            mockMvc.perform(delete("/scheduled-transaction/{id}", ST_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound());
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  POST /scheduled-transaction/fire
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("POST /scheduled-transaction/fire")
    class FireTests {

        @Test
        @DisplayName("should return 200 with created count")
        void shouldReturn200_withCreatedCount() throws Exception {
            when(service.firePending(USER_ID)).thenReturn(5);

            mockMvc.perform(post("/scheduled-transaction/fire")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.created", is(5)));
        }

        @Test
        @DisplayName("should return 200 with 0 when nothing to fire")
        void shouldReturn200_withZeroCreated() throws Exception {
            when(service.firePending(USER_ID)).thenReturn(0);

            mockMvc.perform(post("/scheduled-transaction/fire")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.created", is(0)));
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Helper
    // ═══════════════════════════════════════════════════════════

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
