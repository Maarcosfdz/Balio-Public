package Balio.web.model.services;

import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.Goal;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Defines the contract for goal-related operations.
 * Every method requires the userId to guarantee that only the owner
 * can operate on their own goals.
 */
public interface GoalService {

    /**
     * Creates a new savings goal for the user.
     *
     * @throws Balio.web.model.Exceptions.UserNotFoundException if the user does not exist
     * @throws Balio.web.model.Exceptions.GoalInvalidException  if validation fails
     */
    Goal createGoal(UUID userId, String name, BigDecimal targetAmount,
                    String iconName, String iconBgColor, List<UUID> linkedAccountIds);

    default Goal createGoal(UUID userId, String name, BigDecimal targetAmount) {
        return createGoal(userId, name, targetAmount, null, null, null);
    }

    /**
     * Deletes a goal owned by the user.
     *
     * @throws InstanceNotFoundException if the goal does not exist or does not belong to the user
     */
    void deleteGoal(UUID userId, UUID goalId) throws InstanceNotFoundException;

    /**
     * Modifies the name, targetAmount, icon and/or linked accounts of a goal.
     * Only non-null parameters are applied.
     *
     * @throws InstanceNotFoundException if the goal does not exist or does not belong to the user
     */
    Goal modifyGoal(UUID userId, UUID goalId, String name, BigDecimal targetAmount,
                    String iconName, String iconBgColor, List<UUID> linkedAccountIds)
            throws InstanceNotFoundException;

    default Goal modifyGoal(UUID userId, UUID goalId, String name, BigDecimal targetAmount)
            throws InstanceNotFoundException {
        return modifyGoal(userId, goalId, name, targetAmount, null, null, null);
    }

    /**
     * Adds money to the goal's currentAmount.
     * Validates that the new total does not exceed the balance of linked accounts.
     *
     * @throws InstanceNotFoundException if the goal does not exist or does not belong to the user
     * @throws Balio.web.model.Exceptions.GoalInvalidException if amount is not positive or would
     *         exceed the combined balance of the linked accounts (considering all sharing goals)
     */
    Goal addMoney(UUID userId, UUID goalId, BigDecimal amount) throws InstanceNotFoundException;

    /**
     * Withdraws money from the goal's currentAmount.
     *
     * @throws InstanceNotFoundException if the goal does not exist or does not belong to the user
     * @throws Balio.web.model.Exceptions.GoalInvalidException if amount is not positive or
     *         would result in a negative currentAmount
     */
    Goal withdrawMoney(UUID userId, UUID goalId, BigDecimal amount) throws InstanceNotFoundException;

    /**
     * Returns all goals belonging to the user, ordered by name.
     */
    List<Goal> findAllByUserId(UUID userId);

    /**
     * Returns a single goal belonging to the user.
     *
     * @throws InstanceNotFoundException if the goal does not exist or does not belong to the user
     */
    Goal findByIdAndUserId(UUID goalId, UUID userId) throws InstanceNotFoundException;
}
