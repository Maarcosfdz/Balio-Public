package Balio.web.rest.dtos;

import Balio.web.model.entities.Budget;
import Balio.web.model.entities.BudgetCategory;
import Balio.web.model.entities.Transaction;
import Balio.web.model.services.BudgetService;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class BudgetConverter {

    private final BudgetService budgetService;

    public BudgetConverter(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    public BudgetSummaryDto toSummaryDto(Budget budget) {
        BudgetSummaryDto dto = new BudgetSummaryDto();
        dto.setId(budget.getId().toString());
        dto.setName(budget.getName());
        dto.setPeriodicity(budget.getPeriodicity());
        dto.setStartDate(budget.getStartDate());
        dto.setCategoryCount(budget.getCategories().size());

        UUID userId = budget.getUser().getId();

        // Current period
        LocalDate[] currentPeriod = budgetService.getCurrentPeriodDates(budget);
        dto.setPeriodStart(currentPeriod[0]);
        dto.setPeriodEnd(currentPeriod[1]);

        BigDecimal totalBudget = BigDecimal.ZERO;
        BigDecimal totalSpent = BigDecimal.ZERO;

        for (BudgetCategory bc : budget.getCategories()) {
            totalBudget = totalBudget.add(bc.getMaxAmount());
            totalSpent = totalSpent.add(
                    budgetService.calculateSpent(userId, bc, currentPeriod[0], currentPeriod[1]));
        }

        dto.setTotalBudget(totalBudget);
        dto.setTotalSpent(totalSpent);
        dto.setTotalRemaining(totalBudget.subtract(totalSpent));
        dto.setUsagePercent(calcPercent(totalSpent, totalBudget));

        // Previous period
        LocalDate[] prevPeriod = budgetService.getPreviousPeriodDates(budget);
        BigDecimal prevBudget = totalBudget; // same categories, same limits
        BigDecimal prevSpent = BigDecimal.ZERO;

        for (BudgetCategory bc : budget.getCategories()) {
            prevSpent = prevSpent.add(
                    budgetService.calculateSpent(userId, bc, prevPeriod[0], prevPeriod[1]));
        }

        dto.setPrevTotalBudget(prevBudget);
        dto.setPrevTotalSpent(prevSpent);

        return dto;
    }

    public BudgetResponseDto toResponseDto(Budget budget) {
        BudgetResponseDto dto = new BudgetResponseDto();
        dto.setId(budget.getId().toString());
        dto.setName(budget.getName());
        dto.setPeriodicity(budget.getPeriodicity());
        dto.setStartDate(budget.getStartDate());

        UUID userId = budget.getUser().getId();

        LocalDate[] currentPeriod = budgetService.getCurrentPeriodDates(budget);
        dto.setPeriodStart(currentPeriod[0]);
        dto.setPeriodEnd(currentPeriod[1]);

        BigDecimal totalBudget = BigDecimal.ZERO;
        BigDecimal totalSpent = BigDecimal.ZERO;

        List<BudgetCategoryResponseDto> catDtos = new ArrayList<>();
        for (BudgetCategory bc : budget.getCategories()) {
            BudgetCategoryResponseDto catDto = toCategoryResponseDto(
                    userId, bc, currentPeriod[0], currentPeriod[1]);
            catDtos.add(catDto);
            totalBudget = totalBudget.add(bc.getMaxAmount());
            totalSpent = totalSpent.add(catDto.getSpent());
        }

        dto.setCategories(catDtos);
        dto.setTotalBudget(totalBudget);
        dto.setTotalSpent(totalSpent);
        dto.setTotalRemaining(totalBudget.subtract(totalSpent));
        dto.setUsagePercent(calcPercent(totalSpent, totalBudget));

        // Previous period
        LocalDate[] prevPeriod = budgetService.getPreviousPeriodDates(budget);
        BigDecimal prevSpent = BigDecimal.ZERO;
        for (BudgetCategory bc : budget.getCategories()) {
            prevSpent = prevSpent.add(
                    budgetService.calculateSpent(userId, bc, prevPeriod[0], prevPeriod[1]));
        }
        dto.setPrevTotalBudget(totalBudget);
        dto.setPrevTotalSpent(prevSpent);

        return dto;
    }

    private BudgetCategoryResponseDto toCategoryResponseDto(UUID userId, BudgetCategory bc,
                                                             LocalDate periodStart,
                                                             LocalDate periodEnd) {
        BudgetCategoryResponseDto dto = new BudgetCategoryResponseDto();
        dto.setId(bc.getId().toString());
        dto.setName(bc.getName());
        dto.setMaxAmount(bc.getMaxAmount());
        dto.setDisplayOrder(bc.getDisplayOrder());

        BigDecimal spent = budgetService.calculateSpent(userId, bc, periodStart, periodEnd);
        dto.setSpent(spent);
        dto.setRemaining(bc.getMaxAmount().subtract(spent));
        dto.setUsagePercent(calcPercent(spent, bc.getMaxAmount()));

        // Linked categories
        dto.setLinkedCategories(bc.getLinkedCategories().stream()
                .map(cat -> {
                    BudgetCategoryResponseDto.LinkedCategoryDto lc =
                            new BudgetCategoryResponseDto.LinkedCategoryDto();
                    lc.setId(cat.getId().toString());
                    lc.setName(cat.getName());
                    return lc;
                })
                .collect(Collectors.toList()));

        // Transactions in this period (auto-linked + manual, deduplicated)
        Set<UUID> manualIds = bc.getManualTransactions().stream()
                .map(Transaction::getId)
                .collect(Collectors.toSet());

        List<Transaction> allTxs = budgetService.getTransactionsInPeriod(
                userId, bc, periodStart, periodEnd);

        List<BudgetCategoryResponseDto.TransactionSummaryDto> txDtos = allTxs.stream()
                .map(tx -> {
                    BudgetCategoryResponseDto.TransactionSummaryDto txDto =
                            new BudgetCategoryResponseDto.TransactionSummaryDto();
                    txDto.setId(tx.getId().toString());
                    txDto.setName(tx.getName());
                    txDto.setAmount(tx.getAmount());
                    txDto.setDate(tx.getDate().toString());
                    txDto.setCategoryName(tx.getCategory() != null ? tx.getCategory().getName() : null);
                    txDto.setManual(manualIds.contains(tx.getId()));
                    return txDto;
                })
                .collect(Collectors.toList());

        dto.setTransactions(txDtos);
        return dto;
    }

    private double calcPercent(BigDecimal spent, BigDecimal total) {
        if (total.compareTo(BigDecimal.ZERO) <= 0) return 0;
        return spent.multiply(BigDecimal.valueOf(100))
                .divide(total, 2, RoundingMode.HALF_UP)
                .doubleValue();
    }
}
