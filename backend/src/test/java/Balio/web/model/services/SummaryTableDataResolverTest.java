package Balio.web.model.services;

import Balio.web.enums.AccountType;
import Balio.web.enums.TransactionType;
import Balio.web.enums.WidgetChartType;
import Balio.web.enums.WidgetType;
import Balio.web.model.Exceptions.ChartWidgetInvalidException;
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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link SummaryTableDataResolver}.
 * Validates row structure, sorting, null fields, chart type guard, and maxRows capping.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("SummaryTableDataResolver")
class SummaryTableDataResolverTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final int MAX_ROWS = 5;

    @Mock private WidgetFilterEngine filterEngine;

    private SummaryTableDataResolver resolver;
    private final ObjectMapper mapper = new ObjectMapper();

    private User user;
    private Account account;
    private Category catFood;

    @BeforeEach
    void setUp() {
        resolver = new SummaryTableDataResolver(filterEngine, mapper, MAX_ROWS);
        user = new User("U", "u@t.com", "pwd");
        account = new Account("Main", AccountType.BANK, "EUR", BigDecimal.ZERO, user);
        catFood = new Category("Food", TransactionType.EXPENSE, user);
        setFieldViaReflection(account, "id", UUID.randomUUID());
        setFieldViaReflection(catFood, "id", UUID.randomUUID());
    }

    /* ── helpers ─────────────────────────────────────────────── */

    private Transaction tx(String name, String amount, LocalDate date, TransactionType type) {
        Transaction t = new Transaction(name, new BigDecimal(amount), date, type, user);
        setFieldViaReflection(t, "id", UUID.randomUUID());
        t.setAccount(account);
        t.setCategory(catFood);
        return t;
    }

    private JsonNode emptyConfig() {
        return mapper.createObjectNode();
    }

    /* ════════════════════════════════════════════════════════════
     *  supports()
     * ════════════════════════════════════════════════════════════ */

    @Test
    @DisplayName("supports WidgetType.TABLE")
    void shouldSupportTableType() {
        assertEquals(WidgetType.TABLE, resolver.supports());
    }

    /* ════════════════════════════════════════════════════════════
     *  Chart type guard
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("Chart type guard")
    class ChartTypeGuardTests {

        @Test
        @DisplayName("throws ChartWidgetInvalidException for BAR chart type")
        void shouldThrow_forBar() {
            assertThrows(ChartWidgetInvalidException.class, () ->
                    resolver.resolve(USER_ID, WidgetChartType.BAR, emptyConfig()));
        }

        @Test
        @DisplayName("throws ChartWidgetInvalidException for LINE chart type")
        void shouldThrow_forLine() {
            assertThrows(ChartWidgetInvalidException.class, () ->
                    resolver.resolve(USER_ID, WidgetChartType.LINE, emptyConfig()));
        }

        @Test
        @DisplayName("throws ChartWidgetInvalidException for KPI_CARD chart type")
        void shouldThrow_forKpiCard() {
            assertThrows(ChartWidgetInvalidException.class, () ->
                    resolver.resolve(USER_ID, WidgetChartType.KPI_CARD, emptyConfig()));
        }

        @Test
        @DisplayName("throws ChartWidgetInvalidException for STACKED_BAR chart type")
        void shouldThrow_forStackedBar() {
            assertThrows(ChartWidgetInvalidException.class, () ->
                    resolver.resolve(USER_ID, WidgetChartType.STACKED_BAR, emptyConfig()));
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  Empty transactions
     * ════════════════════════════════════════════════════════════ */

    @Test
    @DisplayName("returns empty rows and zero totals when no transactions")
    void shouldReturnEmpty_whenNoTransactions() {
        when(filterEngine.resolveTransactions(eq(USER_ID), any())).thenReturn(List.of());

        JsonNode result = resolver.resolve(USER_ID, WidgetChartType.SUMMARY_TABLE, emptyConfig());

        assertEquals(0, result.get("rows").size());
        assertEquals(0, result.get("rowCount").asInt());
        assertEquals(new BigDecimal("0"), result.get("totalAmount").decimalValue());
    }

    /* ════════════════════════════════════════════════════════════
     *  Row structure
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("Row structure")
    class RowStructureTests {

        @Test
        @DisplayName("each row contains id, name, amount, date, type, account, category")
        void shouldContainExpectedFields() {
            Transaction t = tx("Groceries", "45.50", LocalDate.of(2025, 3, 1), TransactionType.EXPENSE);
            when(filterEngine.resolveTransactions(eq(USER_ID), any())).thenReturn(List.of(t));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.SUMMARY_TABLE, emptyConfig());

            JsonNode row = result.get("rows").get(0);
            assertNotNull(row.get("id"));
            assertEquals("Groceries", row.get("name").asText());
            assertEquals(new BigDecimal("45.50"), row.get("amount").decimalValue());
            assertEquals("2025-03-01", row.get("date").asText());
            assertEquals("EXPENSE", row.get("type").asText());
            assertEquals("Main", row.get("account").asText());
            assertEquals("Food", row.get("category").asText());
        }

        @Test
        @DisplayName("null account renders as null in row")
        void shouldHandleNullAccount() {
            Transaction t = new Transaction("X", new BigDecimal("10"), LocalDate.now(), TransactionType.EXPENSE, user);
            setFieldViaReflection(t, "id", UUID.randomUUID());
            // account intentionally null
            when(filterEngine.resolveTransactions(eq(USER_ID), any())).thenReturn(List.of(t));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.SUMMARY_TABLE, emptyConfig());

            assertTrue(result.get("rows").get(0).get("account").isNull());
        }

        @Test
        @DisplayName("null category renders as null in row")
        void shouldHandleNullCategory() {
            Transaction t = new Transaction("Y", new BigDecimal("20"), LocalDate.now(), TransactionType.INCOME, user);
            setFieldViaReflection(t, "id", UUID.randomUUID());
            t.setAccount(account);
            // category intentionally null
            when(filterEngine.resolveTransactions(eq(USER_ID), any())).thenReturn(List.of(t));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.SUMMARY_TABLE, emptyConfig());

            assertTrue(result.get("rows").get(0).get("category").isNull());
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  Sorting
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("Sorting")
    class SortingTests {

        @Test
        @DisplayName("rows are sorted by date descending (most recent first)")
        void shouldSortByDateDescending() {
            Transaction old = tx("Old", "100", LocalDate.of(2025, 1, 1), TransactionType.EXPENSE);
            Transaction middle = tx("Middle", "200", LocalDate.of(2025, 6, 15), TransactionType.EXPENSE);
            Transaction recent = tx("Recent", "300", LocalDate.of(2025, 12, 31), TransactionType.EXPENSE);
            // Intentionally provided in non-sorted order
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(old, recent, middle));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.SUMMARY_TABLE, emptyConfig());

            JsonNode rows = result.get("rows");
            assertEquals("Recent", rows.get(0).get("name").asText());
            assertEquals("Middle", rows.get(1).get("name").asText());
            assertEquals("Old", rows.get(2).get("name").asText());
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  maxRows limit
     * ════════════════════════════════════════════════════════════ */

    @Test
    @DisplayName("limits rows to maxRows when more transactions exist")
    void shouldRespectMaxRows() {
        List<Transaction> many = new ArrayList<>();
        for (int i = 0; i < MAX_ROWS + 3; i++) {
            Transaction t = tx("T" + i, String.valueOf(i + 1),
                    LocalDate.of(2025, 1, 1).plusDays(i), TransactionType.EXPENSE);
            many.add(t);
        }
        when(filterEngine.resolveTransactions(eq(USER_ID), any())).thenReturn(many);

        JsonNode result = resolver.resolve(USER_ID, WidgetChartType.SUMMARY_TABLE, emptyConfig());

        assertTrue(result.get("rows").size() <= MAX_ROWS);
        assertEquals(MAX_ROWS, result.get("rowCount").asInt());
    }

    /* ════════════════════════════════════════════════════════════
     *  totalAmount
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("totalAmount")
    class TotalAmountTests {

        @Test
        @DisplayName("sums amounts of all returned rows")
        void shouldSumAllAmounts() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any())).thenReturn(List.of(
                    tx("A", "100", LocalDate.of(2025, 1, 1), TransactionType.EXPENSE),
                    tx("B", "250", LocalDate.of(2025, 1, 2), TransactionType.INCOME)));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.SUMMARY_TABLE, emptyConfig());

            assertEquals(new BigDecimal("350"), result.get("totalAmount").decimalValue());
        }

        @Test
        @DisplayName("totalAmount reflects only capped rows when maxRows exceeded")
        void shouldSumOnlyCappedRows() {
            // 8 transactions of value 10 each, but maxRows=5 → total should be 50 (after sorting, top 5 by date)
            List<Transaction> many = new ArrayList<>();
            for (int i = 0; i < MAX_ROWS + 3; i++) {
                many.add(tx("T" + i, "10", LocalDate.of(2025, 1, 1).plusDays(i), TransactionType.EXPENSE));
            }
            when(filterEngine.resolveTransactions(eq(USER_ID), any())).thenReturn(many);

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.SUMMARY_TABLE, emptyConfig());

            assertEquals(new BigDecimal("50"), result.get("totalAmount").decimalValue());
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  maxRows metadata field
     * ════════════════════════════════════════════════════════════ */

    @Test
    @DisplayName("response includes maxRows metadata field")
    void shouldIncludeMaxRowsField() {
        when(filterEngine.resolveTransactions(eq(USER_ID), any())).thenReturn(List.of());

        JsonNode result = resolver.resolve(USER_ID, WidgetChartType.SUMMARY_TABLE, emptyConfig());

        assertEquals(MAX_ROWS, result.get("maxRows").asInt());
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
