package Balio.web.rest.dtos;

import Balio.web.enums.BudgetPeriodicity;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class BudgetResponseDto {

    private String id;
    private String name;
    private BudgetPeriodicity periodicity;
    private LocalDate startDate;
    private String iconName;
    private String iconBgColor;

    // Current period
    private LocalDate periodStart;
    private LocalDate periodEnd;
    private BigDecimal totalBudget;
    private BigDecimal totalSpent;
    private BigDecimal totalRemaining;
    private double usagePercent;

    // Previous period
    private BigDecimal prevTotalBudget;
    private BigDecimal prevTotalSpent;

    private List<BudgetCategoryResponseDto> categories;
}
