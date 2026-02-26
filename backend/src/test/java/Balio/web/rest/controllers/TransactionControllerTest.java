package Balio.web.rest.controllers;

import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.AccountInvalidException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.Category;
import Balio.web.model.entities.Transaction;
import Balio.web.model.entities.User;
import Balio.web.model.services.TransactionService;
import Balio.web.rest.common.CommonControllerAdvice;
import Balio.web.rest.dtos.TransactionConverter;
import Balio.web.enums.AccountType;

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

import javax.management.InstanceNotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-layer unit tests for {@link TransactionController}.
 * <p>
 * Uses {@code MockMvcBuilders.standaloneSetup()} – no Spring context required.
 * Tests DTO validation, HTTP status codes, JSON payloads, and error handling.
 */
@ExtendWith(MockitoExtension.class)
class TransactionControllerTest {

    /* ───── constants ───── */
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID ACCOUNT_ID = UUID.randomUUID();
    private static final UUID CATEGORY_ID = UUID.randomUUID();
    private static final UUID TRANSACTION_ID = UUID.randomUUID();
    private static final String VALID_NAME = "Groceries";
    private static final BigDecimal VALID_AMOUNT = new BigDecimal("50.00");
    private static final LocalDate VALID_DATE = LocalDate.of(2025, 6, 15);

    /* ───── mocks ───── */
    @Mock
    private TransactionService transactionService;

    /* ───── real collaborators ───── */
    private final TransactionConverter transactionConverter = new TransactionConverter();
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    private MockMvc mockMvc;

    /* ───── test entities ───── */
    private User testUser;
    private Account testAccount;
    private Category testCategory;
    private Transaction testTransaction;

    @BeforeEach
    void setUp() {
        TransactionController controller = new TransactionController(transactionService, transactionConverter);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new CommonControllerAdvice())
                .build();

        testUser = new User("Nick", "nick@example.com", "encodedPwd");
        setFieldViaReflection(testUser, "id", USER_ID);

        testAccount = new Account("Main", AccountType.BANK, "EUR", new BigDecimal("1000.00"), testUser);
        setFieldViaReflection(testAccount, "id", ACCOUNT_ID);

        testCategory = new Category("Food", TransactionType.EXPENSE, testUser);
        setFieldViaReflection(testCategory, "id", CATEGORY_ID);

