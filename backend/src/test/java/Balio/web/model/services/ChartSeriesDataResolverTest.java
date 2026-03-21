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
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link ChartSeriesDataResolver}.
 * Validates groupBy keys, metrics (SUM/COUNT/AVG/NET), STACKED_BAR split, and guard clauses.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ChartSeriesDataResolver")
class ChartSeriesDataResolverTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final int MAX_POINTS = 10;

    @Mock private WidgetFilterEngine filterEngine;

    private ChartSeriesDataResolver resolver;
    private final ObjectMapper mapper = new ObjectMapper();

    private User user;
    private Account account;
    private Category catFood;
    private Category catTransport;

    @BeforeEach
    void setUp() {
        resolver = new ChartSeriesDataResolver(filterEngine, mapper, MAX_POINTS);
        user = new User("U", "u@t.com", "pwd");
        account = new Account("Main", AccountType.BANK, "EUR", BigDecimal.ZERO, user);
        catFood = new Category("Food", TransactionType.EXPENSE, user);
        catTransport = new Category("Transport", TransactionType.EXPENSE, user);
        setFieldViaReflection(account, "id", UUID.randomUUID());
        setFieldViaReflection(catFood, "id", UUID.randomUUID());
        setFieldViaReflection(catTransport, "id", UUID.randomUUID());
    }

    /* ── helpers ─────────────────────────────────────────────── */

    private Transaction expense(String name, String amount, Category cat) {
        Transaction t = new Transaction(name, new BigDecimal(amount), LocalDate.now(), TransactionType.EXPENSE, user);
        t.setCategory(cat);
        t.setAccount(account);
        return t;
    }

    private Transaction income(String name, String amount) {
        Transaction t = new Transaction(name, new BigDecimal(amount), LocalDate.now(), TransactionType.INCOME, user);
        t.setAccount(account);
        return t;
    }

    private JsonNode config(String groupBy, String metric) {
        ObjectNode node = mapper.createObjectNode();
        if (groupBy != null) {
            node.put("groupBy", groupBy);
        }
        if (metric != null) {
            node.put("metric", metric);
        }
        return node;
    }

    /* ════════════════════════════════════════════════════════════
     *  supports()
     * ════════════════════════════════════════════════════════════ */

    @Test
    @DisplayName("supports WidgetType.CHART")
    void shouldSupportChartType() {
        assertEquals(WidgetType.CHART, resolver.supports());
    }

    /* ════════════════════════════════════════════════════════════
     *  Guard clauses
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("Chart type guard")
    class GuardTests {

        @Test
        @DisplayName("throws ChartWidgetInvalidException for KPI_CARD chart type")
        void shouldThrow_forKpiCard() {
            assertThrows(ChartWidgetInvalidException.class, () ->
                    resolver.resolve(USER_ID, WidgetChartType.KPI_CARD, config(null, null)));
        }

        @Test
        @DisplayName("throws ChartWidgetInvalidException for SUMMARY_TABLE chart type")
        void shouldThrow_forSummaryTable() {
            assertThrows(ChartWidgetInvalidException.class, () ->
                    resolver.resolve(USER_ID, WidgetChartType.SUMMARY_TABLE, config(null, null)));
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  CATEGORY groupBy (default)
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("GroupBy CATEGORY")
    class GroupByCategoryTests {

        @Test
        @DisplayName("aggregates SUM by category name")
        void shouldAggregateSumByCategory() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any())).thenReturn(List.of(
                    expense("A", "100", catFood),
                    expense("B", "50", catFood),
                    expense("C", "200", catTransport)));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.BAR, config("CATEGORY", "SUM"));

            JsonNode labels = result.get("labels");
            assertEquals(2, labels.size());
            assertEquals("labels", "labels");
            // Transport 200 > Food 150, sorted desc
            assertEquals("Transport", labels.get(0).asText());
            assertEquals("Food", labels.get(1).asText());
        }

        @Test
        @DisplayName("groups transaction with null category under 'Uncategorized'")
        void shouldGroupNullCategoryAsUncategorized() {
            Transaction t = new Transaction("X", new BigDecimal("50"), LocalDate.now(), TransactionType.EXPENSE, user);
            // category intentionally null
            when(filterEngine.resolveTransactions(eq(USER_ID), any())).thenReturn(List.of(t));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.BAR, config("CATEGORY", "SUM"));

            assertEquals("Uncategorized", result.get("labels").get(0).asText());
        }

        @Test
        @DisplayName("returns empty labels when no transactions")
        void shouldReturnEmpty_whenNoTransactions() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any())).thenReturn(List.of());

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.BAR, config("CATEGORY", "SUM"));

            assertEquals(0, result.get("labels").size());
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  ACCOUNT groupBy
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("GroupBy ACCOUNT")
    class GroupByAccountTests {

        @Test
        @DisplayName("aggregates by account name")
        void shouldAggregateByAccount() {
            Account other = new Account("Savings", AccountType.BANK, "EUR", BigDecimal.ZERO, user);
            Transaction t1 = new Transaction("A", new BigDecimal("100"), LocalDate.now(), TransactionType.EXPENSE, user);
            t1.setAccount(account);
            Transaction t2 = new Transaction("B", new BigDecimal("200"), LocalDate.now(), TransactionType.EXPENSE, user);
            t2.setAccount(other);
            when(filterEngine.resolveTransactions(eq(USER_ID), any())).thenReturn(List.of(t1, t2));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.BAR, config("ACCOUNT", "SUM"));

            assertEquals(2, result.get("labels").size());
        }

        @Test
        @DisplayName("groups null account as 'No account'")
        void shouldGroupNullAccountAsNoAccount() {
            Transaction t = new Transaction("X", new BigDecimal("10"), LocalDate.now(), TransactionType.EXPENSE, user);
            // account intentionally null
            when(filterEngine.resolveTransactions(eq(USER_ID), any())).thenReturn(List.of(t));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.BAR, config("ACCOUNT", "SUM"));

            assertEquals("No account", result.get("labels").get(0).asText());
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  MONTH groupBy
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("GroupBy MONTH")
    class GroupByMonthTests {

        @Test
        @DisplayName("groups transactions by YYYY-MM key")
        void shouldGroupByMonth() {
            Transaction t1 = new Transaction("Jan1", new BigDecimal("100"), LocalDate.of(2025, 1, 10), TransactionType.EXPENSE, user);
            Transaction t2 = new Transaction("Jan2", new BigDecimal("50"), LocalDate.of(2025, 1, 25), TransactionType.EXPENSE, user);
            Transaction t3 = new Transaction("Feb1", new BigDecimal("200"), LocalDate.of(2025, 2, 5), TransactionType.EXPENSE, user);
            when(filterEngine.resolveTransactions(eq(USER_ID), any())).thenReturn(List.of(t1, t2, t3));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.LINE, config("MONTH", "SUM"));

            assertEquals(2, result.get("labels").size());
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  Metrics
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("Metrics")
    class MetricTests {

        @Test
        @DisplayName("COUNT metric counts transactions per group")
        void shouldCountTransactions() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any())).thenReturn(List.of(
                    expense("A", "10", catFood),
                    expense("B", "20", catFood),
                    expense("C", "30", catTransport)));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.BAR, config("CATEGORY", "COUNT"));

            JsonNode data = result.get("datasets").get(0).get("data");
            // food count=2, transport count=1, sorted desc
            assertEquals(new BigDecimal("2"), data.get(0).decimalValue());
            assertEquals(new BigDecimal("1"), data.get(1).decimalValue());
        }

        @Test
        @DisplayName("NET metric uses signed amount (income positive, expense negative)")
        void shouldUseSignedAmountForNet() {
            Transaction t1 = new Transaction("Salary", new BigDecimal("3000"), LocalDate.now(), TransactionType.INCOME, user);
            Transaction t2 = new Transaction("Rent", new BigDecimal("1000"), LocalDate.now(), TransactionType.EXPENSE, user);
            t1.setCategory(catFood);
            t2.setCategory(catFood);
            when(filterEngine.resolveTransactions(eq(USER_ID), any())).thenReturn(List.of(t1, t2));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.LINE, config("CATEGORY", "NET"));

            // Food net: +3000 - 1000 = 2000
            BigDecimal netValue = result.get("datasets").get(0).get("data").get(0).decimalValue();
            assertEquals(new BigDecimal("2000"), netValue);
        }

        @Test
        @DisplayName("AVG metric divides sum by count per group")
        void shouldCalculateAvgPerGroup() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any())).thenReturn(List.of(
                    expense("A", "100", catFood),
                    expense("B", "200", catFood)));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.BAR, config("CATEGORY", "AVG"));

            BigDecimal avg = result.get("datasets").get(0).get("data").get(0).decimalValue();
            assertEquals(new BigDecimal("150.00"), avg);
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  STACKED_BAR
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("STACKED_BAR")
    class StackedBarTests {

        @Test
        @DisplayName("returns two datasets: INCOME and EXPENSE")
        void shouldReturnTwoDatasets() {
            Transaction t1 = new Transaction("Sal", new BigDecimal("2000"), LocalDate.of(2025, 6, 1), TransactionType.INCOME, user);
            Transaction t2 = new Transaction("Rent", new BigDecimal("800"), LocalDate.of(2025, 6, 5), TransactionType.EXPENSE, user);
            when(filterEngine.resolveTransactions(eq(USER_ID), any())).thenReturn(List.of(t1, t2));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.STACKED_BAR, config("MONTH", "SUM"));

            JsonNode datasets = result.get("datasets");
            assertEquals(2, datasets.size());
            assertEquals("INCOME", datasets.get(0).get("label").asText());
            assertEquals("EXPENSE", datasets.get(1).get("label").asText());
        }

        @Test
        @DisplayName("datasets contain zero for missing type in a period")
        void shouldIncludeZeroForMissingType() {
            Transaction t = new Transaction("Rent", new BigDecimal("500"), LocalDate.of(2025, 6, 1), TransactionType.EXPENSE, user);
            when(filterEngine.resolveTransactions(eq(USER_ID), any())).thenReturn(List.of(t));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.STACKED_BAR, config("MONTH", "SUM"));

            JsonNode incomeData = result.get("datasets").get(0).get("data");
            assertEquals(new BigDecimal("0"), incomeData.get(0).decimalValue());
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  maxPoints limit
     * ════════════════════════════════════════════════════════════ */

    @Test
    @DisplayName("limits output to maxPoints entries")
    void shouldRespectMaxPoints() {
        // Create MAX_POINTS + 5 distinct categories
        List<Transaction> manyTxs = new java.util.ArrayList<>();
        for (int i = 0; i < MAX_POINTS + 5; i++) {
            Category cat = new Category("Cat" + i, TransactionType.EXPENSE, user);
            setFieldViaReflection(cat, "id", UUID.randomUUID());
            Transaction t = new Transaction("T" + i, new BigDecimal(i + 1), LocalDate.now(), TransactionType.EXPENSE, user);
            t.setCategory(cat);
            manyTxs.add(t);
        }
        when(filterEngine.resolveTransactions(eq(USER_ID), any())).thenReturn(manyTxs);

        JsonNode result = resolver.resolve(USER_ID, WidgetChartType.BAR, config("CATEGORY", "SUM"));

        assertTrue(result.get("labels").size() <= MAX_POINTS);
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
