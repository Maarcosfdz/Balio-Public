package Balio.web.model.services;

import Balio.web.model.Exceptions.GoalInvalidException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.AccountDao;
import Balio.web.model.entities.Goal;
import Balio.web.model.entities.GoalDao;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;
import Balio.web.util.StringUtils;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class GoalServiceImpl implements GoalService {

    private final UserDao userDao;
    private final GoalDao goalDao;
    private final AccountDao accountDao;

    public GoalServiceImpl(UserDao userDao, GoalDao goalDao, AccountDao accountDao) {
        this.userDao = userDao;
        this.goalDao = goalDao;
        this.accountDao = accountDao;
    }

    @Override
    public Goal createGoal(UUID userId, String name, BigDecimal targetAmount,
                           String iconName, String iconBgColor, List<UUID> linkedAccountIds) {

        User user = userDao.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        if (name == null || name.isBlank()) {
            throw new GoalInvalidException("Goal name is required");
        }
        if (targetAmount == null || targetAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new GoalInvalidException("Target amount must be positive");
        }

        Goal goal = new Goal(
                name.trim(), targetAmount, user,
                StringUtils.sanitizeOptional(iconName), StringUtils.sanitizeOptional(iconBgColor));

        Set<Account> accounts = resolveAccounts(userId, linkedAccountIds);
        goal.setLinkedAccounts(accounts);

        goalDao.save(goal);
        return goal;
    }

    @Override
    public Goal createGoal(UUID userId, String name, BigDecimal targetAmount) {
        return createGoal(userId, name, targetAmount, null, null, null);
    }

    @Override
    public void deleteGoal(UUID userId, UUID goalId) throws InstanceNotFoundException {

        Goal goal = goalDao.findByIdAndUserId(goalId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Goal", goalId));

        goalDao.delete(goal);
    }

    @Override
    public Goal modifyGoal(UUID userId, UUID goalId, String name, BigDecimal targetAmount,
                           String iconName, String iconBgColor, List<UUID> linkedAccountIds)
            throws InstanceNotFoundException {

        Goal goal = goalDao.findByIdAndUserId(goalId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Goal", goalId));

        if (name != null) {
            if (name.isBlank()) {
                throw new GoalInvalidException("Goal name cannot be blank");
            }
            goal.setName(name.trim());
        }
        if (targetAmount != null) {
            if (targetAmount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new GoalInvalidException("Target amount must be positive");
            }
            goal.setTargetAmount(targetAmount);
        }
        if (iconName != null) {
            goal.setIconName(StringUtils.sanitizeOptional(iconName));
        }
        if (iconBgColor != null) {
            goal.setIconBgColor(StringUtils.sanitizeOptional(iconBgColor));
        }
        if (linkedAccountIds != null) {
            goal.setLinkedAccounts(resolveAccounts(userId, linkedAccountIds));
        }

        goalDao.save(goal);
        return goal;
    }

    @Override
    public Goal modifyGoal(UUID userId, UUID goalId, String name, BigDecimal targetAmount)
            throws InstanceNotFoundException {
        return modifyGoal(userId, goalId, name, targetAmount, null, null, null);
    }

    @Override
    public Goal addMoney(UUID userId, UUID goalId, BigDecimal amount) throws InstanceNotFoundException {

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new GoalInvalidException("Amount must be positive");
        }

        Goal goal = goalDao.findByIdAndUserId(goalId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Goal", goalId));

        BigDecimal newAmount = goal.getCurrentAmount().add(amount);
        validateLinkedAccountBudget(goal, newAmount, userId);

        goal.setCurrentAmount(newAmount);
        goalDao.save(goal);
        return goal;
    }

    @Override
    public Goal withdrawMoney(UUID userId, UUID goalId, BigDecimal amount) throws InstanceNotFoundException {

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new GoalInvalidException("Amount must be positive");
        }

        Goal goal = goalDao.findByIdAndUserId(goalId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Goal", goalId));

        BigDecimal newAmount = goal.getCurrentAmount().subtract(amount);
        if (newAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new GoalInvalidException("Insufficient funds: withdraw would result in negative balance");
        }

        goal.setCurrentAmount(newAmount);
        goalDao.save(goal);
        return goal;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Goal> findAllByUserId(UUID userId) {
        return goalDao.findAllByUserIdOrderByNameAsc(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public Goal findByIdAndUserId(UUID goalId, UUID userId) throws InstanceNotFoundException {
        return goalDao.findByIdAndUserId(goalId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Goal", goalId));
    }

    // ── Private helpers ──────────────────────────────────────────────────

    /**
     * Loads accounts by IDs and validates they belong to the user.
     */
    private Set<Account> resolveAccounts(UUID userId, List<UUID> accountIds) {
        if (accountIds == null || accountIds.isEmpty()) {
            return Collections.emptySet();
        }
        Set<Account> accounts = new HashSet<>();
        for (UUID accountId : accountIds) {
            Account account = accountDao.findByIdAndUserId(accountId, userId)
                    .orElseThrow(() -> new GoalInvalidException(
                            "Account not found or does not belong to user: " + accountId));
            accounts.add(account);
        }
        return accounts;
    }

    /**
     * Validates that setting this goal's currentAmount to {@code newAmount} does not
     * cause the sum of all goals sharing the same linked accounts to exceed their
     * combined balance.
     *
     * No-op when the goal has no linked accounts.
     */
    private void validateLinkedAccountBudget(Goal goal, BigDecimal newAmount, UUID userId) {
        Set<Account> linked = goal.getLinkedAccounts();
        if (linked.isEmpty()) {
            return;
        }

        BigDecimal totalBalance = linked.stream()
                .map(Account::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<UUID> accountIds = linked.stream().map(Account::getId).collect(Collectors.toList());

        BigDecimal otherGoalsTotal = goalDao
                .findByUserAndLinkedAccounts(userId, accountIds, goal.getId())
                .stream()
                .map(Goal::getCurrentAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (otherGoalsTotal.add(newAmount).compareTo(totalBalance) > 0) {
            throw new GoalInvalidException(
                    "Total saved amount across goals would exceed the combined balance of linked accounts " +
                    "(available: " + totalBalance.subtract(otherGoalsTotal).toPlainString() + ")");
        }
    }
}
