package Balio.web.model.services;

import Balio.web.enums.BudgetPeriodicity;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.Budget;
import Balio.web.model.entities.BudgetCategory;
import Balio.web.model.entities.Transaction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface BudgetService {

    Budget createBudget(UUID userId, String name, BudgetPeriodicity periodicity, LocalDate startDate);

    void deleteBudget(UUID userId, UUID budgetId) throws InstanceNotFoundException;

    Budget modifyBudget(UUID userId, UUID budgetId, String name,
                        BudgetPeriodicity periodicity, LocalDate startDate)
            throws InstanceNotFoundException;

    List<Budget> findAllByUserId(UUID userId);

    Budget findByIdAndUserId(UUID budgetId, UUID userId) throws InstanceNotFoundException;

    // ── Budget categories ──

    BudgetCategory createBudgetCategory(UUID userId, UUID budgetId, String name,
                                         BigDecimal maxAmount, List<UUID> linkedCategoryIds)
            throws InstanceNotFoundException;

    BudgetCategory modifyBudgetCategory(UUID userId, UUID budgetId, UUID categoryId,
                                         String name, BigDecimal maxAmount, List<UUID> linkedCategoryIds)
            throws InstanceNotFoundException;

    void deleteBudgetCategory(UUID userId, UUID budgetId, UUID categoryId)
            throws InstanceNotFoundException;

    // ── Manual transaction linking ──

    void linkTransaction(UUID userId, UUID budgetId, UUID categoryId, UUID transactionId)
            throws InstanceNotFoundException;

    void unlinkTransaction(UUID userId, UUID budgetId, UUID categoryId, UUID transactionId)
            throws InstanceNotFoundException;

    // ── Period calculation helpers ──

    LocalDate[] getCurrentPeriodDates(Budget budget);

    LocalDate[] getPreviousPeriodDates(Budget budget);

    BigDecimal calculateSpent(UUID userId, BudgetCategory category,
                              LocalDate periodStart, LocalDate periodEnd);

    List<Transaction> getTransactionsInPeriod(UUID userId, BudgetCategory category,
                                              LocalDate periodStart, LocalDate periodEnd);
}
