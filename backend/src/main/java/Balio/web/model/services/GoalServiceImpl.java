package Balio.web.model.services;

import Balio.web.model.Exceptions.GoalInvalidException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Goal;
import Balio.web.model.entities.GoalDao;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;
import Balio.web.util.StringUtils;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class GoalServiceImpl implements GoalService {

    private final UserDao userDao;
    private final GoalDao goalDao;

    public GoalServiceImpl(UserDao userDao, GoalDao goalDao) {
        this.userDao = userDao;
        this.goalDao = goalDao;
    }

    @Override
    public Goal createGoal(UUID userId, String name, BigDecimal targetAmount,
                           String iconName, String iconBgColor) {

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
        goalDao.save(goal);
        return goal;
    }

    @Override
    public Goal createGoal(UUID userId, String name, BigDecimal targetAmount) {
        return createGoal(userId, name, targetAmount, null, null);
    }

    @Override
    public void deleteGoal(UUID userId, UUID goalId) throws InstanceNotFoundException {

        Goal goal = goalDao.findByIdAndUserId(goalId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Goal", goalId));

        goalDao.delete(goal);
    }

    @Override
    public Goal modifyGoal(UUID userId, UUID goalId, String name, BigDecimal targetAmount,
                           String iconName, String iconBgColor)
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

        goalDao.save(goal);
        return goal;
    }

    @Override
    public Goal modifyGoal(UUID userId, UUID goalId, String name, BigDecimal targetAmount)
            throws InstanceNotFoundException {
        return modifyGoal(userId, goalId, name, targetAmount, null, null);
    }

    @Override
    public Goal addMoney(UUID userId, UUID goalId, BigDecimal amount) throws InstanceNotFoundException {

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new GoalInvalidException("Amount must be positive");
        }

        Goal goal = goalDao.findByIdAndUserId(goalId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Goal", goalId));

        goal.setCurrentAmount(goal.getCurrentAmount().add(amount));
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

}
