package Balio.web.model.services;

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
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Component
public class SummaryTableDataResolver implements WidgetDataResolver {

    private final WidgetFilterEngine filterEngine;
    private final ObjectMapper objectMapper;
    private final int maxRows;

    public SummaryTableDataResolver(WidgetFilterEngine filterEngine,
                                    ObjectMapper objectMapper,
                                    @Value("${charts.preview.max-table-rows:200}") int maxRows) {
        this.filterEngine = filterEngine;
        this.objectMapper = objectMapper;
        this.maxRows = maxRows;
    }

    @Override
    public WidgetType supports() {
        return WidgetType.TABLE;
    }

    @Override
    public JsonNode resolve(UUID userId, WidgetChartType chartType, JsonNode configuration) {
        if (chartType != WidgetChartType.SUMMARY_TABLE) {
            throw new ChartWidgetInvalidException("Table widget requires chart type SUMMARY_TABLE");
        }

        List<Transaction> txs = filterEngine.resolveTransactions(userId, configuration).stream()
                .sorted(Comparator.comparing(Transaction::getDate).reversed())
                .limit(maxRows)
                .toList();

        ArrayNode rows = objectMapper.createArrayNode();
        BigDecimal total = BigDecimal.ZERO;
        for (Transaction tx : txs) {
            ObjectNode row = objectMapper.createObjectNode();
            row.put("id", tx.getId().toString());
            row.put("name", tx.getName());
            row.put("amount", tx.getAmount());
            row.put("date", tx.getDate().toString());
            row.put("type", tx.getType().name());
            row.put("account", tx.getAccount() != null ? tx.getAccount().getName() : null);
            row.put("category", tx.getCategory() != null ? tx.getCategory().getName() : null);
            rows.add(row);
            total = total.add(tx.getAmount());
        }

        ObjectNode result = objectMapper.createObjectNode();
        result.set("rows", rows);
        result.put("rowCount", txs.size());
        result.put("totalAmount", total);
        result.put("maxRows", maxRows);
        return result;
    }
}
