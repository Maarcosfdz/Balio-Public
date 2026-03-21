package Balio.web.model.services;

import Balio.web.enums.TransactionType;
import Balio.web.enums.WidgetChartType;
import Balio.web.enums.WidgetType;
import Balio.web.model.Exceptions.ChartWidgetInvalidException;
import Balio.web.model.entities.Transaction;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Component
public class KpiCardDataResolver implements WidgetDataResolver {

    private final WidgetFilterEngine filterEngine;
    private final ObjectMapper objectMapper;

    public KpiCardDataResolver(WidgetFilterEngine filterEngine, ObjectMapper objectMapper) {
        this.filterEngine = filterEngine;
        this.objectMapper = objectMapper;
    }

    @Override
    public WidgetType supports() {
        return WidgetType.KPI;
    }

    @Override
    public JsonNode resolve(java.util.UUID userId, WidgetChartType chartType, JsonNode configuration) {
        if (chartType != WidgetChartType.KPI_CARD) {
            throw new ChartWidgetInvalidException("KPI widget requires chart type KPI_CARD");
        }

        List<Transaction> txs = filterEngine.resolveTransactions(userId, configuration);
        String kpiType = readUpper(configuration, "kpiType", "NET_BALANCE");

        BigDecimal income = txs.stream()
                .filter(tx -> tx.getType() == TransactionType.INCOME)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal expense = txs.stream()
                .filter(tx -> tx.getType() == TransactionType.EXPENSE)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal value = switch (kpiType) {
            case "TOTAL_EXPENSE" -> expense;
            case "TOTAL_INCOME" -> income;
            case "AVG_EXPENSE" -> {
                long count = txs.stream().filter(tx -> tx.getType() == TransactionType.EXPENSE).count();
                if (count == 0) {
                    yield BigDecimal.ZERO;
                }
                yield expense.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
            }
            case "TX_COUNT" -> BigDecimal.valueOf(txs.size());
            default -> income.subtract(expense);
        };

        ObjectNode data = objectMapper.createObjectNode();
        data.put("kpiType", kpiType);
        data.put("value", value);
        data.put("income", income);
        data.put("expense", expense);
        data.put("transactionCount", txs.size());
        return data;
    }

    private String readUpper(JsonNode configuration, String field, String defaultValue) {
        if (configuration == null || !configuration.has(field) || configuration.get(field).isNull()) {
            return defaultValue;
        }
        return configuration.get(field).asText(defaultValue).trim().toUpperCase();
    }
}
