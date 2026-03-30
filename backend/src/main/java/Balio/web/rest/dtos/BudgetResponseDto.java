package Balio.web.rest.dtos;

import Balio.web.enums.BudgetPeriodicity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

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

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BudgetPeriodicity getPeriodicity() { return periodicity; }
    public void setPeriodicity(BudgetPeriodicity periodicity) { this.periodicity = periodicity; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public String getIconName() { return iconName; }
    public void setIconName(String iconName) { this.iconName = iconName; }

    public String getIconBgColor() { return iconBgColor; }
    public void setIconBgColor(String iconBgColor) { this.iconBgColor = iconBgColor; }

    public LocalDate getPeriodStart() { return periodStart; }
    public void setPeriodStart(LocalDate periodStart) { this.periodStart = periodStart; }

    public LocalDate getPeriodEnd() { return periodEnd; }
    public void setPeriodEnd(LocalDate periodEnd) { this.periodEnd = periodEnd; }

    public BigDecimal getTotalBudget() { return totalBudget; }
    public void setTotalBudget(BigDecimal totalBudget) { this.totalBudget = totalBudget; }

    public BigDecimal getTotalSpent() { return totalSpent; }
    public void setTotalSpent(BigDecimal totalSpent) { this.totalSpent = totalSpent; }

    public BigDecimal getTotalRemaining() { return totalRemaining; }
    public void setTotalRemaining(BigDecimal totalRemaining) { this.totalRemaining = totalRemaining; }

    public double getUsagePercent() { return usagePercent; }
    public void setUsagePercent(double usagePercent) { this.usagePercent = usagePercent; }

    public BigDecimal getPrevTotalBudget() { return prevTotalBudget; }
    public void setPrevTotalBudget(BigDecimal prevTotalBudget) { this.prevTotalBudget = prevTotalBudget; }

    public BigDecimal getPrevTotalSpent() { return prevTotalSpent; }
    public void setPrevTotalSpent(BigDecimal prevTotalSpent) { this.prevTotalSpent = prevTotalSpent; }

    public List<BudgetCategoryResponseDto> getCategories() { return categories; }
    public void setCategories(List<BudgetCategoryResponseDto> categories) { this.categories = categories; }
}
