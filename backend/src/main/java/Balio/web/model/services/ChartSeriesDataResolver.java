package Balio.web.model.services;

import Balio.web.enums.TransactionType;
import Balio.web.enums.WidgetChartType;
import Balio.web.enums.WidgetType;
import Balio.web.model.Exceptions.ChartWidgetInvalidException;
import Balio.web.model.entities.Transaction;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class ChartSeriesDataResolver implements WidgetDataResolver {

    private final WidgetFilterEngine filterEngine;
    private final ObjectMapper objectMapper;
    private final int maxPoints;

    public ChartSeriesDataResolver(WidgetFilterEngine filterEngine,
                                   ObjectMapper objectMapper,
                                   @Value("${charts.preview.max-points:100}") int maxPoints) {
        this.filterEngine = filterEngine;
        this.objectMapper = objectMapper;
        this.maxPoints = maxPoints;
    }

    @Override
    public WidgetType supports() {
        return WidgetType.CHART;
    }

    @Override
    public JsonNode resolve(java.util.UUID userId, WidgetChartType chartType, JsonNode configuration) {
        if (chartType == WidgetChartType.KPI_CARD || chartType == WidgetChartType.SUMMARY_TABLE) {
            throw new ChartWidgetInvalidException("Chart widget does not support chart type: " + chartType);
        }

        List<Transaction> txs = filterEngine.resolveTransactions(userId, configuration);
        String groupBy = readUpper(configuration, "groupBy", "CATEGORY");
        String metric = readUpper(configuration, "metric", "SUM");
        String orientation = readUpper(configuration, "orientation", "VERTICAL");

        Map<String, BigDecimal> values = aggregate(txs, groupBy, metric);
        List<Map.Entry<String, BigDecimal>> sorted = values.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .limit(maxPoints)
                .toList();

        ArrayNode labels = objectMapper.createArrayNode();
        ArrayNode datasetData = objectMapper.createArrayNode();

        for (Map.Entry<String, BigDecimal> entry : sorted) {
            labels.add(entry.getKey());
            datasetData.add(entry.getValue());
        }

        ObjectNode dataset = objectMapper.createObjectNode();
        dataset.put("label", metric);
        dataset.set("data", datasetData);

        ArrayNode datasets = objectMapper.createArrayNode();

        if (chartType == WidgetChartType.STACKED_BAR) {
            ObjectNode incomeDataset = objectMapper.createObjectNode();
            ObjectNode expenseDataset = objectMapper.createObjectNode();

            Map<String, BigDecimal> income = aggregateByType(txs, groupBy, TransactionType.INCOME);
            Map<String, BigDecimal> expense = aggregateByType(txs, groupBy, TransactionType.EXPENSE);

            ArrayNode incomeData = objectMapper.createArrayNode();
            ArrayNode expenseData = objectMapper.createArrayNode();

            List<String> keys = txs.stream()
                    .map(tx -> groupKey(tx, groupBy))
                    .distinct()
                    .sorted(Comparator.naturalOrder())
                    .limit(maxPoints)
                    .toList();

            labels = objectMapper.createArrayNode();
            for (String key : keys) {
                labels.add(key);
                incomeData.add(income.getOrDefault(key, BigDecimal.ZERO));
                expenseData.add(expense.getOrDefault(key, BigDecimal.ZERO));
            }

            incomeDataset.put("label", "INCOME");
            incomeDataset.set("data", incomeData);
            expenseDataset.put("label", "EXPENSE");
            expenseDataset.set("data", expenseData);

            datasets.add(incomeDataset);
            datasets.add(expenseDataset);
        } else {
            datasets.add(dataset);
        }

        ObjectNode meta = objectMapper.createObjectNode();
        meta.put("orientation", orientation);
        meta.put("groupBy", groupBy);
        meta.put("metric", metric);
        meta.put("chartType", chartType.name());
        meta.put("maxPoints", maxPoints);

        ObjectNode result = objectMapper.createObjectNode();
        result.set("labels", labels);
        result.set("datasets", datasets);
        result.set("meta", meta);
        return result;
    }

    private String readUpper(JsonNode configuration, String field, String defaultValue) {
        if (configuration == null || !configuration.has(field) || configuration.get(field).isNull()) {
            return defaultValue;
        }
        return configuration.get(field).asText(defaultValue).trim().toUpperCase();
    }

    private Map<String, BigDecimal> aggregate(List<Transaction> txs, String groupBy, String metric) {
        Map<String, BigDecimal> values = new LinkedHashMap<>();
        Map<String, Integer> counts = new LinkedHashMap<>();

        for (Transaction tx : txs) {
            String key = groupKey(tx, groupBy);
            BigDecimal signed = signedAmount(tx);

            if ("COUNT".equals(metric)) {
                values.put(key, values.getOrDefault(key, BigDecimal.ZERO).add(BigDecimal.ONE));
            } else if ("NET".equals(metric)) {
                values.put(key, values.getOrDefault(key, BigDecimal.ZERO).add(signed));
            } else {
                values.put(key, values.getOrDefault(key, BigDecimal.ZERO).add(tx.getAmount()));
            }

            counts.put(key, counts.getOrDefault(key, 0) + 1);
        }

        if ("AVG".equals(metric)) {
            for (Map.Entry<String, BigDecimal> entry : values.entrySet()) {
                int count = counts.getOrDefault(entry.getKey(), 1);
                entry.setValue(entry.getValue().divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP));
            }
        }

        return values;
    }

    private Map<String, BigDecimal> aggregateByType(List<Transaction> txs,
                                                    String groupBy,
                                                    TransactionType type) {
        Map<String, BigDecimal> values = new LinkedHashMap<>();
        for (Transaction tx : txs) {
            if (tx.getType() != type) {
                continue;
            }
            String key = groupKey(tx, groupBy);
            values.put(key, values.getOrDefault(key, BigDecimal.ZERO).add(tx.getAmount()));
        }
        return values;
    }

    private String groupKey(Transaction tx, String groupBy) {
        return switch (groupBy) {
            case "ACCOUNT" -> tx.getAccount() != null ? tx.getAccount().getName() : "No account";
            case "MONTH" -> tx.getDate().withDayOfMonth(1).toString().substring(0, 7);
            case "DAY" -> tx.getDate().toString();
            case "TYPE" -> tx.getType().name();
            case "CATEGORY" -> tx.getCategory() != null ? tx.getCategory().getName() : "Uncategorized";
            default -> tx.getCategory() != null ? tx.getCategory().getName() : "Uncategorized";
        };
    }

    private BigDecimal signedAmount(Transaction tx) {
        return tx.getType() == TransactionType.EXPENSE ? tx.getAmount().negate() : tx.getAmount();
    }
}
