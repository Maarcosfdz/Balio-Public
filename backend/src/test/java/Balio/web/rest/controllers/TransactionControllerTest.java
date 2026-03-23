package Balio.web.rest.controllers;

import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.AccountInvalidException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.Category;
import Balio.web.model.entities.Transaction;
import Balio.web.model.entities.User;
import Balio.web.model.entities.CategoryDao;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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
    @Mock
    private CategoryDao categoryDao;

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
        TransactionController controller = new TransactionController(
                transactionService, transactionConverter, categoryDao, objectMapper);

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
        @DisplayName("201 – null accountId")
        void shouldReturn201_whenNullAccountId() throws Exception {
            Transaction noAccountTx = new Transaction(VALID_NAME, VALID_AMOUNT, VALID_DATE, TransactionType.EXPENSE, testUser);
            setFieldViaReflection(noAccountTx, "id", TRANSACTION_ID);
            noAccountTx.setAffectsBalance(false);

            when(transactionService.addExpense(
                    eq(USER_ID), isNull(), isNull(),
                    eq(VALID_NAME), eq(VALID_AMOUNT), isNull(), isNull()))
                    .thenReturn(noAccountTx);

            mockMvc.perform(post("/transaction/expense")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson(VALID_NAME, VALID_AMOUNT, null, null, null, null, null)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.name", is(VALID_NAME)));
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
        @DisplayName("201 – null accountId")
        void shouldReturn201_whenNullAccountId() throws Exception {
            Transaction noAccountTx = new Transaction(VALID_NAME, VALID_AMOUNT, VALID_DATE, TransactionType.INCOME, testUser);
            setFieldViaReflection(noAccountTx, "id", TRANSACTION_ID);
            noAccountTx.setAffectsBalance(false);

            when(transactionService.addIncome(
                    eq(USER_ID), isNull(), isNull(),
                    eq(VALID_NAME), eq(VALID_AMOUNT), isNull(), isNull()))
                    .thenReturn(noAccountTx);

            mockMvc.perform(post("/transaction/income")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson(VALID_NAME, VALID_AMOUNT, null, null, null, null, null)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.name", is(VALID_NAME)));
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
        @DisplayName("200 – null accountId on update")
        void shouldReturn200_whenNullAccountIdOnUpdate() throws Exception {
            Transaction updated = new Transaction(VALID_NAME, VALID_AMOUNT, VALID_DATE, TransactionType.EXPENSE, testUser);
            setFieldViaReflection(updated, "id", TRANSACTION_ID);
            updated.setAffectsBalance(true);
            updated.setAccount(null);
            updated.setCategory(testCategory);

            when(transactionService.updateTransaction(
                    eq(USER_ID), eq(TRANSACTION_ID), isNull(), isNull(),
                    eq(TransactionType.EXPENSE), eq(VALID_NAME), eq(VALID_AMOUNT), eq(VALID_DATE), eq(true)))
                    .thenReturn(updated);

            mockMvc.perform(put("/transaction/{id}", TRANSACTION_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(transactionJson(VALID_NAME, VALID_AMOUNT, null, null, VALID_DATE, true, TransactionType.EXPENSE)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(TRANSACTION_ID.toString())))
                    .andExpect(jsonPath("$.name", is(VALID_NAME)));
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

            when(transactionService.findPaged(eq(USER_ID), isNull(), isNull(), isNull(), isNull(), isNull(), eq(0), eq(20)))
                    .thenReturn(new PageImpl<>(new ArrayList<>(List.of(tx1, tx2)), PageRequest.of(0, 20), 2));

            mockMvc.perform(get("/transaction")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(2)))
                    .andExpect(jsonPath("$.content[0].name", is("A")))
                    .andExpect(jsonPath("$.content[1].name", is("B")));
        }

        @Test
        @DisplayName("200 – returns empty list when no transactions")
        void shouldReturn200_whenNoTransactions() throws Exception {
            when(transactionService.findPaged(eq(USER_ID), isNull(), isNull(), isNull(), isNull(), isNull(), eq(0), eq(20)))
                    .thenReturn(new PageImpl<>(new ArrayList<>(), PageRequest.of(0, 20), 0));

            mockMvc.perform(get("/transaction")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(0)));
        }

        @Test
        @DisplayName("200 – returns filtered results when type filter provided")
        void shouldReturn200_whenTypeFilterProvided() throws Exception {
            Transaction tx = new Transaction("Filtered", VALID_AMOUNT, VALID_DATE, TransactionType.EXPENSE, testUser);
            setFieldViaReflection(tx, "id", UUID.randomUUID());

            when(transactionService.findPaged(eq(USER_ID), eq(TransactionType.EXPENSE), isNull(), isNull(), isNull(), isNull(), eq(0), eq(20)))
                    .thenReturn(new PageImpl<>(new ArrayList<>(List.of(tx)), PageRequest.of(0, 20), 1));

            mockMvc.perform(get("/transaction")
                            .requestAttr("userId", USER_ID)
                            .param("type", "EXPENSE"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].name", is("Filtered")));
        }

        @Test
        @DisplayName("200 – returns filtered results when accountId filter provided")
        void shouldReturn200_whenAccountIdFilterProvided() throws Exception {
            when(transactionService.findPaged(eq(USER_ID), isNull(), eq(ACCOUNT_ID), isNull(), isNull(), isNull(), eq(0), eq(20)))
                    .thenReturn(new PageImpl<>(new ArrayList<>(), PageRequest.of(0, 20), 0));

            mockMvc.perform(get("/transaction")
                            .requestAttr("userId", USER_ID)
                            .param("accountId", ACCOUNT_ID.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(0)));
        }

        @Test
        @DisplayName("200 – returns filtered results when date-range filters provided")
        void shouldReturn200_whenDateFiltersProvided() throws Exception {
            LocalDate start = LocalDate.of(2025, 1, 1);
            LocalDate end = LocalDate.of(2025, 12, 31);

            when(transactionService.findPaged(eq(USER_ID), isNull(), isNull(), isNull(), eq(start), eq(end), eq(0), eq(20)))
                    .thenReturn(new PageImpl<>(new ArrayList<>(), PageRequest.of(0, 20), 0));

            mockMvc.perform(get("/transaction")
                            .requestAttr("userId", USER_ID)
                            .param("startDate", "2025-01-01")
                            .param("endDate", "2025-12-31"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(0)));
        }

        @Test
        @DisplayName("200 – returns filtered results with all filters combined")
        void shouldReturn200_whenAllFiltersCombined() throws Exception {
            LocalDate start = LocalDate.of(2025, 1, 1);
            LocalDate end = LocalDate.of(2025, 12, 31);

            when(transactionService.findPaged(eq(USER_ID), eq(TransactionType.EXPENSE), eq(ACCOUNT_ID), eq(CATEGORY_ID), eq(start), eq(end), eq(0), eq(20)))
                    .thenReturn(new PageImpl<>(new ArrayList<>(), PageRequest.of(0, 20), 0));

            mockMvc.perform(get("/transaction")
                            .requestAttr("userId", USER_ID)
                            .param("type", "EXPENSE")
                            .param("accountId", ACCOUNT_ID.toString())
                            .param("categoryId", CATEGORY_ID.toString())
                            .param("startDate", "2025-01-01")
                            .param("endDate", "2025-12-31"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(0)));
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
     *  GET /transaction/export/csv
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("GET /transaction/export/csv")
    class ExportCsvEndpoint {

        @Test
        @DisplayName("200 – returns CSV with standard header")
        void csvHeaderPresent() throws Exception {
            when(transactionService.findFiltered(USER_ID, null, null, null, null, null))
                    .thenReturn(List.of());

            String body = mockMvc.perform(get("/transaction/export/csv")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Disposition",
                            org.hamcrest.Matchers.containsString("attachment")))
                    .andReturn().getResponse().getContentAsString();

            assertTrue(body.startsWith("Date,Name,Amount,Category"));
        }

        @Test
        @DisplayName("200 – expense has negative amount in CSV")
        void expenseNegativeAmount() throws Exception {
            testTransaction.setCategory(null);
            when(transactionService.findFiltered(USER_ID, null, null, null, null, null))
                    .thenReturn(List.of(testTransaction));

            String body = mockMvc.perform(get("/transaction/export/csv")
                            .requestAttr("userId", USER_ID))
                    .andReturn().getResponse().getContentAsString();

            assertTrue(body.contains("-50.00"), "Expense should have negative amount");
        }

        @Test
        @DisplayName("200 – income has positive amount in CSV")
        void incomePositiveAmount() throws Exception {
            Transaction incomeTx = new Transaction("Salary", new BigDecimal("2000.00"),
                    VALID_DATE, TransactionType.INCOME, testUser);
            setFieldViaReflection(incomeTx, "id", UUID.randomUUID());
            incomeTx.setCategory(null);

            when(transactionService.findFiltered(USER_ID, null, null, null, null, null))
                    .thenReturn(List.of(incomeTx));

            String body = mockMvc.perform(get("/transaction/export/csv")
                            .requestAttr("userId", USER_ID))
                    .andReturn().getResponse().getContentAsString();

            assertTrue(body.contains("2000.00"), "Income should have positive amount");
            assertFalse(body.contains("-2000.00"), "Income should NOT be negative");
        }

        @Test
        @DisplayName("200 – category name is included")
        void categoryNameIncluded() throws Exception {
            when(transactionService.findFiltered(USER_ID, null, null, null, null, null))
                    .thenReturn(List.of(testTransaction)); // testTransaction has category "Food"

            String body = mockMvc.perform(get("/transaction/export/csv")
                            .requestAttr("userId", USER_ID))
                    .andReturn().getResponse().getContentAsString();

            assertTrue(body.contains("Food"), "Category name should appear in CSV");
        }

        @Test
        @DisplayName("200 – null category produces empty category field")
        void nullCategoryEmptyField() throws Exception {
            testTransaction.setCategory(null);
            when(transactionService.findFiltered(USER_ID, null, null, null, null, null))
                    .thenReturn(List.of(testTransaction));

            String body = mockMvc.perform(get("/transaction/export/csv")
                            .requestAttr("userId", USER_ID))
                    .andReturn().getResponse().getContentAsString();

            // Row ends with comma (empty category)
            assertTrue(body.contains(VALID_DATE + "," + VALID_NAME + ",-50.00,\n"));
        }

        @Test
        @DisplayName("200 – name with comma is quoted")
        void nameWithCommaIsQuoted() throws Exception {
            Transaction tx = new Transaction("Coffee, breakfast", new BigDecimal("5.00"),
                    VALID_DATE, TransactionType.EXPENSE, testUser);
            setFieldViaReflection(tx, "id", UUID.randomUUID());
            tx.setCategory(null);

            when(transactionService.findFiltered(USER_ID, null, null, null, null, null))
                    .thenReturn(List.of(tx));

            String body = mockMvc.perform(get("/transaction/export/csv")
                            .requestAttr("userId", USER_ID))
                    .andReturn().getResponse().getContentAsString();

            assertTrue(body.contains("\"Coffee, breakfast\""), "Name with comma must be quoted");
        }

        @Test
        @DisplayName("200 – name with double-quote is escaped")
        void nameWithDoubleQuoteEscaped() throws Exception {
            Transaction tx = new Transaction("He said \"hello\"", new BigDecimal("10.00"),
                    VALID_DATE, TransactionType.EXPENSE, testUser);
            setFieldViaReflection(tx, "id", UUID.randomUUID());
            tx.setCategory(null);

            when(transactionService.findFiltered(USER_ID, null, null, null, null, null))
                    .thenReturn(List.of(tx));

            String body = mockMvc.perform(get("/transaction/export/csv")
                            .requestAttr("userId", USER_ID))
                    .andReturn().getResponse().getContentAsString();

            assertTrue(body.contains("\"He said \"\"hello\"\"\""),
                    "Double quotes must be escaped as double-double-quotes");
        }

        @Test
        @DisplayName("200 – with accountId filter: passes it to service")
        void withAccountIdFilter() throws Exception {
            when(transactionService.findFiltered(USER_ID, null, ACCOUNT_ID, null, null, null))
                    .thenReturn(List.of());

            mockMvc.perform(get("/transaction/export/csv")
                            .requestAttr("userId", USER_ID)
                            .param("accountId", ACCOUNT_ID.toString()))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Disposition",
                            org.hamcrest.Matchers.containsString("transactions_" + ACCOUNT_ID)));

            verify(transactionService).findFiltered(USER_ID, null, ACCOUNT_ID, null, null, null);
        }

        @Test
        @DisplayName("200 – empty transactions list returns header only")
        void emptyTransactionsHeaderOnly() throws Exception {
            when(transactionService.findFiltered(USER_ID, null, null, null, null, null))
                    .thenReturn(List.of());

            String body = mockMvc.perform(get("/transaction/export/csv")
                            .requestAttr("userId", USER_ID))
                    .andReturn().getResponse().getContentAsString();

            // Should have exactly one line (the header + newline)
            assertEquals("Date,Name,Amount,Category\n", body);
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  POST /transaction/import/csv
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("POST /transaction/import/csv")
    class ImportCsvEndpoint {

        private static final String APP_HEADER = "Date,Name,Amount,Category\n";

        private MockMultipartFile csvFile(String content) {
            return new MockMultipartFile("file", "import.csv",
                    "text/csv", content.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        }

        @Test
        @DisplayName("400 – empty file returns error message")
        void emptyFile() throws Exception {
            MockMultipartFile empty = new MockMultipartFile("file", "empty.csv",
                    "text/csv", new byte[0]);

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(empty)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors[0]", is("Empty CSV file")));
        }

        @Test
        @DisplayName("200 – header only file: 0 imported, 0 skipped")
        void headerOnlyFile() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(csvFile(APP_HEADER))
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(0)))
                    .andExpect(jsonPath("$.skipped", is(0)));
        }

        @Test
        @DisplayName("200 – valid app CSV expense row imported")
        void validAppCsvExpenseRow() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());
            when(transactionService.addExpense(any(), any(), any(), any(), any(), any(), anyBoolean()))
                    .thenReturn(testTransaction);

            String content = APP_HEADER + "2026-01-15,Supermarket,-45.50,\n";

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(csvFile(content))
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(1)))
                    .andExpect(jsonPath("$.skipped", is(0)));

            verify(transactionService).addExpense(eq(USER_ID), isNull(), isNull(),
                    eq("Supermarket"), eq(new BigDecimal("45.50")), any(), eq(true));
        }

        @Test
        @DisplayName("200 – valid app CSV income row imported")
        void validAppCsvIncomeRow() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());
            when(transactionService.addIncome(any(), any(), any(), any(), any(), any(), anyBoolean()))
                    .thenReturn(testTransaction);

            String content = APP_HEADER + "2026-01-15,Salary,2000.00,\n";

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(csvFile(content))
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(1)));

            verify(transactionService).addIncome(eq(USER_ID), isNull(), isNull(),
                    eq("Salary"), eq(new BigDecimal("2000.00")), any(), eq(true));
        }

        @Test
        @DisplayName("200 – blank row is skipped silently")
        void blankRowSkipped() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());

            String content = APP_HEADER + "\n\n";

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(csvFile(content))
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(0)))
                    .andExpect(jsonPath("$.skipped", is(0))); // blank lines are ignored, not skipped
        }

        @Test
        @DisplayName("200 – row with not enough columns is skipped with error")
        void notEnoughColumnsSkipped() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());

            String content = APP_HEADER + "2026-01-15\n"; // only 1 column

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(csvFile(content))
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.skipped", is(1)))
                    .andExpect(jsonPath("$.errors[0]", org.hamcrest.Matchers.containsString("Line 2")));
        }

        @Test
        @DisplayName("200 – row with invalid amount (text) is skipped")
        void invalidAmountSkipped() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());

            String content = APP_HEADER + "2026-01-15,Supermarket,NOT_A_NUMBER,\n";

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(csvFile(content))
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.skipped", is(1)));
        }

        @Test
        @DisplayName("200 – BOM prefix stripped from header")
        void bomPrefixStripped() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());
            when(transactionService.addExpense(any(), any(), any(), any(), any(), any(), anyBoolean()))
                    .thenReturn(testTransaction);

            // BOM + app CSV header
            String content = "\uFEFFDate,Name,Amount,Category\n2026-01-15,Coffee,-3.00,\n";

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(new MockMultipartFile("file", "bom.csv", "text/csv",
                                    content.getBytes(java.nio.charset.StandardCharsets.UTF_8)))
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(1)));
        }

        @Test
        @DisplayName("200 – bank semicolon format (Fecha) detected correctly")
        void bankSemicolonFormat() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());
            when(transactionService.addExpense(any(), any(), any(), any(), any(), any(), anyBoolean()))
                    .thenReturn(testTransaction);

            // Bank format: Fecha ctble;Fecha valor;Concepto;Importe;...
            String content = "Fecha ctble;Fecha valor;Concepto;Importe;Moneda;Saldo;Moneda;Concepto ampliado\n"
                    + "15/01/2026;15/01/2026;Supermercado;-45,50;EUR;1000,00;EUR;Compra supermercado\n";

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(csvFile(content))
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(1)));

            verify(transactionService).addExpense(eq(USER_ID), isNull(), isNull(),
                    eq("Supermercado"), eq(new BigDecimal("45.50")), any(), eq(true));
        }

        @Test
        @DisplayName("200 – bank TAB format detected correctly")
        void bankTabFormat() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());
            when(transactionService.addIncome(any(), any(), any(), any(), any(), any(), anyBoolean()))
                    .thenReturn(testTransaction);

            String content = "Fecha ctble\tFecha valor\tConcepto\tImporte\tMoneda\n"
                    + "15/01/2026\t15/01/2026\tNomina\t1.500,00\tEUR\n";

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(csvFile(content))
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(1)));

            verify(transactionService).addIncome(eq(USER_ID), isNull(), isNull(),
                    eq("Nomina"), eq(new BigDecimal("1500.00")), any(), eq(true));
        }

        @Test
        @DisplayName("200 – bank amount with thousands separator (1.234,56)")
        void bankAmountWithThousandsSeparator() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());
            when(transactionService.addExpense(any(), any(), any(), any(), any(), any(), anyBoolean()))
                    .thenReturn(testTransaction);

            String content = "Fecha ctble;Fecha valor;Concepto;Importe;Moneda\n"
                    + "15/01/2026;15/01/2026;Compra;-1.234,56;EUR\n";

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(csvFile(content))
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(1)));

            verify(transactionService).addExpense(any(), any(), any(), any(),
                    eq(new BigDecimal("1234.56")), any(), anyBoolean());
        }

        @Test
        @DisplayName("200 – category matched by name in CSV column")
        void categoryMatchedByName() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID))
                    .thenReturn(List.of(testCategory));
            when(transactionService.addExpense(any(), any(), any(), any(), any(), any(), anyBoolean()))
                    .thenReturn(testTransaction);

            String content = APP_HEADER + "2026-01-15,Groceries,-30.00,Food\n";

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(csvFile(content))
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(1)));

            // Category "Food" should match testCategory with id CATEGORY_ID
            verify(transactionService).addExpense(eq(USER_ID), isNull(), eq(CATEGORY_ID),
                    eq("Groceries"), any(), any(), anyBoolean());
        }

        @Test
        @DisplayName("200 – rule pattern match assigns category override")
        void rulePatternAssignsCategory() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());
            when(transactionService.addExpense(any(), any(), any(), any(), any(), any(), anyBoolean()))
                    .thenReturn(testTransaction);

            String rules = objectMapper.writeValueAsString(List.of(
                    Map.of("pattern", "supermarket", "categoryId", CATEGORY_ID.toString())));

            String content = APP_HEADER + "2026-01-15,Supermarket,-30.00,\n";

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(csvFile(content))
                            .param("rules", rules)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(1)));

            verify(transactionService).addExpense(eq(USER_ID), isNull(), eq(CATEGORY_ID),
                    any(), any(), any(), anyBoolean());
        }

        @Test
        @DisplayName("200 – rule mappedName overrides transaction name")
        void ruleMappedNameOverridesName() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());
            when(transactionService.addExpense(any(), any(), any(), any(), any(), any(), anyBoolean()))
                    .thenReturn(testTransaction);

            String rules = objectMapper.writeValueAsString(List.of(
                    Map.of("pattern", "amzn", "mappedName", "Amazon")));

            String content = APP_HEADER + "2026-01-15,AMZN*MARKETPLACE,-25.00,\n";

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(csvFile(content))
                            .param("rules", rules)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(1)));

            verify(transactionService).addExpense(eq(USER_ID), isNull(), isNull(),
                    eq("Amazon"), any(), any(), anyBoolean());
        }

        @Test
        @DisplayName("200 – rule transactionType=EXPENSE skips income row")
        void ruleTypeExpenseSkipsIncome() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());
            when(transactionService.addIncome(any(), any(), any(), any(), any(), any(), anyBoolean()))
                    .thenReturn(testTransaction);

            String rules = objectMapper.writeValueAsString(List.of(
                    Map.of("pattern", "salary", "transactionType", "EXPENSE",
                            "categoryId", CATEGORY_ID.toString())));

            // Row is income (positive amount) — rule should be skipped
            String content = APP_HEADER + "2026-01-15,Salary,3000.00,\n";

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(csvFile(content))
                            .param("rules", rules)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(1)));

            // Category should NOT be applied (rule was skipped)
            verify(transactionService).addIncome(eq(USER_ID), isNull(), isNull(),
                    eq("Salary"), any(), any(), anyBoolean());
        }

        @Test
        @DisplayName("200 – rule transactionType=INCOME skips expense row")
        void ruleTypeIncomeSkipsExpense() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());
            when(transactionService.addExpense(any(), any(), any(), any(), any(), any(), anyBoolean()))
                    .thenReturn(testTransaction);

            String rules = objectMapper.writeValueAsString(List.of(
                    Map.of("pattern", "amzn", "transactionType", "INCOME",
                            "categoryId", CATEGORY_ID.toString())));

            // Row is expense (negative amount) — rule should be skipped
            String content = APP_HEADER + "2026-01-15,AMZN*MARKETPLACE,-25.00,\n";

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(csvFile(content))
                            .param("rules", rules)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(1)));

            // Category should NOT be applied (rule was skipped)
            verify(transactionService).addExpense(eq(USER_ID), isNull(), isNull(),
                    eq("AMZN*MARKETPLACE"), any(), any(), anyBoolean());
        }

        @Test
        @DisplayName("200 – rule transactionType=EXPENSE applies to matching expense row")
        void ruleTypeExpenseAppliesCorrectly() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());
            when(transactionService.addExpense(any(), any(), any(), any(), any(), any(), anyBoolean()))
                    .thenReturn(testTransaction);

            String rules = objectMapper.writeValueAsString(List.of(
                    Map.of("pattern", "cafe", "transactionType", "EXPENSE",
                            "categoryId", CATEGORY_ID.toString())));

            String content = APP_HEADER + "2026-01-15,Starbucks Cafe,-5.00,\n";

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(csvFile(content))
                            .param("rules", rules)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(1)));

            verify(transactionService).addExpense(eq(USER_ID), isNull(), eq(CATEGORY_ID),
                    eq("Starbucks Cafe"), any(), any(), anyBoolean());
        }

        @Test
        @DisplayName("200 – invalid rules JSON is ignored gracefully")
        void invalidRulesJsonIgnored() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());
            when(transactionService.addExpense(any(), any(), any(), any(), any(), any(), anyBoolean()))
                    .thenReturn(testTransaction);

            String content = APP_HEADER + "2026-01-15,Coffee,-3.00,\n";

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(csvFile(content))
                            .param("rules", "NOT_VALID_JSON{{{")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(1)));
        }

        @Test
        @DisplayName("200 – mixed valid and invalid rows: correct count")
        void mixedValidAndInvalidRows() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());
            when(transactionService.addExpense(any(), any(), any(), any(), any(), any(), anyBoolean()))
                    .thenReturn(testTransaction);

            // 3 rows: 2 valid, 1 invalid amount
            String content = APP_HEADER
                    + "2026-01-01,Coffee,-3.00,\n"
                    + "2026-01-02,Lunch,INVALID,\n"
                    + "2026-01-03,Dinner,-15.00,\n";

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(csvFile(content))
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(2)))
                    .andExpect(jsonPath("$.skipped", is(1)));
        }

        @Test
        @DisplayName("200 – row with empty name is skipped")
        void emptyNameSkipped() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());

            String content = APP_HEADER + "2026-01-15,,-30.00,\n";

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(csvFile(content))
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.skipped", is(1)))
                    .andExpect(jsonPath("$.imported", is(0)));
        }

        @Test
        @DisplayName("200 – with accountId param: transactions linked to account")
        void withAccountId() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());
            when(transactionService.addExpense(any(), any(), any(), any(), any(), any(), anyBoolean()))
                    .thenReturn(testTransaction);

            String content = APP_HEADER + "2026-01-15,Coffee,-3.00,\n";

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(csvFile(content))
                            .param("accountId", ACCOUNT_ID.toString())
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(1)));

            verify(transactionService).addExpense(eq(USER_ID), eq(ACCOUNT_ID), isNull(),
                    any(), any(), any(), anyBoolean());
        }

        @Test
        @DisplayName("200 – dd/MM/yyyy date format is parsed correctly")
        void ddMMyyyyDateFormat() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());
            when(transactionService.addExpense(any(), any(), any(), any(), any(), any(), anyBoolean()))
                    .thenReturn(testTransaction);

            String content = APP_HEADER + "15/06/2025,Test,-10.00,\n";

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(csvFile(content))
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(1)));

            verify(transactionService).addExpense(any(), any(), any(), any(),
                    any(), eq(LocalDate.of(2025, 6, 15)), anyBoolean());
        }

        @Test
        @DisplayName("200 – zero amount row: imported as income (zero is positive)")
        void zeroAmountRow() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());
            when(transactionService.addIncome(any(), any(), any(), any(), any(), any(), anyBoolean()))
                    .thenReturn(testTransaction);

            String content = APP_HEADER + "2026-01-15,Free item,0.00,\n";

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(csvFile(content))
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(1)));

            // 0 is not < 0 so it becomes INCOME
            verify(transactionService).addIncome(any(), any(), any(), any(), any(), any(), anyBoolean());
        }

        @Test
        @DisplayName("200 – pattern match is case-insensitive")
        void patternMatchCaseInsensitive() throws Exception {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());
            when(transactionService.addExpense(any(), any(), any(), any(), any(), any(), anyBoolean()))
                    .thenReturn(testTransaction);

            // Pattern "AMAZON" should match "amazon marketplace" (case-insensitive)
            String rules = objectMapper.writeValueAsString(List.of(
                    Map.of("pattern", "AMAZON", "categoryId", CATEGORY_ID.toString())));

            String content = APP_HEADER + "2026-01-15,amazon marketplace,-20.00,\n";

            mockMvc.perform(MockMvcRequestBuilders.multipart("/transaction/import/csv")
                            .file(csvFile(content))
                            .param("rules", rules)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(1)));

            verify(transactionService).addExpense(eq(USER_ID), isNull(), eq(CATEGORY_ID),
                    any(), any(), any(), anyBoolean());
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
