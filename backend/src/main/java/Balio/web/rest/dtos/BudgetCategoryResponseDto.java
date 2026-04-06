package Balio.web.rest.dtos;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
public class BudgetCategoryResponseDto {

    private String id;
    private String name;
    private BigDecimal maxAmount;
    private int displayOrder;
    private String iconName;
    private String iconBgColor;
    private BigDecimal spent;
    private BigDecimal remaining;
    private double usagePercent;
    private List<LinkedCategoryDto> linkedCategories;
    private List<TransactionSummaryDto> transactions;

    // ── Nested DTO for linked categories ──

    @Getter
    @Setter
    public static class LinkedCategoryDto {
        private String id;
        private String name;
    }

    // ── Nested DTO for transactions summary ──

    @Getter
    @Setter
    public static class TransactionSummaryDto {
        private String id;
        private String name;
        private BigDecimal amount;
        private String date;
        private String categoryName;
        private boolean manual;
    }
}
