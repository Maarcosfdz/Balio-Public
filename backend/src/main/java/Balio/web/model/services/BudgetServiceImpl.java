package Balio.web.model.services;

import Balio.web.enums.BudgetPeriodicity;
import Balio.web.model.Exceptions.BudgetInvalidException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Budget;
import Balio.web.model.entities.BudgetCategory;
import Balio.web.model.entities.BudgetCategoryDao;
import Balio.web.model.entities.BudgetDao;
import Balio.web.model.entities.Category;
import Balio.web.model.entities.CategoryDao;
import Balio.web.model.entities.Transaction;
import Balio.web.model.entities.TransactionDao;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class BudgetServiceImpl implements BudgetService {

    private static final int MAX_BUDGETS = 10;
    private static final int MAX_CATEGORIES_PER_BUDGET = 40;

    private final UserDao userDao;
    private final BudgetDao budgetDao;
    private final BudgetCategoryDao budgetCategoryDao;
    private final CategoryDao categoryDao;
    private final TransactionDao transactionDao;

    public BudgetServiceImpl(UserDao userDao, BudgetDao budgetDao,
                             BudgetCategoryDao budgetCategoryDao,
                             CategoryDao categoryDao,
                             TransactionDao transactionDao) {
        this.userDao = userDao;
        this.budgetDao = budgetDao;
        this.budgetCategoryDao = budgetCategoryDao;
        this.categoryDao = categoryDao;
        this.transactionDao = transactionDao;
    }

    // ── Budget CRUD ─────────────────────────────────────────────────────

    @Override
    public Budget createBudget(UUID userId, String name, BudgetPeriodicity periodicity,
                               LocalDate startDate, String iconName, String iconBgColor) {
        User user = userDao.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        if (name == null || name.isBlank()) {
            throw new BudgetInvalidException("Budget name is required");
        }
        if (periodicity == null) {
            throw new BudgetInvalidException("Periodicity is required");
        }
        if (startDate == null) {
            throw new BudgetInvalidException("Start date is required");
        }
        if (budgetDao.countByUserId(userId) >= MAX_BUDGETS) {
            throw new BudgetInvalidException("Maximum number of budgets (" + MAX_BUDGETS + ") reached");
        }

        Budget budget = new Budget(
                name.trim(), periodicity, startDate, user,
                sanitizeOptional(iconName), sanitizeOptional(iconBgColor));
        budgetDao.save(budget);
        return budget;
    }

    @Override
    public Budget createBudget(UUID userId, String name, BudgetPeriodicity periodicity,
                               LocalDate startDate) {
        return createBudget(userId, name, periodicity, startDate, null, null);
    }

    @Override
    public void deleteBudget(UUID userId, UUID budgetId) throws InstanceNotFoundException {
        Budget budget = budgetDao.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Budget", budgetId));
        budgetDao.delete(budget);
    }

    @Override
    public Budget modifyBudget(UUID userId, UUID budgetId, String name,
                               BudgetPeriodicity periodicity, LocalDate startDate,
                               String iconName, String iconBgColor)
            throws InstanceNotFoundException {
        Budget budget = budgetDao.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Budget", budgetId));

        if (name != null) {
            if (name.isBlank()) {
                throw new BudgetInvalidException("Budget name cannot be blank");
            }
            budget.setName(name.trim());
        }
        if (periodicity != null) {
            budget.setPeriodicity(periodicity);
        }
        if (startDate != null) {
            budget.setStartDate(startDate);
        }
        if (iconName != null) {
            budget.setIconName(sanitizeOptional(iconName));
        }
        if (iconBgColor != null) {
            budget.setIconBgColor(sanitizeOptional(iconBgColor));
        }

        budgetDao.save(budget);
        return budget;
    }

    @Override
    public Budget modifyBudget(UUID userId, UUID budgetId, String name,
                               BudgetPeriodicity periodicity, LocalDate startDate)
            throws InstanceNotFoundException {
        return modifyBudget(userId, budgetId, name, periodicity, startDate, null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Budget> findAllByUserId(UUID userId) {
        return budgetDao.findAllByUserIdOrderByNameAsc(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public Budget findByIdAndUserId(UUID budgetId, UUID userId) throws InstanceNotFoundException {
        return budgetDao.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Budget", budgetId));
    }

    // ── Budget category CRUD ────────────────────────────────────────────

    @Override
    public BudgetCategory createBudgetCategory(UUID userId, UUID budgetId, String name,
                                                BigDecimal maxAmount, List<UUID> linkedCategoryIds,
                                                String iconName, String iconBgColor)
            throws InstanceNotFoundException {
        Budget budget = budgetDao.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Budget", budgetId));

        validateCategoryFields(name, maxAmount);

        if (budgetCategoryDao.countByBudgetId(budgetId) >= MAX_CATEGORIES_PER_BUDGET) {
            throw new BudgetInvalidException(
                    "Maximum number of categories (" + MAX_CATEGORIES_PER_BUDGET + ") reached");
        }

        int order = budget.getCategories().size();
        BudgetCategory bc = new BudgetCategory(name.trim(), maxAmount, order, budget, iconName, iconBgColor);

        if (linkedCategoryIds != null && !linkedCategoryIds.isEmpty()) {
            Set<Category> categories = new HashSet<>(
                    categoryDao.findAllById(linkedCategoryIds));
            bc.getLinkedCategories().addAll(categories);
        }

        budgetCategoryDao.save(bc);
        return bc;
    }

    @Override
    public BudgetCategory modifyBudgetCategory(UUID userId, UUID budgetId, UUID categoryId,
                                                String name, BigDecimal maxAmount,
                                                List<UUID> linkedCategoryIds,
                                                String iconName, String iconBgColor)
            throws InstanceNotFoundException {
        budgetDao.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Budget", budgetId));

        BudgetCategory bc = budgetCategoryDao.findByIdAndBudgetId(categoryId, budgetId)
                .orElseThrow(() -> new InstanceNotFoundException("BudgetCategory", categoryId));

        if (name != null) {
            if (name.isBlank()) {
                throw new BudgetInvalidException("Category name cannot be blank");
            }
            bc.setName(name.trim());
        }
        if (maxAmount != null) {
            if (maxAmount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new BudgetInvalidException("Maximum amount must be positive");
            }
            bc.setMaxAmount(maxAmount);
        }
        if (linkedCategoryIds != null) {
            bc.getLinkedCategories().clear();
            if (!linkedCategoryIds.isEmpty()) {
                Set<Category> categories = new HashSet<>(
                        categoryDao.findAllById(linkedCategoryIds));
                bc.getLinkedCategories().addAll(categories);
            }
        }
        if (iconName != null) {
            bc.setIconName(iconName);
        }
        if (iconBgColor != null) {
            bc.setIconBgColor(iconBgColor);
        }

        budgetCategoryDao.save(bc);
        return bc;
    }

    @Override
    public void deleteBudgetCategory(UUID userId, UUID budgetId, UUID categoryId)
            throws InstanceNotFoundException {
        budgetDao.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Budget", budgetId));

        BudgetCategory bc = budgetCategoryDao.findByIdAndBudgetId(categoryId, budgetId)
                .orElseThrow(() -> new InstanceNotFoundException("BudgetCategory", categoryId));

        budgetCategoryDao.delete(bc);
    }

    // ── Manual transaction linking ──────────────────────────────────────

    @Override
    public void linkTransaction(UUID userId, UUID budgetId, UUID categoryId, UUID transactionId)
            throws InstanceNotFoundException {
        budgetDao.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Budget", budgetId));

        BudgetCategory bc = budgetCategoryDao.findByIdAndBudgetId(categoryId, budgetId)
                .orElseThrow(() -> new InstanceNotFoundException("BudgetCategory", categoryId));

        Transaction tx = transactionDao.findByIdAndUserId(transactionId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Transaction", transactionId));

        bc.getManualTransactions().add(tx);
        budgetCategoryDao.save(bc);
    }

    @Override
    public void unlinkTransaction(UUID userId, UUID budgetId, UUID categoryId, UUID transactionId)
            throws InstanceNotFoundException {
        budgetDao.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Budget", budgetId));

        BudgetCategory bc = budgetCategoryDao.findByIdAndBudgetId(categoryId, budgetId)
                .orElseThrow(() -> new InstanceNotFoundException("BudgetCategory", categoryId));

        Transaction tx = transactionDao.findByIdAndUserId(transactionId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Transaction", transactionId));

        bc.getManualTransactions().remove(tx);
        budgetCategoryDao.save(bc);
    }

    // ── Period calculation ──────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public LocalDate[] getCurrentPeriodDates(Budget budget) {
        return getPeriodContaining(budget.getPeriodicity(), budget.getStartDate(), LocalDate.now());
    }

    @Override
    @Transactional(readOnly = true)
    public LocalDate[] getPreviousPeriodDates(Budget budget) {
        LocalDate[] current = getCurrentPeriodDates(budget);
        LocalDate previousEnd = current[0].minusDays(1);
        return getPeriodContaining(budget.getPeriodicity(), budget.getStartDate(), previousEnd);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal calculateSpent(UUID userId, BudgetCategory category,
                                     LocalDate periodStart, LocalDate periodEnd) {
        Set<UUID> transactionIds = new HashSet<>();
        BigDecimal total = BigDecimal.ZERO;

        // 1. Auto-linked via transaction categories
        List<UUID> linkedCatIds = category.getLinkedCategories().stream()
                .map(Category::getId)
                .collect(Collectors.toList());

        if (!linkedCatIds.isEmpty()) {
            List<Transaction> autoLinked = transactionDao
                    .findExpensesByCategoryIdsAndDateRange(
                            category.getBudget().getUser().getId(),
                            linkedCatIds, periodStart, periodEnd);
            for (Transaction tx : autoLinked) {
                transactionIds.add(tx.getId());
                total = total.add(tx.getAmount());
            }
        }

        // 2. Manually linked transactions (in the period, not already counted)
        for (Transaction tx : category.getManualTransactions()) {
            if (!transactionIds.contains(tx.getId())
                    && !tx.getDate().isBefore(periodStart)
                    && !tx.getDate().isAfter(periodEnd)) {
                total = total.add(tx.getAmount());
            }
        }

        return total;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Transaction> getTransactionsInPeriod(UUID userId, BudgetCategory category,
                                                     LocalDate periodStart, LocalDate periodEnd) {
        Set<UUID> seenIds = new HashSet<>();
        List<Transaction> result = new ArrayList<>();

        // Auto-linked via transaction categories
        List<UUID> linkedCatIds = category.getLinkedCategories().stream()
                .map(Category::getId)
                .collect(Collectors.toList());

        if (!linkedCatIds.isEmpty()) {
            List<Transaction> autoLinked = transactionDao
                    .findExpensesByCategoryIdsAndDateRange(userId, linkedCatIds, periodStart, periodEnd);
            for (Transaction tx : autoLinked) {
                seenIds.add(tx.getId());
                result.add(tx);
            }
        }

        // Manually linked
        for (Transaction tx : category.getManualTransactions()) {
            if (!seenIds.contains(tx.getId())
                    && !tx.getDate().isBefore(periodStart)
                    && !tx.getDate().isAfter(periodEnd)) {
                result.add(tx);
            }
        }

        return result;
    }

    // ── Private helpers ─────────────────────────────────────────────────

    private void validateCategoryFields(String name, BigDecimal maxAmount) {
        if (name == null || name.isBlank()) {
            throw new BudgetInvalidException("Category name is required");
        }
        if (maxAmount == null || maxAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BudgetInvalidException("Maximum amount must be positive");
        }
    }

    /**
     * Given a periodicity, the budget start date, and a reference date,
     * returns [periodStart, periodEnd] that contains the reference date.
     */
    private LocalDate[] getPeriodContaining(BudgetPeriodicity periodicity,
                                            LocalDate budgetStart, LocalDate reference) {
        if (reference.isBefore(budgetStart)) {
            // Before the budget even started — return the first period
            LocalDate end = advanceByPeriod(budgetStart, periodicity).minusDays(1);
            return new LocalDate[]{budgetStart, end};
        }

        LocalDate periodStart = budgetStart;
        LocalDate periodEnd;

        while (true) {
            periodEnd = advanceByPeriod(periodStart, periodicity).minusDays(1);
            if (!reference.isAfter(periodEnd)) {
                return new LocalDate[]{periodStart, periodEnd};
            }
            periodStart = periodEnd.plusDays(1);
        }
    }

    private LocalDate advanceByPeriod(LocalDate date, BudgetPeriodicity periodicity) {
        return switch (periodicity) {
            case WEEKLY -> date.plusWeeks(1);
            case MONTHLY -> date.plusMonths(1);
            case QUARTERLY -> date.plusMonths(3);
            case FOUR_MONTHLY -> date.plusMonths(4);
            case BIANNUAL -> date.plusMonths(6);
            case ANNUAL -> date.plusYears(1);
        };
    }

    private String sanitizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
