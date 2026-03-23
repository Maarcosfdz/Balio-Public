package Balio.web.rest.controllers;

import Balio.web.enums.BudgetPeriodicity;
import Balio.web.model.Exceptions.BudgetInvalidException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.Budget;
import Balio.web.model.entities.BudgetCategory;
import Balio.web.model.entities.User;
import Balio.web.model.services.BudgetService;
import Balio.web.rest.common.CommonControllerAdvice;
import Balio.web.rest.dtos.BudgetConverter;
import Balio.web.rest.dtos.BudgetResponseDto;
import Balio.web.rest.dtos.BudgetSummaryDto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

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

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * MockMvc tests for {@link BudgetController}.
 * Tests HTTP routing, validation, status codes, and error handling.
 */
@ExtendWith(MockitoExtension.class)
class BudgetControllerTest {

    private static final UUID USER_ID   = UUID.randomUUID();
    private static final UUID BUDGET_ID = UUID.randomUUID();
    private static final UUID BC_ID     = UUID.randomUUID();
    private static final UUID TX_ID     = UUID.randomUUID();

    @Mock private BudgetService   budgetService;
    @Mock private BudgetConverter budgetConverter;

    private MockMvc mockMvc;
    private ObjectMapper mapper;

    private User   user;
    private Budget budget;

    @BeforeEach
    void setUp() throws Exception {
        BudgetController controller = new BudgetController(budgetService, budgetConverter);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new CommonControllerAdvice())
                .build();

        mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());

        user = new User("testuser", "test@test.com", "pw");
        setId(user, USER_ID);

        budget = new Budget("Monthly Budget", BudgetPeriodicity.MONTHLY,
                LocalDate.of(2026, 1, 1), user);
        setId(budget, BUDGET_ID);
    }

    // ── GET /budget ──────────────────────────────────────────────────────

    @Nested
    @DisplayName("GET /budget")
    class GetAllBudgetsTests {

        @Test
        @DisplayName("200 — returns list of budget summaries")
        void returnsList() throws Exception {
            BudgetSummaryDto summary = new BudgetSummaryDto();
            summary.setId(BUDGET_ID.toString());
            summary.setName("Monthly Budget");
            summary.setPeriodicity(BudgetPeriodicity.MONTHLY);
            summary.setStartDate(LocalDate.of(2026, 1, 1));
            summary.setTotalBudget(new BigDecimal("500.00"));
            summary.setTotalSpent(BigDecimal.ZERO);
            summary.setTotalRemaining(new BigDecimal("500.00"));
            summary.setPeriodStart(LocalDate.of(2026, 3, 1));
            summary.setPeriodEnd(LocalDate.of(2026, 3, 31));

            when(budgetService.findAllByUserId(USER_ID)).thenReturn(List.of(budget));
            when(budgetConverter.toSummaryDto(budget)).thenReturn(summary);

            mockMvc.perform(get("/budget")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].name", is("Monthly Budget")))
                    .andExpect(jsonPath("$[0].periodicity", is("MONTHLY")));
        }

        @Test
        @DisplayName("200 — empty list when no budgets")
        void emptyList() throws Exception {
            when(budgetService.findAllByUserId(USER_ID)).thenReturn(List.of());

            mockMvc.perform(get("/budget")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }
    }

    // ── GET /budget/{budgetId} ───────────────────────────────────────────

    @Nested
    @DisplayName("GET /budget/{budgetId}")
    class GetBudgetByIdTests {

        @Test
        @DisplayName("200 — found returns budget response")
        void foundReturnsDto() throws Exception {
            BudgetResponseDto dto = buildResponseDto();
            when(budgetService.findByIdAndUserId(BUDGET_ID, USER_ID)).thenReturn(budget);
            when(budgetConverter.toResponseDto(budget)).thenReturn(dto);

            mockMvc.perform(get("/budget/{budgetId}", BUDGET_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(BUDGET_ID.toString())))
                    .andExpect(jsonPath("$.name", is("Monthly Budget")));
        }

        @Test
        @DisplayName("404 — budget not found")
        void notFound() throws Exception {
            when(budgetService.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenThrow(new InstanceNotFoundException("Budget", BUDGET_ID));

            mockMvc.perform(get("/budget/{budgetId}", BUDGET_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound());
        }
    }

    // ── POST /budget ─────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /budget")
    class CreateBudgetTests {

        @Test
        @DisplayName("201 — valid creation returns Location header")
        void validCreation() throws Exception {
            when(budgetService.createBudget(eq(USER_ID), eq("My Budget"),
                    eq(BudgetPeriodicity.MONTHLY), eq(LocalDate.of(2026, 1, 1))))
                    .thenReturn(budget);
            when(budgetConverter.toResponseDto(budget)).thenReturn(buildResponseDto());

            String body = """
                    {"name":"My Budget","periodicity":"MONTHLY","startDate":"2026-01-01"}
                    """;

            mockMvc.perform(post("/budget")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated())
                    .andExpect(header().exists("Location"))
                    .andExpect(jsonPath("$.name", is("Monthly Budget")));
        }

        @Test
        @DisplayName("400 — missing name")
        void missingName() throws Exception {
            String body = """
                    {"periodicity":"MONTHLY","startDate":"2026-01-01"}
                    """;

            mockMvc.perform(post("/budget")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 — blank name")
        void blankName() throws Exception {
            String body = """
                    {"name":"   ","periodicity":"MONTHLY","startDate":"2026-01-01"}
                    """;

            mockMvc.perform(post("/budget")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 — name exceeds 80 chars")
        void nameTooLong() throws Exception {
            String longName = "A".repeat(81);
            String body = String.format(
                    "{\"name\":\"%s\",\"periodicity\":\"MONTHLY\",\"startDate\":\"2026-01-01\"}", longName);

            mockMvc.perform(post("/budget")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("201 — name at exactly 80 chars is accepted")
        void nameAt80Chars() throws Exception {
            String name80 = "A".repeat(80);
            Budget b80 = new Budget(name80, BudgetPeriodicity.MONTHLY,
                    LocalDate.of(2026, 1, 1), user);
            setId(b80, BUDGET_ID);

            when(budgetService.createBudget(any(), eq(name80), any(), any())).thenReturn(b80);
            when(budgetConverter.toResponseDto(b80)).thenReturn(buildResponseDto());

            String body = String.format(
                    "{\"name\":\"%s\",\"periodicity\":\"MONTHLY\",\"startDate\":\"2026-01-01\"}", name80);

            mockMvc.perform(post("/budget")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated());
        }

        @Test
        @DisplayName("400 — missing periodicity")
        void missingPeriodicity() throws Exception {
            String body = """
                    {"name":"Budget","startDate":"2026-01-01"}
                    """;

            mockMvc.perform(post("/budget")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 — missing startDate")
        void missingStartDate() throws Exception {
            String body = """
                    {"name":"Budget","periodicity":"MONTHLY"}
                    """;

            mockMvc.perform(post("/budget")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 — service throws BudgetInvalidException (max limit reached)")
        void serviceThrowsBudgetInvalid() throws Exception {
            when(budgetService.createBudget(any(), any(), any(), any()))
                    .thenThrow(new BudgetInvalidException("Maximum number of budgets (10) reached"));

            String body = """
                    {"name":"Budget","periodicity":"MONTHLY","startDate":"2026-01-01"}
                    """;

            mockMvc.perform(post("/budget")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("201 — all periodicity values are accepted")
        void allPeriodicities() throws Exception {
            when(budgetService.createBudget(any(), any(), any(), any())).thenReturn(budget);
            when(budgetConverter.toResponseDto(any())).thenReturn(buildResponseDto());

            for (BudgetPeriodicity p : BudgetPeriodicity.values()) {
                String body = String.format(
                        "{\"name\":\"Budget\",\"periodicity\":\"%s\",\"startDate\":\"2026-01-01\"}", p);

                mockMvc.perform(post("/budget")
                                .requestAttr("userId", USER_ID)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body))
                        .andExpect(status().isCreated());
            }
        }
    }

    // ── PUT /budget/{budgetId} ───────────────────────────────────────────

    @Nested
    @DisplayName("PUT /budget/{budgetId}")
    class UpdateBudgetTests {

        @Test
        @DisplayName("200 — partial update (name only)")
        void partialUpdate() throws Exception {
            when(budgetService.modifyBudget(eq(USER_ID), eq(BUDGET_ID),
                    eq("New Name"), isNull(), isNull()))
                    .thenReturn(budget);
            when(budgetConverter.toResponseDto(budget)).thenReturn(buildResponseDto());

            String body = """
                    {"name":"New Name"}
                    """;

            mockMvc.perform(put("/budget/{budgetId}", BUDGET_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("400 — name exceeds 80 chars")
        void nameTooLong() throws Exception {
            String body = String.format("{\"name\":\"%s\"}", "A".repeat(81));

            mockMvc.perform(put("/budget/{budgetId}", BUDGET_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("404 — budget not found")
        void notFound() throws Exception {
            when(budgetService.modifyBudget(any(), eq(BUDGET_ID), any(), any(), any()))
                    .thenThrow(new InstanceNotFoundException("Budget", BUDGET_ID));

            mockMvc.perform(put("/budget/{budgetId}", BUDGET_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("400 — service throws BudgetInvalidException (blank name)")
        void serviceThrowsBudgetInvalid() throws Exception {
            when(budgetService.modifyBudget(any(), any(), any(), any(), any()))
                    .thenThrow(new BudgetInvalidException("Budget name cannot be blank"));

            // BudgetUpdateDto has no @NotBlank so blank passes validation but fails service
            String body = """
                    {"name":"   "}
                    """;

            mockMvc.perform(put("/budget/{budgetId}", BUDGET_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }
    }

    // ── DELETE /budget/{budgetId} ────────────────────────────────────────

    @Nested
    @DisplayName("DELETE /budget/{budgetId}")
    class DeleteBudgetTests {

        @Test
        @DisplayName("204 — successful deletion")
        void successDelete() throws Exception {
            doNothing().when(budgetService).deleteBudget(USER_ID, BUDGET_ID);

            mockMvc.perform(delete("/budget/{budgetId}", BUDGET_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNoContent());
        }

        @Test
        @DisplayName("404 — budget not found")
        void notFound() throws Exception {
            doThrow(new InstanceNotFoundException("Budget", BUDGET_ID))
                    .when(budgetService).deleteBudget(USER_ID, BUDGET_ID);

            mockMvc.perform(delete("/budget/{budgetId}", BUDGET_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound());
        }
    }

    // ── POST /budget/{budgetId}/category ─────────────────────────────────

    @Nested
    @DisplayName("POST /budget/{budgetId}/category")
    class CreateCategoryTests {

        @Test
        @DisplayName("201 — valid category creation")
        void validCreation() throws Exception {
            BudgetCategory bc = new BudgetCategory("Food", new BigDecimal("300.00"), 0, budget);
            setId(bc, BC_ID);

            when(budgetService.createBudgetCategory(eq(USER_ID), eq(BUDGET_ID),
                    eq("Food"), eq(new BigDecimal("300.00")), isNull()))
                    .thenReturn(bc);
            when(budgetService.findByIdAndUserId(BUDGET_ID, USER_ID)).thenReturn(budget);
            when(budgetConverter.toResponseDto(budget)).thenReturn(buildResponseDto());

            String body = """
                    {"name":"Food","maxAmount":300.00}
                    """;

            mockMvc.perform(post("/budget/{budgetId}/category", BUDGET_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated());
        }

        @Test
        @DisplayName("400 — missing category name")
        void missingName() throws Exception {
            String body = """
                    {"maxAmount":100.00}
                    """;

            mockMvc.perform(post("/budget/{budgetId}/category", BUDGET_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 — missing maxAmount")
        void missingMaxAmount() throws Exception {
            String body = """
                    {"name":"Food"}
                    """;

            mockMvc.perform(post("/budget/{budgetId}/category", BUDGET_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 — zero maxAmount fails @Positive constraint")
        void zeroMaxAmount() throws Exception {
            String body = """
                    {"name":"Food","maxAmount":0}
                    """;

            mockMvc.perform(post("/budget/{budgetId}/category", BUDGET_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 — negative maxAmount fails @Positive constraint")
        void negativeMaxAmount() throws Exception {
            String body = """
                    {"name":"Food","maxAmount":-50}
                    """;

            mockMvc.perform(post("/budget/{budgetId}/category", BUDGET_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 — category name exceeds 80 chars")
        void nameTooLong() throws Exception {
            String body = String.format("{\"name\":\"%s\",\"maxAmount\":100}", "A".repeat(81));

            mockMvc.perform(post("/budget/{budgetId}/category", BUDGET_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("404 — budget not found")
        void budgetNotFound() throws Exception {
            when(budgetService.createBudgetCategory(any(), eq(BUDGET_ID), any(), any(), any()))
                    .thenThrow(new InstanceNotFoundException("Budget", BUDGET_ID));

            String body = """
                    {"name":"Food","maxAmount":100}
                    """;

            mockMvc.perform(post("/budget/{budgetId}/category", BUDGET_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("400 — max categories limit via BudgetInvalidException")
        void maxCategoriesLimit() throws Exception {
            when(budgetService.createBudgetCategory(any(), any(), any(), any(), any()))
                    .thenThrow(new BudgetInvalidException("Maximum number of categories (40) reached"));

            String body = """
                    {"name":"Food","maxAmount":100}
                    """;

            mockMvc.perform(post("/budget/{budgetId}/category", BUDGET_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("201 — with linkedCategoryIds list")
        void withLinkedCategories() throws Exception {
            UUID catId = UUID.randomUUID();
            BudgetCategory bc = new BudgetCategory("Food", new BigDecimal("200.00"), 0, budget);
            setId(bc, BC_ID);

            when(budgetService.createBudgetCategory(any(), any(), any(), any(), any()))
                    .thenReturn(bc);
            when(budgetService.findByIdAndUserId(BUDGET_ID, USER_ID)).thenReturn(budget);
            when(budgetConverter.toResponseDto(budget)).thenReturn(buildResponseDto());

            String body = String.format(
                    "{\"name\":\"Food\",\"maxAmount\":200,\"linkedCategoryIds\":[\"%s\"]}", catId);

            mockMvc.perform(post("/budget/{budgetId}/category", BUDGET_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated());
        }
    }

    // ── PUT /budget/{budgetId}/category/{categoryId} ─────────────────────

    @Nested
    @DisplayName("PUT /budget/{budgetId}/category/{categoryId}")
    class UpdateCategoryTests {

        @Test
        @DisplayName("200 — successful update")
        void successUpdate() throws Exception {
            when(budgetService.modifyBudgetCategory(any(), any(), any(), any(), any(), any()))
                    .thenReturn(new BudgetCategory("New Name", new BigDecimal("200.00"), 0, budget));
            when(budgetService.findByIdAndUserId(BUDGET_ID, USER_ID)).thenReturn(budget);
            when(budgetConverter.toResponseDto(budget)).thenReturn(buildResponseDto());

            String body = """
                    {"name":"New Name","maxAmount":200}
                    """;

            mockMvc.perform(put("/budget/{budgetId}/category/{categoryId}", BUDGET_ID, BC_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("404 — budget category not found")
        void notFound() throws Exception {
            when(budgetService.modifyBudgetCategory(any(), any(), any(), any(), any(), any()))
                    .thenThrow(new InstanceNotFoundException("BudgetCategory", BC_ID));

            mockMvc.perform(put("/budget/{budgetId}/category/{categoryId}", BUDGET_ID, BC_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isNotFound());
        }
    }

    // ── DELETE /budget/{budgetId}/category/{categoryId} ──────────────────

    @Nested
    @DisplayName("DELETE /budget/{budgetId}/category/{categoryId}")
    class DeleteCategoryTests {

        @Test
        @DisplayName("204 — successful deletion")
        void successDelete() throws Exception {
            doNothing().when(budgetService).deleteBudgetCategory(USER_ID, BUDGET_ID, BC_ID);

            mockMvc.perform(delete("/budget/{budgetId}/category/{categoryId}", BUDGET_ID, BC_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNoContent());
        }

        @Test
        @DisplayName("404 — category not found")
        void notFound() throws Exception {
            doThrow(new InstanceNotFoundException("BudgetCategory", BC_ID))
                    .when(budgetService).deleteBudgetCategory(USER_ID, BUDGET_ID, BC_ID);

            mockMvc.perform(delete("/budget/{budgetId}/category/{categoryId}", BUDGET_ID, BC_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound());
        }
    }

    // ── POST /budget/{budgetId}/category/{categoryId}/link ───────────────

    @Nested
    @DisplayName("POST /budget/{budgetId}/category/{categoryId}/link")
    class LinkTransactionTests {

        @Test
        @DisplayName("204 — successful link")
        void successLink() throws Exception {
            doNothing().when(budgetService).linkTransaction(USER_ID, BUDGET_ID, BC_ID, TX_ID);

            String body = String.format("{\"transactionId\":\"%s\"}", TX_ID);

            mockMvc.perform(post("/budget/{budgetId}/category/{categoryId}/link", BUDGET_ID, BC_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isNoContent());
        }

        @Test
        @DisplayName("400 — missing transactionId")
        void missingTransactionId() throws Exception {
            mockMvc.perform(post("/budget/{budgetId}/category/{categoryId}/link", BUDGET_ID, BC_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("404 — budget not found")
        void budgetNotFound() throws Exception {
            doThrow(new InstanceNotFoundException("Budget", BUDGET_ID))
                    .when(budgetService).linkTransaction(any(), eq(BUDGET_ID), any(), any());

            String body = String.format("{\"transactionId\":\"%s\"}", TX_ID);

            mockMvc.perform(post("/budget/{budgetId}/category/{categoryId}/link", BUDGET_ID, BC_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("404 — transaction not found")
        void transactionNotFound() throws Exception {
            doThrow(new InstanceNotFoundException("Transaction", TX_ID))
                    .when(budgetService).linkTransaction(any(), any(), any(), eq(TX_ID));

            String body = String.format("{\"transactionId\":\"%s\"}", TX_ID);

            mockMvc.perform(post("/budget/{budgetId}/category/{categoryId}/link", BUDGET_ID, BC_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isNotFound());
        }
    }

    // ── DELETE /budget/{budgetId}/category/{categoryId}/link/{transactionId}

    @Nested
    @DisplayName("DELETE /budget/{budgetId}/category/{categoryId}/link/{transactionId}")
    class UnlinkTransactionTests {

        @Test
        @DisplayName("204 — successful unlink")
        void successUnlink() throws Exception {
            doNothing().when(budgetService)
                    .unlinkTransaction(USER_ID, BUDGET_ID, BC_ID, TX_ID);

            mockMvc.perform(delete("/budget/{budgetId}/category/{categoryId}/link/{transactionId}",
                            BUDGET_ID, BC_ID, TX_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNoContent());
        }

        @Test
        @DisplayName("404 — transaction not found during unlink")
        void notFound() throws Exception {
            doThrow(new InstanceNotFoundException("Transaction", TX_ID))
                    .when(budgetService)
                    .unlinkTransaction(any(), any(), any(), eq(TX_ID));

            mockMvc.perform(delete("/budget/{budgetId}/category/{categoryId}/link/{transactionId}",
                            BUDGET_ID, BC_ID, TX_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound());
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────

    private BudgetResponseDto buildResponseDto() {
        BudgetResponseDto dto = new BudgetResponseDto();
        dto.setId(BUDGET_ID.toString());
        dto.setName("Monthly Budget");
        dto.setPeriodicity(BudgetPeriodicity.MONTHLY);
        dto.setStartDate(LocalDate.of(2026, 1, 1));
        dto.setPeriodStart(LocalDate.of(2026, 3, 1));
        dto.setPeriodEnd(LocalDate.of(2026, 3, 31));
        dto.setTotalBudget(new BigDecimal("500.00"));
        dto.setTotalSpent(BigDecimal.ZERO);
        dto.setTotalRemaining(new BigDecimal("500.00"));
        dto.setCategories(List.of());
        return dto;
    }

    private static void setId(Object entity, UUID id) throws Exception {
        Field field = entity.getClass().getDeclaredField("id");
        field.setAccessible(true);
        field.set(entity, id);
    }
}
