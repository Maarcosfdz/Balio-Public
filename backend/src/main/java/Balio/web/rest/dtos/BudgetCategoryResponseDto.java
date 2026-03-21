package Balio.web.rest.dtos;

import java.math.BigDecimal;
import java.util.List;

public class BudgetCategoryResponseDto {

    private String id;
    private String name;
    private BigDecimal maxAmount;
    private int displayOrder;
    private BigDecimal spent;
    private BigDecimal remaining;
    private double usagePercent;
    private List<LinkedCategoryDto> linkedCategories;
    private List<TransactionSummaryDto> transactions;

    // ── Nested DTO for linked categories ──

    public static class LinkedCategoryDto {
        private String id;
        private String name;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
    }

    // ── Nested DTO for transactions summary ──

    public static class TransactionSummaryDto {
        private String id;
        private String name;
        private BigDecimal amount;
        private String date;
        private String categoryName;
        private boolean manual;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }

        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }

        public String getCategoryName() { return categoryName; }
        public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

        public boolean isManual() { return manual; }
        public void setManual(boolean manual) { this.manual = manual; }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BigDecimal getMaxAmount() { return maxAmount; }
    public void setMaxAmount(BigDecimal maxAmount) { this.maxAmount = maxAmount; }

    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }

    public BigDecimal getSpent() { return spent; }
    public void setSpent(BigDecimal spent) { this.spent = spent; }

    public BigDecimal getRemaining() { return remaining; }
    public void setRemaining(BigDecimal remaining) { this.remaining = remaining; }

    public double getUsagePercent() { return usagePercent; }
    public void setUsagePercent(double usagePercent) { this.usagePercent = usagePercent; }

    public List<LinkedCategoryDto> getLinkedCategories() { return linkedCategories; }
    public void setLinkedCategories(List<LinkedCategoryDto> linkedCategories) { this.linkedCategories = linkedCategories; }

    public List<TransactionSummaryDto> getTransactions() { return transactions; }
    public void setTransactions(List<TransactionSummaryDto> transactions) { this.transactions = transactions; }
}
