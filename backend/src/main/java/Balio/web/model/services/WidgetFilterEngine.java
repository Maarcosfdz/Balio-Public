package Balio.web.model.services;

import Balio.web.enums.TransactionType;
import Balio.web.model.entities.Transaction;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
public class WidgetFilterEngine {

    private final TransactionService transactionService;

    public WidgetFilterEngine(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    public List<Transaction> resolveTransactions(UUID userId, JsonNode widgetConfiguration) {
        JsonNode filterNode = widgetConfiguration != null
                ? widgetConfiguration.path("filter")
                : null;

        TransactionType type = null;
        UUID accountId = null;
        UUID dbCategoryId = null;
        List<UUID> categoryIds = null;
        LocalDate startDate = null;
        LocalDate endDate = null;
        String nameQuery = null;
        BigDecimal amountMin = null;
        BigDecimal amountMax = null;
        List<LocalDate> specificDates = null;

        if (filterNode != null && filterNode.isObject()) {
            if (filterNode.has("type") && !filterNode.get("type").isNull()) {
                type = TransactionType.valueOf(filterNode.get("type").asText());
            }
            if (filterNode.has("accountId") && !filterNode.get("accountId").isNull()) {
                accountId = UUID.fromString(filterNode.get("accountId").asText());
            }
            if (filterNode.has("categoryId") && !filterNode.get("categoryId").isNull()) {
                dbCategoryId = UUID.fromString(filterNode.get("categoryId").asText());
                categoryIds = List.of(dbCategoryId);
            } else if (filterNode.has("categoryIds") && filterNode.get("categoryIds").isArray()) {
                List<UUID> ids = new ArrayList<>();
                for (JsonNode item : filterNode.get("categoryIds")) {
                    if (!item.isNull() && !item.asText().isBlank()) {
                        ids.add(UUID.fromString(item.asText()));
                    }
                }
                if (!ids.isEmpty()) {
                    categoryIds = ids;
                    dbCategoryId = ids.size() == 1 ? ids.get(0) : null;
                }
            }
            if (filterNode.has("startDate") && !filterNode.get("startDate").isNull()) {
                startDate = LocalDate.parse(filterNode.get("startDate").asText());
            }
            if (filterNode.has("endDate") && !filterNode.get("endDate").isNull()) {
                endDate = LocalDate.parse(filterNode.get("endDate").asText());
            }
            if (filterNode.has("nameQuery") && !filterNode.get("nameQuery").isNull()) {
                String value = filterNode.get("nameQuery").asText().trim();
                if (!value.isBlank()) {
                    nameQuery = value.toLowerCase();
                }
            }
            if (filterNode.has("amountMin") && !filterNode.get("amountMin").isNull()) {
                amountMin = new BigDecimal(filterNode.get("amountMin").asText());
            }
            if (filterNode.has("amountMax") && !filterNode.get("amountMax").isNull()) {
                amountMax = new BigDecimal(filterNode.get("amountMax").asText());
            }
            if (filterNode.has("specificDates") && filterNode.get("specificDates").isArray()) {
                List<LocalDate> dates = new ArrayList<>();
                for (JsonNode item : filterNode.get("specificDates")) {
                    if (!item.isNull() && !item.asText().isBlank()) {
                        dates.add(LocalDate.parse(item.asText()));
                    }
                }
                if (!dates.isEmpty()) {
                    specificDates = dates;
                }
            }
        }

        List<Transaction> base = transactionService.findFiltered(
                userId, type, accountId, dbCategoryId, startDate, endDate);

        final List<UUID> finalCategoryIds = categoryIds;
        final String finalNameQuery = nameQuery;
        final BigDecimal finalAmountMin = amountMin;
        final BigDecimal finalAmountMax = amountMax;
        final List<LocalDate> finalSpecificDates = specificDates;

        return base.stream()
                .filter(tx -> finalCategoryIds == null
                        || (tx.getCategory() != null
                        && finalCategoryIds.contains(tx.getCategory().getId())))
                .filter(tx -> finalNameQuery == null
                        || tx.getName().toLowerCase().contains(finalNameQuery))
                .filter(tx -> finalAmountMin == null
                        || tx.getAmount().compareTo(finalAmountMin) >= 0)
                .filter(tx -> finalAmountMax == null
                        || tx.getAmount().compareTo(finalAmountMax) <= 0)
                .filter(tx -> finalSpecificDates == null
                        || finalSpecificDates.contains(tx.getDate()))
                .toList();
    }
}