        testTransaction = new Transaction(VALID_NAME, VALID_AMOUNT, VALID_DATE, TransactionType.EXPENSE, testUser);
        setFieldViaReflection(testTransaction, "id", TRANSACTION_ID);
        testTransaction.setAccount(testAccount);
        testTransaction.setCategory(testCategory);
        testTransaction.setAffectsBalance(true);
    }

    /* ═══════════════════════════════════════════════════════════
     *  POST /transaction/expense
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("POST /transaction/expense")
    class AddExpenseEndpoint {

        @Test
        @DisplayName("201 – valid expense returns created transaction")
        void shouldReturn201_whenValidExpense() throws Exception {
            when(transactionService.addExpense(
                    eq(USER_ID), eq(ACCOUNT_ID), eq(CATEGORY_ID),
                    eq(VALID_NAME), eq(VALID_AMOUNT), eq(VALID_DATE), eq(true)))
                    .thenReturn(testTransaction);

            mockMvc.perform(post("/transaction/expense")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson(VALID_NAME, VALID_AMOUNT, ACCOUNT_ID, CATEGORY_ID, VALID_DATE, true, null)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id", is(TRANSACTION_ID.toString())))
                    .andExpect(jsonPath("$.name", is(VALID_NAME)))
                    .andExpect(jsonPath("$.amount", is(50.00)))
                    .andExpect(jsonPath("$.type", is("EXPENSE")))
                    .andExpect(jsonPath("$.affectsBalance", is(true)))
                    .andExpect(jsonPath("$.accountId", is(ACCOUNT_ID.toString())))
                    .andExpect(jsonPath("$.categoryId", is(CATEGORY_ID.toString())));
        }

        @Test
        @DisplayName("201 – expense without optional fields (category, date, affectsBalance)")
        void shouldReturn201_whenMinimalParams() throws Exception {
            Transaction minimal = new Transaction(VALID_NAME, VALID_AMOUNT, LocalDate.now(), TransactionType.EXPENSE, testUser);
            setFieldViaReflection(minimal, "id", TRANSACTION_ID);
            minimal.setAccount(testAccount);
            minimal.setAffectsBalance(true);

            when(transactionService.addExpense(
                    eq(USER_ID), eq(ACCOUNT_ID), isNull(),
                    eq(VALID_NAME), eq(VALID_AMOUNT), isNull(), isNull()))
                    .thenReturn(minimal);

            mockMvc.perform(post("/transaction/expense")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson(VALID_NAME, VALID_AMOUNT, ACCOUNT_ID, null, null, null, null)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.name", is(VALID_NAME)));
        }

        @Test
        @DisplayName("400 – blank name")
        void shouldReturn400_whenBlankName() throws Exception {
            mockMvc.perform(post("/transaction/expense")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson("", VALID_AMOUNT, ACCOUNT_ID, null, null, null, null)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – null name (missing)")
        void shouldReturn400_whenNullName() throws Exception {
            mockMvc.perform(post("/transaction/expense")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson(null, VALID_AMOUNT, ACCOUNT_ID, null, null, null, null)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – name exceeds 120 chars")
        void shouldReturn400_whenNameTooLong() throws Exception {
            String longName = "A".repeat(121);
            mockMvc.perform(post("/transaction/expense")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson(longName, VALID_AMOUNT, ACCOUNT_ID, null, null, null, null)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – null amount")
        void shouldReturn400_whenNullAmount() throws Exception {
            mockMvc.perform(post("/transaction/expense")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson(VALID_NAME, null, ACCOUNT_ID, null, null, null, null)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – zero amount")
        void shouldReturn400_whenZeroAmount() throws Exception {
            mockMvc.perform(post("/transaction/expense")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson(VALID_NAME, BigDecimal.ZERO, ACCOUNT_ID, null, null, null, null)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – negative amount")
        void shouldReturn400_whenNegativeAmount() throws Exception {
            mockMvc.perform(post("/transaction/expense")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson(VALID_NAME, new BigDecimal("-10"), ACCOUNT_ID, null, null, null, null)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – null accountId")
        void shouldReturn400_whenNullAccountId() throws Exception {
            mockMvc.perform(post("/transaction/expense")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson(VALID_NAME, VALID_AMOUNT, null, null, null, null, null)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – empty body")
        void shouldReturn400_whenEmptyBody() throws Exception {
            mockMvc.perform(post("/transaction/expense")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – AccountInvalidException (account not linked)")
        void shouldReturn400_whenAccountNotLinked() throws Exception {
            when(transactionService.addExpense(
                    eq(USER_ID), eq(ACCOUNT_ID), isNull(),
                    eq(VALID_NAME), eq(VALID_AMOUNT), eq(VALID_DATE), eq(true)))
                    .thenThrow(new AccountInvalidException("Account not linked"));

            mockMvc.perform(post("/transaction/expense")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson(VALID_NAME, VALID_AMOUNT, ACCOUNT_ID, null, VALID_DATE, true, null)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code", is("project.exceptions.AccountInvalidException")));
        }

        @Test
        @DisplayName("404 – UserNotFoundException")
        void shouldReturn404_whenUserNotFound() throws Exception {
            when(transactionService.addExpense(
                    eq(USER_ID), eq(ACCOUNT_ID), isNull(),
                    eq(VALID_NAME), eq(VALID_AMOUNT), eq(VALID_DATE), eq(true)))
                    .thenThrow(new UserNotFoundException("User not found"));

            mockMvc.perform(post("/transaction/expense")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson(VALID_NAME, VALID_AMOUNT, ACCOUNT_ID, null, VALID_DATE, true, null)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code", is("project.exceptions.InstanceNotFoundException")));
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  POST /transaction/income
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("POST /transaction/income")
    class AddIncomeEndpoint {

        @Test
        @DisplayName("201 – valid income returns created transaction")
        void shouldReturn201_whenValidIncome() throws Exception {
            Transaction incomeTx = new Transaction("Salary", new BigDecimal("2000.00"), VALID_DATE, TransactionType.INCOME, testUser);
            setFieldViaReflection(incomeTx, "id", TRANSACTION_ID);
            incomeTx.setAccount(testAccount);
            incomeTx.setAffectsBalance(true);

            when(transactionService.addIncome(
                    eq(USER_ID), eq(ACCOUNT_ID), isNull(),
                    eq("Salary"), eq(new BigDecimal("2000.00")), eq(VALID_DATE), eq(true)))
                    .thenReturn(incomeTx);

            mockMvc.perform(post("/transaction/income")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson("Salary", new BigDecimal("2000.00"), ACCOUNT_ID, null, VALID_DATE, true, null)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.name", is("Salary")))
                    .andExpect(jsonPath("$.type", is("INCOME")))
                    .andExpect(jsonPath("$.amount", is(2000.00)));
        }

        @Test
        @DisplayName("400 – blank name")
        void shouldReturn400_whenBlankName() throws Exception {
            mockMvc.perform(post("/transaction/income")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson("", VALID_AMOUNT, ACCOUNT_ID, null, null, null, null)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – null amount")
        void shouldReturn400_whenNullAmount() throws Exception {
            mockMvc.perform(post("/transaction/income")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson(VALID_NAME, null, ACCOUNT_ID, null, null, null, null)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – null accountId")
        void shouldReturn400_whenNullAccountId() throws Exception {
            mockMvc.perform(post("/transaction/income")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson(VALID_NAME, VALID_AMOUNT, null, null, null, null, null)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – AccountInvalidException")
        void shouldReturn400_whenAccountInvalid() throws Exception {
            when(transactionService.addIncome(
                    eq(USER_ID), eq(ACCOUNT_ID), isNull(),
                    eq(VALID_NAME), eq(VALID_AMOUNT), isNull(), isNull()))
                    .thenThrow(new AccountInvalidException("Account not linked"));

            mockMvc.perform(post("/transaction/income")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson(VALID_NAME, VALID_AMOUNT, ACCOUNT_ID, null, null, null, null)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code", is("project.exceptions.AccountInvalidException")));
        }

        @Test
        @DisplayName("404 – UserNotFoundException")
        void shouldReturn404_whenUserNotFound() throws Exception {
            when(transactionService.addIncome(
                    eq(USER_ID), eq(ACCOUNT_ID), isNull(),
                    eq(VALID_NAME), eq(VALID_AMOUNT), isNull(), isNull()))
                    .thenThrow(new UserNotFoundException("User not found"));

            mockMvc.perform(post("/transaction/income")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson(VALID_NAME, VALID_AMOUNT, ACCOUNT_ID, null, null, null, null)))
                    .andExpect(status().isNotFound());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  PUT /transaction/{transactionId}
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("PUT /transaction/{transactionId}")
    class UpdateTransactionEndpoint {

        @Test
        @DisplayName("200 – valid update returns updated transaction")
        void shouldReturn200_whenValidUpdate() throws Exception {
            Transaction updated = new Transaction("Updated", new BigDecimal("75.00"), VALID_DATE, TransactionType.INCOME, testUser);
            setFieldViaReflection(updated, "id", TRANSACTION_ID);
            updated.setAccount(testAccount);
            updated.setAffectsBalance(true);

            when(transactionService.updateTransaction(
                    eq(USER_ID), eq(TRANSACTION_ID), eq(ACCOUNT_ID), isNull(),
                    eq(TransactionType.INCOME), eq("Updated"), eq(new BigDecimal("75.00")),
                    eq(VALID_DATE), eq(true)))
                    .thenReturn(updated);

            mockMvc.perform(put("/transaction/{id}", TRANSACTION_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson("Updated", new BigDecimal("75.00"), ACCOUNT_ID, null, VALID_DATE, true, TransactionType.INCOME)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(TRANSACTION_ID.toString())))
                    .andExpect(jsonPath("$.name", is("Updated")))
                    .andExpect(jsonPath("$.type", is("INCOME")));
        }

        @Test
        @DisplayName("404 – transaction not found")
        void shouldReturn404_whenTransactionNotFound() throws Exception {
            when(transactionService.updateTransaction(
                    eq(USER_ID), eq(TRANSACTION_ID), eq(ACCOUNT_ID), isNull(),
                    eq(TransactionType.EXPENSE), eq(VALID_NAME), eq(VALID_AMOUNT),
                    eq(VALID_DATE), eq(true)))
                    .thenThrow(new InstanceNotFoundException());

            mockMvc.perform(put("/transaction/{id}", TRANSACTION_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson(VALID_NAME, VALID_AMOUNT, ACCOUNT_ID, null, VALID_DATE, true, TransactionType.EXPENSE)))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("400 – AccountInvalidException on update")
        void shouldReturn400_whenAccountInvalidOnUpdate() throws Exception {
            when(transactionService.updateTransaction(
                    eq(USER_ID), eq(TRANSACTION_ID), eq(ACCOUNT_ID), isNull(),
                    eq(TransactionType.EXPENSE), eq(VALID_NAME), eq(VALID_AMOUNT),
                    eq(VALID_DATE), eq(true)))
                    .thenThrow(new AccountInvalidException("Account not linked"));

            mockMvc.perform(put("/transaction/{id}", TRANSACTION_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson(VALID_NAME, VALID_AMOUNT, ACCOUNT_ID, null, VALID_DATE, true, TransactionType.EXPENSE)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code", is("project.exceptions.AccountInvalidException")));
        }

        @Test
        @DisplayName("400 – blank name on update")
        void shouldReturn400_whenBlankNameOnUpdate() throws Exception {
            mockMvc.perform(put("/transaction/{id}", TRANSACTION_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson("", VALID_AMOUNT, ACCOUNT_ID, null, VALID_DATE, true, TransactionType.EXPENSE)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – null amount on update")
        void shouldReturn400_whenNullAmountOnUpdate() throws Exception {
            mockMvc.perform(put("/transaction/{id}", TRANSACTION_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson(VALID_NAME, null, ACCOUNT_ID, null, VALID_DATE, true, TransactionType.EXPENSE)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – negative amount on update")
        void shouldReturn400_whenNegativeAmountOnUpdate() throws Exception {
            mockMvc.perform(put("/transaction/{id}", TRANSACTION_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson(VALID_NAME, new BigDecimal("-5"), ACCOUNT_ID, null, VALID_DATE, true, TransactionType.EXPENSE)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – null accountId on update")
        void shouldReturn400_whenNullAccountIdOnUpdate() throws Exception {
            mockMvc.perform(put("/transaction/{id}", TRANSACTION_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson(VALID_NAME, VALID_AMOUNT, null, null, VALID_DATE, true, TransactionType.EXPENSE)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – empty body on update")
        void shouldReturn400_whenEmptyBodyOnUpdate() throws Exception {
            mockMvc.perform(put("/transaction/{id}", TRANSACTION_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  DELETE /transaction/{transactionId}
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("DELETE /transaction/{transactionId}")
    class DeleteTransactionEndpoint {

        @Test
        @DisplayName("204 – successful delete with default revertBalance=true")
        void shouldReturn204_whenDeleteSuccessful() throws Exception {
            mockMvc.perform(delete("/transaction/{id}", TRANSACTION_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNoContent());

            verify(transactionService).deleteTransaction(USER_ID, TRANSACTION_ID, true);
        }

        @Test
        @DisplayName("204 – successful delete with revertBalance=false")
        void shouldReturn204_whenDeleteWithRevertFalse() throws Exception {
            mockMvc.perform(delete("/transaction/{id}", TRANSACTION_ID)
                            .requestAttr("userId", USER_ID)
                            .param("revertBalance", "false"))
                    .andExpect(status().isNoContent());

            verify(transactionService).deleteTransaction(USER_ID, TRANSACTION_ID, false);
        }

        @Test
        @DisplayName("404 – transaction not found on delete")
        void shouldReturn404_whenTransactionNotFoundOnDelete() throws Exception {
            doThrow(new InstanceNotFoundException())
                    .when(transactionService).deleteTransaction(USER_ID, TRANSACTION_ID, true);

            mockMvc.perform(delete("/transaction/{id}", TRANSACTION_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  GET /transaction
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("GET /transaction")
    class ListTransactionsEndpoint {

        @Test
        @DisplayName("200 – returns all transactions when no filters")
        void shouldReturn200_whenNoFilters() throws Exception {
            Transaction tx1 = new Transaction("A", VALID_AMOUNT, VALID_DATE, TransactionType.EXPENSE, testUser);
            setFieldViaReflection(tx1, "id", UUID.randomUUID());
            Transaction tx2 = new Transaction("B", VALID_AMOUNT, VALID_DATE, TransactionType.INCOME, testUser);
            setFieldViaReflection(tx2, "id", UUID.randomUUID());

            when(transactionService.findAllByUserId(USER_ID)).thenReturn(List.of(tx1, tx2));

            mockMvc.perform(get("/transaction")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)))
                    .andExpect(jsonPath("$[0].name", is("A")))
                    .andExpect(jsonPath("$[1].name", is("B")));
        }

        @Test
        @DisplayName("200 – returns empty list when no transactions")
        void shouldReturn200_whenNoTransactions() throws Exception {
            when(transactionService.findAllByUserId(USER_ID)).thenReturn(List.of());

            mockMvc.perform(get("/transaction")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }

        @Test
        @DisplayName("200 – returns filtered results when type filter provided")
        void shouldReturn200_whenTypeFilterProvided() throws Exception {
            Transaction tx = new Transaction("Filtered", VALID_AMOUNT, VALID_DATE, TransactionType.EXPENSE, testUser);
            setFieldViaReflection(tx, "id", UUID.randomUUID());

            when(transactionService.findFiltered(USER_ID, TransactionType.EXPENSE, null, null, null, null))
                    .thenReturn(List.of(tx));

            mockMvc.perform(get("/transaction")
                            .requestAttr("userId", USER_ID)
                            .param("type", "EXPENSE"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].name", is("Filtered")));
        }

        @Test
        @DisplayName("200 – returns filtered results when accountId filter provided")
        void shouldReturn200_whenAccountIdFilterProvided() throws Exception {
            when(transactionService.findFiltered(USER_ID, null, ACCOUNT_ID, null, null, null))
                    .thenReturn(List.of());

            mockMvc.perform(get("/transaction")
                            .requestAttr("userId", USER_ID)
                            .param("accountId", ACCOUNT_ID.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }

        @Test
        @DisplayName("200 – returns filtered results when date-range filters provided")
        void shouldReturn200_whenDateFiltersProvided() throws Exception {
            LocalDate start = LocalDate.of(2025, 1, 1);
            LocalDate end = LocalDate.of(2025, 12, 31);

            when(transactionService.findFiltered(USER_ID, null, null, null, start, end))
                    .thenReturn(List.of());

            mockMvc.perform(get("/transaction")
                            .requestAttr("userId", USER_ID)
                            .param("startDate", "2025-01-01")
                            .param("endDate", "2025-12-31"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }

        @Test
        @DisplayName("200 – returns filtered results with all filters combined")
        void shouldReturn200_whenAllFiltersCombined() throws Exception {
            LocalDate start = LocalDate.of(2025, 1, 1);
            LocalDate end = LocalDate.of(2025, 12, 31);

            when(transactionService.findFiltered(USER_ID, TransactionType.EXPENSE, ACCOUNT_ID, CATEGORY_ID, start, end))
                    .thenReturn(List.of());

            mockMvc.perform(get("/transaction")
                            .requestAttr("userId", USER_ID)
                            .param("type", "EXPENSE")
                            .param("accountId", ACCOUNT_ID.toString())
                            .param("categoryId", CATEGORY_ID.toString())
                            .param("startDate", "2025-01-01")
                            .param("endDate", "2025-12-31"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  GET /transaction/{transactionId}
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("GET /transaction/{transactionId}")
    class GetTransactionEndpoint {

        @Test
        @DisplayName("200 – returns transaction detail")
        void shouldReturn200_whenTransactionFound() throws Exception {
            when(transactionService.findByIdAndUserId(TRANSACTION_ID, USER_ID)).thenReturn(testTransaction);

            mockMvc.perform(get("/transaction/{id}", TRANSACTION_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(TRANSACTION_ID.toString())))
                    .andExpect(jsonPath("$.name", is(VALID_NAME)))
                    .andExpect(jsonPath("$.amount", is(50.00)))
                    .andExpect(jsonPath("$.type", is("EXPENSE")))
                    .andExpect(jsonPath("$.affectsBalance", is(true)))
                    .andExpect(jsonPath("$.accountId", is(ACCOUNT_ID.toString())))
                    .andExpect(jsonPath("$.accountName", is("Main")))
                    .andExpect(jsonPath("$.categoryId", is(CATEGORY_ID.toString())))
                    .andExpect(jsonPath("$.categoryName", is("Food")));
        }

        @Test
        @DisplayName("200 – returns transaction without category")
        void shouldReturn200_whenTransactionHasNoCategory() throws Exception {
            testTransaction.setCategory(null);
            when(transactionService.findByIdAndUserId(TRANSACTION_ID, USER_ID)).thenReturn(testTransaction);

            mockMvc.perform(get("/transaction/{id}", TRANSACTION_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.categoryId").doesNotExist())
                    .andExpect(jsonPath("$.categoryName").doesNotExist());
        }

        @Test
        @DisplayName("404 – transaction not found")
        void shouldReturn404_whenTransactionNotFound() throws Exception {
            when(transactionService.findByIdAndUserId(TRANSACTION_ID, USER_ID))
                    .thenThrow(new InstanceNotFoundException());

            mockMvc.perform(get("/transaction/{id}", TRANSACTION_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  Helpers
     * ═══════════════════════════════════════════════════════════ */

    /**
     * Builds a TransactionDto JSON string with optional fields.
     */
    private String transactionJson(String name, BigDecimal amount, UUID accountId,
                                   UUID categoryId, LocalDate date, Boolean affectsBalance,
                                   TransactionType type) throws Exception {
        Map<String, Object> map = new HashMap<>();
        if (name != null) map.put("name", name);
        if (amount != null) map.put("amount", amount);
        if (accountId != null) map.put("accountId", accountId.toString());
        if (categoryId != null) map.put("categoryId", categoryId.toString());
        if (date != null) map.put("date", date.toString());
        if (affectsBalance != null) map.put("affectsBalance", affectsBalance);
        if (type != null) map.put("type", type.name());
        return objectMapper.writeValueAsString(map);
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
