package Balio.web.model.services;

import Balio.web.enums.TransactionType;
import Balio.web.enums.WidgetChartType;
import Balio.web.enums.WidgetType;
import Balio.web.model.Exceptions.ChartWidgetInvalidException;
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
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link KpiCardDataResolver}.
 * Validates each KPI metric calculation and edge-case handling.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("KpiCardDataResolver")
class KpiCardDataResolverTest {

    private static final UUID USER_ID = UUID.randomUUID();

    @Mock private WidgetFilterEngine filterEngine;

    private KpiCardDataResolver resolver;
    private final ObjectMapper mapper = new ObjectMapper();
    private User user;

    @BeforeEach
    void setUp() {
        resolver = new KpiCardDataResolver(filterEngine, mapper);
        user = new User("U", "u@t.com", "pwd");
    }

    /* ── helpers ─────────────────────────────────────────────── */

    private Transaction income(String name, String amount) {
        return new Transaction(name, new BigDecimal(amount), LocalDate.now(), TransactionType.INCOME, user);
    }

    private Transaction expense(String name, String amount) {
        return new Transaction(name, new BigDecimal(amount), LocalDate.now(), TransactionType.EXPENSE, user);
    }

    private JsonNode config(String kpiType) {
        ObjectNode node = mapper.createObjectNode();
        if (kpiType != null) {
            node.put("kpiType", kpiType);
        }
        return node;
    }

    /* ════════════════════════════════════════════════════════════
     *  supports()
     * ════════════════════════════════════════════════════════════ */

    @Test
    @DisplayName("supports WidgetType.KPI")
    void shouldSupportKpiType() {
        assertEquals(WidgetType.KPI, resolver.supports());
    }

    /* ════════════════════════════════════════════════════════════
     *  Chart type guard
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("Chart type guard")
    class ChartTypeGuardTests {

        @Test
        @DisplayName("throws ChartWidgetInvalidException when chartType is BAR")
        void shouldThrow_whenChartTypeBar() {
            assertThrows(ChartWidgetInvalidException.class, () ->
                    resolver.resolve(USER_ID, WidgetChartType.BAR, config("NET_BALANCE")));
        }

        @Test
        @DisplayName("throws ChartWidgetInvalidException when chartType is SUMMARY_TABLE")
        void shouldThrow_whenChartTypeSummaryTable() {
            assertThrows(ChartWidgetInvalidException.class, () ->
                    resolver.resolve(USER_ID, WidgetChartType.SUMMARY_TABLE, config("NET_BALANCE")));
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  NET_BALANCE (default)
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("NET_BALANCE")
    class NetBalanceTests {

        @Test
        @DisplayName("returns income minus expense")
        void shouldReturnNetBalance() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(income("Salary", "3000"), expense("Rent", "1000")));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.KPI_CARD, config("NET_BALANCE"));

            assertEquals("NET_BALANCE", result.get("kpiType").asText());
            assertEquals(new BigDecimal("2000"), result.get("value").decimalValue());
            assertEquals(new BigDecimal("3000"), result.get("income").decimalValue());
            assertEquals(new BigDecimal("1000"), result.get("expense").decimalValue());
            assertEquals(2, result.get("transactionCount").asInt());
        }

        @Test
        @DisplayName("defaults to NET_BALANCE when kpiType is absent from configuration")
        void shouldDefaultToNetBalance_whenKpiTypeMissing() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(income("Salary", "1000")));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.KPI_CARD, config(null));

            assertEquals("NET_BALANCE", result.get("kpiType").asText());
        }

        @Test
        @DisplayName("returns zero value for empty transaction list")
        void shouldReturnZero_whenNoTransactions() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any())).thenReturn(List.of());

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.KPI_CARD, config("NET_BALANCE"));

            assertEquals(BigDecimal.ZERO, result.get("value").decimalValue());
            assertEquals(BigDecimal.ZERO, result.get("income").decimalValue());
            assertEquals(BigDecimal.ZERO, result.get("expense").decimalValue());
            assertEquals(0, result.get("transactionCount").asInt());
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  TOTAL_EXPENSE
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("TOTAL_EXPENSE")
    class TotalExpenseTests {

        @Test
        @DisplayName("sums only expense amounts")
        void shouldSumOnlyExpenses() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(expense("Rent", "800"), expense("Food", "200"), income("Salary", "3000")));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.KPI_CARD, config("TOTAL_EXPENSE"));

            assertEquals(new BigDecimal("1000"), result.get("value").decimalValue());
        }

        @Test
        @DisplayName("returns zero when there are no expenses")
        void shouldReturnZero_whenNoExpenses() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(income("Salary", "5000")));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.KPI_CARD, config("TOTAL_EXPENSE"));

            assertEquals(BigDecimal.ZERO, result.get("value").decimalValue());
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  TOTAL_INCOME
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("TOTAL_INCOME")
    class TotalIncomeTests {

        @Test
        @DisplayName("sums only income amounts")
        void shouldSumOnlyIncomes() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(income("Salary", "2000"), income("Bonus", "500"), expense("Rent", "800")));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.KPI_CARD, config("TOTAL_INCOME"));

            assertEquals(new BigDecimal("2500"), result.get("value").decimalValue());
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  AVG_EXPENSE
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("AVG_EXPENSE")
    class AvgExpenseTests {

        @Test
        @DisplayName("calculates average expense amount")
        void shouldCalculateAverageExpense() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(expense("A", "100"), expense("B", "200"), expense("C", "300")));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.KPI_CARD, config("AVG_EXPENSE"));

            assertEquals(new BigDecimal("200.00"), result.get("value").decimalValue());
        }

        @Test
        @DisplayName("returns zero average when there are no expenses")
        void shouldReturnZero_whenNoExpenses() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(income("Salary", "3000")));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.KPI_CARD, config("AVG_EXPENSE"));

            assertEquals(BigDecimal.ZERO, result.get("value").decimalValue());
        }

        @Test
        @DisplayName("handles single expense correctly")
        void shouldHandleSingleExpense() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(expense("Only", "75.50")));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.KPI_CARD, config("AVG_EXPENSE"));

            assertEquals(new BigDecimal("75.50"), result.get("value").decimalValue());
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  TX_COUNT
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("TX_COUNT")
    class TxCountTests {

        @Test
        @DisplayName("returns total transaction count including income and expense")
        void shouldReturnTotalCount() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any()))
                    .thenReturn(List.of(expense("A", "10"), expense("B", "20"), income("C", "100")));

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.KPI_CARD, config("TX_COUNT"));

            assertEquals(new BigDecimal("3"), result.get("value").decimalValue());
        }

        @Test
        @DisplayName("returns zero count for empty transaction list")
        void shouldReturnZero_whenEmpty() {
            when(filterEngine.resolveTransactions(eq(USER_ID), any())).thenReturn(List.of());

            JsonNode result = resolver.resolve(USER_ID, WidgetChartType.KPI_CARD, config("TX_COUNT"));

            assertEquals(BigDecimal.ZERO, result.get("value").decimalValue());
        }
    }
}
