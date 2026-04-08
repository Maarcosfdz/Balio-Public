package Balio.web.model.services;

import Balio.web.enums.TransactionType;
import Balio.web.enums.WidgetChartType;
import Balio.web.enums.WidgetType;
import Balio.web.model.Exceptions.ChartWidgetInvalidException;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.Category;
import Balio.web.model.entities.Transaction;
import Balio.web.model.entities.User;
import Balio.web.enums.AccountType;
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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link WidgetDataResolverService}.
 * Validates KPI computation, chart aggregation, table building,
 * and invalid widget/chartType combinations.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("WidgetDataResolverService")
class WidgetDataResolverServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();

    @Mock
    private WidgetFilterEngine filterEngine;

    private WidgetDataResolverService service;
    private final ObjectMapper mapper = new ObjectMapper();

    private User user;
    private Transaction income1;
    private Transaction income2;
    private Transaction expense1;
    private Transaction expense2;

    @BeforeEach
    void setUp() {
        service = new WidgetDataResolverService(filterEngine, mapper, 100, 200);
        user = new User("tester", "t@test.com", "pwd");

        income1 = new Transaction("Salary", new BigDecimal("3000"),
                LocalDate.of(2026, 3, 1), TransactionType.INCOME, user);
        income2 = new Transaction("Freelance", new BigDecimal("500"),
                LocalDate.of(2026, 3, 15), TransactionType.INCOME, user);
        expense1 = new Transaction("Rent", new BigDecimal("800"),
                LocalDate.of(2026, 3, 5), TransactionType.EXPENSE, user);
        expense2 = new Transaction("Food", new BigDecimal("200"),
                LocalDate.of(2026, 3, 10), TransactionType.EXPENSE, user);
    }

    private JsonNode emptyConfig() {
        return mapper.createObjectNode();
    }

    private static void setId(Object target, UUID id) {
        try {
            java.lang.reflect.Field f = target.getClass().getDeclaredField("id");
            f.setAccessible(true);
            f.set(target, id);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }

    // ── KPI ────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("KPI widget")
    class KpiTests {

        @Test
        @DisplayName("NET_BALANCE = income - expense")
        void shouldComputeNetBalance() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(income1, income2, expense1, expense2));
            ObjectNode config = mapper.createObjectNode();
            config.put("kpiType", "NET_BALANCE");

            JsonNode result = service.resolve(USER_ID, WidgetType.KPI, WidgetChartType.KPI_CARD, config);

            assertEquals("NET_BALANCE", result.get("kpiType").asText());
            assertEquals(0, new BigDecimal("2500").compareTo(result.get("value").decimalValue()));
            assertEquals(0, new BigDecimal("3500").compareTo(result.get("income").decimalValue()));
            assertEquals(0, new BigDecimal("1000").compareTo(result.get("expense").decimalValue()));
            assertEquals(4, result.get("transactionCount").asInt());
        }

        @Test
        @DisplayName("TOTAL_INCOME returns sum of incomes")
        void shouldComputeTotalIncome() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(income1, income2, expense1));
            ObjectNode config = mapper.createObjectNode();
            config.put("kpiType", "TOTAL_INCOME");

            JsonNode result = service.resolve(USER_ID, WidgetType.KPI, WidgetChartType.KPI_CARD, config);

            assertEquals(0, new BigDecimal("3500").compareTo(result.get("value").decimalValue()));
        }

        @Test
        @DisplayName("TOTAL_EXPENSE returns sum of expenses")
        void shouldComputeTotalExpense() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(income1, expense1, expense2));
            ObjectNode config = mapper.createObjectNode();
            config.put("kpiType", "TOTAL_EXPENSE");

            JsonNode result = service.resolve(USER_ID, WidgetType.KPI, WidgetChartType.KPI_CARD, config);

            assertEquals(0, new BigDecimal("1000").compareTo(result.get("value").decimalValue()));
        }

        @Test
        @DisplayName("AVG_EXPENSE returns average expense amount")
        void shouldComputeAvgExpense() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(expense1, expense2));
            ObjectNode config = mapper.createObjectNode();
            config.put("kpiType", "AVG_EXPENSE");

            JsonNode result = service.resolve(USER_ID, WidgetType.KPI, WidgetChartType.KPI_CARD, config);

            // (800 + 200) / 2 = 500.00
            assertEquals(new BigDecimal("500.00"),
                    result.get("value").decimalValue());
        }

        @Test
        @DisplayName("AVG_EXPENSE returns 0 when no expenses")
        void shouldReturnZeroAvgExpenseWhenNoExpenses() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(income1));
            ObjectNode config = mapper.createObjectNode();
            config.put("kpiType", "AVG_EXPENSE");

            JsonNode result = service.resolve(USER_ID, WidgetType.KPI, WidgetChartType.KPI_CARD, config);

            assertEquals(0, result.get("value").asInt());
        }

        @Test
        @DisplayName("TX_COUNT returns total number of transactions")
        void shouldComputeTxCount() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(income1, expense1, expense2));
            ObjectNode config = mapper.createObjectNode();
            config.put("kpiType", "TX_COUNT");

            JsonNode result = service.resolve(USER_ID, WidgetType.KPI, WidgetChartType.KPI_CARD, config);

            assertEquals(3, result.get("value").asInt());
        }

        @Test
        @DisplayName("defaults to NET_BALANCE when kpiType is absent")
        void shouldDefaultToNetBalance() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(income1, expense1));

            JsonNode result = service.resolve(USER_ID, WidgetType.KPI, WidgetChartType.KPI_CARD, emptyConfig());

            assertEquals("NET_BALANCE", result.get("kpiType").asText());
        }

        @Test
        @DisplayName("throws when chart type is not KPI_CARD")
        void shouldThrowForIncompatibleChartType() {
            assertThrows(ChartWidgetInvalidException.class, () ->
                    service.resolve(USER_ID, WidgetType.KPI, WidgetChartType.BAR, emptyConfig()));
        }
    }

    // ── CHART ──────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("CHART widget")
    class ChartTests {

        @Test
        @DisplayName("BAR chart groups by CATEGORY with SUM metric")
        void shouldGroupByCategoryWithSumMetric() {
            Category food = new Category("Food", TransactionType.EXPENSE, user);
            expense1.setCategory(food);
            expense2.setCategory(food);

            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(expense1, expense2));
            ObjectNode config = mapper.createObjectNode();
            config.put("groupBy", "CATEGORY");
            config.put("metric", "SUM");

            JsonNode result = service.resolve(USER_ID, WidgetType.CHART, WidgetChartType.BAR, config);

            assertNotNull(result.get("labels"));
            assertNotNull(result.get("datasets"));
            assertNotNull(result.get("meta"));
            assertEquals("SUM", result.get("meta").get("metric").asText());
            assertEquals("CATEGORY", result.get("meta").get("groupBy").asText());
            assertEquals(1, result.get("labels").size()); // both in "Food"
        }

        @Test
        @DisplayName("BAR chart groups by MONTH")
        void shouldGroupByMonth() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(income1, expense1));
            ObjectNode config = mapper.createObjectNode();
            config.put("groupBy", "MONTH");

            JsonNode result = service.resolve(USER_ID, WidgetType.CHART, WidgetChartType.BAR, config);

            assertEquals(1, result.get("labels").size()); // both in 2026-03
        }

        @Test
        @DisplayName("BAR chart groups by TYPE")
        void shouldGroupByType() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(income1, expense1, expense2));
            ObjectNode config = mapper.createObjectNode();
            config.put("groupBy", "TYPE");

            JsonNode result = service.resolve(USER_ID, WidgetType.CHART, WidgetChartType.BAR, config);

            assertEquals(2, result.get("labels").size()); // INCOME and EXPENSE
        }

        @Test
        @DisplayName("BAR chart with COUNT metric counts transactions per group")
        void shouldCountTransactionsPerGroup() {
            Category food = new Category("Food", TransactionType.EXPENSE, user);
            expense1.setCategory(food);
            expense2.setCategory(food);

            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(expense1, expense2));
            ObjectNode config = mapper.createObjectNode();
            config.put("groupBy", "CATEGORY");
            config.put("metric", "COUNT");

            JsonNode result = service.resolve(USER_ID, WidgetType.CHART, WidgetChartType.BAR, config);

            JsonNode datasetData = result.get("datasets").get(0).get("data");
            assertEquals(2, datasetData.get(0).asInt()); // 2 transactions in Food
        }

        @Test
        @DisplayName("STACKED_BAR chart produces two datasets (income and expense)")
        void shouldProduceTwoDatasetsForStackedBar() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(income1, expense1));
            ObjectNode config = mapper.createObjectNode();
            config.put("groupBy", "MONTH");

            JsonNode result = service.resolve(USER_ID, WidgetType.CHART, WidgetChartType.STACKED_BAR, config);

            assertEquals(2, result.get("datasets").size());
            assertEquals("INCOME", result.get("datasets").get(0).get("label").asText());
            assertEquals("EXPENSE", result.get("datasets").get(1).get("label").asText());
        }

        @Test
        @DisplayName("CHART groups uncategorized transactions as 'Uncategorized'")
        void shouldGroupNoCategoryAsUncategorized() {
            // expense1 has no category
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(expense1));

            JsonNode result = service.resolve(USER_ID, WidgetType.CHART, WidgetChartType.BAR, emptyConfig());

            assertEquals("Uncategorized", result.get("labels").get(0).asText());
        }

        @Test
        @DisplayName("CHART groups no-account transaction as 'No account' when groupBy=ACCOUNT")
        void shouldGroupNoAccountAsNoAccount() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(expense1));
            ObjectNode config = mapper.createObjectNode();
            config.put("groupBy", "ACCOUNT");

            JsonNode result = service.resolve(USER_ID, WidgetType.CHART, WidgetChartType.BAR, config);

            assertEquals("No account", result.get("labels").get(0).asText());
        }

        @Test
        @DisplayName("CHART groups by ACCOUNT name when account is set")
        void shouldGroupByAccountName() {
            Account account = new Account("Savings", AccountType.BANK, "EUR", BigDecimal.ZERO, user);
            setId(account, UUID.randomUUID());
            expense1.setAccount(account);

            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(expense1));
            ObjectNode config = mapper.createObjectNode();
            config.put("groupBy", "ACCOUNT");

            JsonNode result = service.resolve(USER_ID, WidgetType.CHART, WidgetChartType.BAR, config);

            assertEquals("Savings", result.get("labels").get(0).asText());
        }

        @Test
        @DisplayName("throws for CHART + KPI_CARD combination")
        void shouldThrowForChartWithKpiCard() {
            assertThrows(ChartWidgetInvalidException.class, () ->
                    service.resolve(USER_ID, WidgetType.CHART, WidgetChartType.KPI_CARD, emptyConfig()));
        }

        @Test
        @DisplayName("throws for CHART + SUMMARY_TABLE combination")
        void shouldThrowForChartWithSummaryTable() {
            assertThrows(ChartWidgetInvalidException.class, () ->
                    service.resolve(USER_ID, WidgetType.CHART, WidgetChartType.SUMMARY_TABLE, emptyConfig()));
        }
    }

    // ── TABLE ──────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("TABLE widget")
    class TableTests {

        @Test
        @DisplayName("returns rows sorted by date descending with totals")
        void shouldReturnRowsSortedByDateDesc() {
            setId(income1, UUID.randomUUID());
            setId(expense1, UUID.randomUUID());
            setId(expense2, UUID.randomUUID());

            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(income1, expense1, expense2));

            JsonNode result = service.resolve(USER_ID, WidgetType.TABLE,
                    WidgetChartType.SUMMARY_TABLE, emptyConfig());

            assertEquals(3, result.get("rowCount").asInt());
            assertNotNull(result.get("rows"));
            assertNotNull(result.get("totalAmount"));
            // rows sorted by date desc: expense2(3-10) > expense1(3-5) > income1(3-1)
            assertEquals("2026-03-10", result.get("rows").get(0).get("date").asText());
        }

        @Test
        @DisplayName("row includes id, name, amount, date, type, account, category")
        void shouldIncludeAllRowFields() {
            setId(expense1, UUID.randomUUID());
            Account acct = new Account("Checking", AccountType.BANK, "EUR", BigDecimal.ZERO, user);
            setId(acct, UUID.randomUUID());
            expense1.setAccount(acct);
            Category cat = new Category("Housing", TransactionType.EXPENSE, user);
            expense1.setCategory(cat);

            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(expense1));

            JsonNode result = service.resolve(USER_ID, WidgetType.TABLE,
                    WidgetChartType.SUMMARY_TABLE, emptyConfig());

            JsonNode row = result.get("rows").get(0);
            assertEquals(expense1.getId().toString(), row.get("id").asText());
            assertEquals("Rent", row.get("name").asText());
            assertEquals("EXPENSE", row.get("type").asText());
            assertEquals("Checking", row.get("account").asText());
            assertEquals("Housing", row.get("category").asText());
        }

        @Test
        @DisplayName("row uses null for account/category when not set")
        void shouldUseNullForMissingAccountAndCategory() {
            setId(expense1, UUID.randomUUID());

            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(expense1));

            JsonNode result = service.resolve(USER_ID, WidgetType.TABLE,
                    WidgetChartType.SUMMARY_TABLE, emptyConfig());

            JsonNode row = result.get("rows").get(0);
            assertTrue(row.get("account").isNull());
            assertTrue(row.get("category").isNull());
        }

        @Test
        @DisplayName("empty transaction list returns rowCount=0 and totalAmount=0")
        void shouldReturnEmptyTableWhenNoTransactions() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of());

            JsonNode result = service.resolve(USER_ID, WidgetType.TABLE,
                    WidgetChartType.SUMMARY_TABLE, emptyConfig());

            assertEquals(0, result.get("rowCount").asInt());
            assertEquals(0, result.get("totalAmount").asInt());
        }

        @Test
        @DisplayName("throws for TABLE + BAR combination")
        void shouldThrowForTableWithBar() {
            assertThrows(ChartWidgetInvalidException.class, () ->
                    service.resolve(USER_ID, WidgetType.TABLE, WidgetChartType.BAR, emptyConfig()));
        }
    }
}
