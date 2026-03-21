package Balio.web.model.services;

import Balio.web.enums.AccountType;
import Balio.web.enums.TransactionType;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.Category;
import Balio.web.model.entities.Transaction;
import Balio.web.model.entities.User;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link WidgetFilterEngine}.
 * Validates JSON filter parsing, TransactionService delegation, and in-memory post-filters.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("WidgetFilterEngine")
class WidgetFilterEngineTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID ACCOUNT_ID = UUID.randomUUID();
    private static final UUID CATEGORY_ID_A = UUID.randomUUID();
    private static final UUID CATEGORY_ID_B = UUID.randomUUID();

    @Mock private TransactionService transactionService;

    private WidgetFilterEngine engine;
    private final ObjectMapper mapper = new ObjectMapper();

    private User user;
    private Account account;
    private Category catA;
    private Category catB;

    @BeforeEach
    void setUp() {
        engine = new WidgetFilterEngine(transactionService);
        user = new User("Test", "t@t.com", "pwd");
        setFieldViaReflection(user, "id", USER_ID);

        account = new Account("Bank", AccountType.BANK, "EUR", BigDecimal.ZERO, user);
        setFieldViaReflection(account, "id", ACCOUNT_ID);

        catA = new Category("Food", TransactionType.EXPENSE, user);
        setFieldViaReflection(catA, "id", CATEGORY_ID_A);

        catB = new Category("Transport", TransactionType.EXPENSE, user);
        setFieldViaReflection(catB, "id", CATEGORY_ID_B);
    }

    /* ── helpers to build transactions ─────────────────────────── */

    private Transaction tx(String name, BigDecimal amount, TransactionType type, LocalDate date) {
        Transaction t = new Transaction(name, amount, date, type, user);
        t.setAccount(account);
        return t;
    }

    private Transaction txWithCategory(String name, BigDecimal amount,
                                        TransactionType type, LocalDate date, Category cat) {
        Transaction t = tx(name, amount, type, date);
        t.setCategory(cat);
        return t;
    }

    /* ── helpers to build configs ───────────────────────────────── */

    private JsonNode noFilter() {
        return mapper.createObjectNode();
    }

    private ObjectNode filterNode(ObjectNode root) {
        ObjectNode f = mapper.createObjectNode();
        root.set("filter", f);
        return f;
    }

    /* ════════════════════════════════════════════════════════════
     *  No filter / null config
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("No filter")
    class NoFilterTests {

        @Test
        @DisplayName("returns all transactions when configuration has no filter node")
        void shouldReturnAll_whenNoFilterNode() {
            List<Transaction> all = List.of(
                    tx("Groceries", new BigDecimal("30"), TransactionType.EXPENSE, LocalDate.now()),
                    tx("Salary", new BigDecimal("2000"), TransactionType.INCOME, LocalDate.now()));
            when(transactionService.findFiltered(
                    eq(USER_ID), isNull(), isNull(), isNull(), isNull(), isNull()))
                    .thenReturn(all);

            List<Transaction> result = engine.resolveTransactions(USER_ID, noFilter());

            assertEquals(2, result.size());
        }

        @Test
        @DisplayName("returns all transactions when configuration is null")
        void shouldReturnAll_whenConfigNull() {
            List<Transaction> all = List.of(tx("X", BigDecimal.ONE, TransactionType.EXPENSE, LocalDate.now()));
            when(transactionService.findFiltered(
                    eq(USER_ID), isNull(), isNull(), isNull(), isNull(), isNull()))
                    .thenReturn(all);

            List<Transaction> result = engine.resolveTransactions(USER_ID, null);

            assertEquals(1, result.size());
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  Type filter
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("Type filter")
    class TypeFilterTests {

        @Test
        @DisplayName("passes EXPENSE type to findFiltered")
        void shouldPassExpenseType() {
            ObjectNode root = mapper.createObjectNode();
            filterNode(root).put("type", "EXPENSE");
            when(transactionService.findFiltered(
                    eq(USER_ID), eq(TransactionType.EXPENSE), any(), any(), any(), any()))
                    .thenReturn(List.of());

            List<Transaction> result = engine.resolveTransactions(USER_ID, root);

            assertEquals(0, result.size());
        }

        @Test
        @DisplayName("passes INCOME type to findFiltered")
        void shouldPassIncomeType() {
            ObjectNode root = mapper.createObjectNode();
            filterNode(root).put("type", "INCOME");
            when(transactionService.findFiltered(
                    eq(USER_ID), eq(TransactionType.INCOME), any(), any(), any(), any()))
                    .thenReturn(List.of());

            engine.resolveTransactions(USER_ID, root);
        }

        @Test
        @DisplayName("throws IllegalArgumentException for unknown type value")
        void shouldThrow_whenUnknownType() {
            ObjectNode root = mapper.createObjectNode();
            filterNode(root).put("type", "INVALID_TYPE");

            assertThrows(IllegalArgumentException.class, () ->
                    engine.resolveTransactions(USER_ID, root));
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  Account filter
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("Account filter")
    class AccountFilterTests {

        @Test
        @DisplayName("passes accountId to findFiltered")
        void shouldPassAccountId() {
            ObjectNode root = mapper.createObjectNode();
            filterNode(root).put("accountId", ACCOUNT_ID.toString());
            when(transactionService.findFiltered(
                    eq(USER_ID), isNull(), eq(ACCOUNT_ID), isNull(), isNull(), isNull()))
                    .thenReturn(List.of());

            engine.resolveTransactions(USER_ID, root);
        }

        @Test
        @DisplayName("throws IllegalArgumentException for malformed accountId UUID")
        void shouldThrow_whenAccountIdMalformed() {
            ObjectNode root = mapper.createObjectNode();
            filterNode(root).put("accountId", "not-a-uuid");

            assertThrows(IllegalArgumentException.class, () ->
                    engine.resolveTransactions(USER_ID, root));
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  Category filter
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("Category filter")
    class CategoryFilterTests {

        @Test
        @DisplayName("single categoryId is passed to findFiltered and used as in-memory filter")
        void shouldFilterBySingleCategory() {
            ObjectNode root = mapper.createObjectNode();
            filterNode(root).put("categoryId", CATEGORY_ID_A.toString());

            Transaction matching = txWithCategory("Rent", new BigDecimal("800"),
                    TransactionType.EXPENSE, LocalDate.now(), catA);
            Transaction other = txWithCategory("Train", new BigDecimal("10"),
                    TransactionType.EXPENSE, LocalDate.now(), catB);

            when(transactionService.findFiltered(
                    eq(USER_ID), isNull(), isNull(), eq(CATEGORY_ID_A), isNull(), isNull()))
                    .thenReturn(List.of(matching, other));

            List<Transaction> result = engine.resolveTransactions(USER_ID, root);

            // in-memory filter retains only transactions matching the categoryId
            assertEquals(1, result.size());
            assertEquals("Rent", result.get(0).getName());
        }

        @Test
        @DisplayName("categoryIds array is applied as in-memory multi-filter")
        void shouldFilterByMultipleCategories() {
            ObjectNode root = mapper.createObjectNode();
            ObjectNode f = filterNode(root);
            f.putArray("categoryIds")
                    .add(CATEGORY_ID_A.toString())
                    .add(CATEGORY_ID_B.toString());

            Transaction t1 = txWithCategory("Groceries", BigDecimal.TEN, TransactionType.EXPENSE, LocalDate.now(), catA);
            Transaction t2 = txWithCategory("Train", BigDecimal.TEN, TransactionType.EXPENSE, LocalDate.now(), catB);
            Transaction t3 = tx("Salary", new BigDecimal("2000"), TransactionType.INCOME, LocalDate.now());

            when(transactionService.findFiltered(any(), any(), any(), any(), any(), any()))
                    .thenReturn(List.of(t1, t2, t3));

            List<Transaction> result = engine.resolveTransactions(USER_ID, root);

            assertEquals(2, result.size());
        }

        @Test
        @DisplayName("empty categoryIds array applies no category in-memory filter")
        void shouldNotFilter_whenCategoryIdsEmpty() {
            ObjectNode root = mapper.createObjectNode();
            filterNode(root).putArray("categoryIds"); // empty array

            List<Transaction> all = List.of(
                    tx("A", BigDecimal.ONE, TransactionType.EXPENSE, LocalDate.now()));
            when(transactionService.findFiltered(any(), any(), any(), isNull(), any(), any()))
                    .thenReturn(all);

            List<Transaction> result = engine.resolveTransactions(USER_ID, root);

            assertEquals(1, result.size());
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  Date filters
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("Date filters")
    class DateFilterTests {

        @Test
        @DisplayName("passes startDate and endDate to findFiltered")
        void shouldPassDateRange() {
            LocalDate start = LocalDate.of(2025, 1, 1);
            LocalDate end = LocalDate.of(2025, 12, 31);
            ObjectNode root = mapper.createObjectNode();
            ObjectNode f = filterNode(root);
            f.put("startDate", start.toString());
            f.put("endDate", end.toString());

            when(transactionService.findFiltered(
                    eq(USER_ID), isNull(), isNull(), isNull(), eq(start), eq(end)))
                    .thenReturn(List.of());

            engine.resolveTransactions(USER_ID, root);
        }

        @Test
        @DisplayName("applies specificDates in-memory post-filter")
        void shouldFilterBySpecificDates() {
            LocalDate targetDate = LocalDate.of(2025, 6, 15);
            LocalDate otherDate = LocalDate.of(2025, 6, 16);
            ObjectNode root = mapper.createObjectNode();
            filterNode(root).putArray("specificDates").add(targetDate.toString());

            Transaction on = tx("On target", BigDecimal.TEN, TransactionType.EXPENSE, targetDate);
            Transaction off = tx("Different", BigDecimal.TEN, TransactionType.EXPENSE, otherDate);

            when(transactionService.findFiltered(any(), any(), any(), any(), any(), any()))
                    .thenReturn(List.of(on, off));

            List<Transaction> result = engine.resolveTransactions(USER_ID, root);

            assertEquals(1, result.size());
            assertEquals("On target", result.get(0).getName());
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  In-memory post-filters
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("In-memory post-filters")
    class InMemoryFilterTests {

        @Test
        @DisplayName("nameQuery filter is case-insensitive")
        void shouldFilterByNameCaseInsensitive() {
            ObjectNode root = mapper.createObjectNode();
            filterNode(root).put("nameQuery", "AMAZON");

            Transaction matching = tx("amazon prime", BigDecimal.TEN, TransactionType.EXPENSE, LocalDate.now());
            Transaction notMatching = tx("Netflix", BigDecimal.TEN, TransactionType.EXPENSE, LocalDate.now());
            when(transactionService.findFiltered(any(), any(), any(), any(), any(), any()))
                    .thenReturn(List.of(matching, notMatching));

            List<Transaction> result = engine.resolveTransactions(USER_ID, root);

            assertEquals(1, result.size());
            assertEquals("amazon prime", result.get(0).getName());
        }

        @Test
        @DisplayName("amountMin filter excludes transactions below threshold")
        void shouldFilterByAmountMin() {
            ObjectNode root = mapper.createObjectNode();
            filterNode(root).put("amountMin", "100");

            Transaction big = tx("Big", new BigDecimal("150"), TransactionType.EXPENSE, LocalDate.now());
            Transaction small = tx("Small", new BigDecimal("50"), TransactionType.EXPENSE, LocalDate.now());
            when(transactionService.findFiltered(any(), any(), any(), any(), any(), any()))
                    .thenReturn(List.of(big, small));

            List<Transaction> result = engine.resolveTransactions(USER_ID, root);

            assertEquals(1, result.size());
            assertEquals("Big", result.get(0).getName());
        }

        @Test
        @DisplayName("amountMax filter excludes transactions above threshold")
        void shouldFilterByAmountMax() {
            ObjectNode root = mapper.createObjectNode();
            filterNode(root).put("amountMax", "99");

            Transaction big = tx("Big", new BigDecimal("150"), TransactionType.EXPENSE, LocalDate.now());
            Transaction small = tx("Small", new BigDecimal("50"), TransactionType.EXPENSE, LocalDate.now());
            when(transactionService.findFiltered(any(), any(), any(), any(), any(), any()))
                    .thenReturn(List.of(big, small));

            List<Transaction> result = engine.resolveTransactions(USER_ID, root);

            assertEquals(1, result.size());
            assertEquals("Small", result.get(0).getName());
        }

        @Test
        @DisplayName("blank nameQuery is ignored (not applied as filter)")
        void shouldIgnoreBlankNameQuery() {
            ObjectNode root = mapper.createObjectNode();
            filterNode(root).put("nameQuery", "   ");

            List<Transaction> all = List.of(
                    tx("Alpha", BigDecimal.ONE, TransactionType.EXPENSE, LocalDate.now()),
                    tx("Beta", BigDecimal.ONE, TransactionType.EXPENSE, LocalDate.now()));
            when(transactionService.findFiltered(any(), any(), any(), any(), any(), any()))
                    .thenReturn(all);

            List<Transaction> result = engine.resolveTransactions(USER_ID, root);

            assertEquals(2, result.size());
        }

        @Test
        @DisplayName("combined filters (nameQuery + amountMin) work together")
        void shouldApplyCombinedFilters() {
            ObjectNode root = mapper.createObjectNode();
            ObjectNode f = filterNode(root);
            f.put("nameQuery", "sub");
            f.put("amountMin", "10");

            Transaction good = tx("Subscription", new BigDecimal("15"), TransactionType.EXPENSE, LocalDate.now());
            Transaction wrongName = tx("Salary", new BigDecimal("100"), TransactionType.INCOME, LocalDate.now());
            Transaction wrongAmount = tx("Subzero", new BigDecimal("5"), TransactionType.EXPENSE, LocalDate.now());

            when(transactionService.findFiltered(any(), any(), any(), any(), any(), any()))
                    .thenReturn(List.of(good, wrongName, wrongAmount));

            List<Transaction> result = engine.resolveTransactions(USER_ID, root);

            assertEquals(1, result.size());
            assertEquals("Subscription", result.get(0).getName());
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
