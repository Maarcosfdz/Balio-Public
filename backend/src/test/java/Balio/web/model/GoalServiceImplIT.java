package Balio.web.model;

import Balio.web.model.Exceptions.GoalInvalidException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Goal;
import Balio.web.model.entities.GoalDao;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;
import Balio.web.model.services.GoalService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests for {@link GoalService} with a real H2 database.
 *
 * Verifies that:
 * - Goals are actually persisted and retrieved from H2
 * - Business rules (name, amounts) are enforced end-to-end
 * - Data isolation between users is correct
 *
 * {@code @Transactional} ensures each test rolls back after completion.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DisplayName("GoalService — Integration Tests")
class GoalServiceImplIT {

    @Autowired GoalService goalService;
    @Autowired UserDao userDao;
    @Autowired GoalDao goalDao;

    private User user;

    @BeforeEach
    void setUp() {
        user = userDao.save(new User("Tester", unique("goal"), "hashed-pwd"));
    }

    // ═══════════════════════════════════════════════════════════════════
    //  createGoal
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("createGoal")
    class CreateGoal {

        @Test
        @DisplayName("persists goal in DB and returns it with correct values")
        void persists() {
            Goal created = goalService.createGoal(user.getId(), "Vacation", new BigDecimal("1500.00"));

            assertThat(created.getId()).isNotNull();
            assertThat(created.getName()).isEqualTo("Vacation");
            assertThat(created.getTargetAmount()).isEqualByComparingTo("1500.00");
            assertThat(created.getCurrentAmount()).isEqualByComparingTo("0.00");
            assertThat(created.getUser().getId()).isEqualTo(user.getId());

            // Verify it is actually in the DB
            assertThat(goalDao.findById(created.getId())).isPresent();
        }

        @Test
        @DisplayName("currentAmount defaults to zero")
        void currentAmountIsZero() {
            Goal goal = goalService.createGoal(user.getId(), "Car Fund", new BigDecimal("10000"));
            assertThat(goal.getCurrentAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        }

        @Test
        @DisplayName("throws UserNotFoundException for non-existent user")
        void unknownUser() {
            assertThatThrownBy(() ->
                    goalService.createGoal(UUID.randomUUID(), "X", new BigDecimal("100")))
                    .isInstanceOf(UserNotFoundException.class);
        }

        @Test
        @DisplayName("throws GoalInvalidException for blank name")
        void blankName() {
            assertThatThrownBy(() ->
                    goalService.createGoal(user.getId(), "  ", new BigDecimal("100")))
                    .isInstanceOf(GoalInvalidException.class);
        }

        @Test
        @DisplayName("throws GoalInvalidException for zero targetAmount")
        void zeroTarget() {
            assertThatThrownBy(() ->
                    goalService.createGoal(user.getId(), "Goal", BigDecimal.ZERO))
                    .isInstanceOf(GoalInvalidException.class);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  deleteGoal
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("deleteGoal")
    class DeleteGoal {

        @Test
        @DisplayName("removes goal from DB")
        void removes() throws InstanceNotFoundException {
            Goal goal = goalService.createGoal(user.getId(), "Temp", new BigDecimal("500"));
            UUID goalId = goal.getId();

            goalService.deleteGoal(user.getId(), goalId);

            assertThat(goalDao.findById(goalId)).isEmpty();
        }

        @Test
        @DisplayName("throws InstanceNotFoundException for wrong user")
        void wrongUser() {
            Goal goal = goalService.createGoal(user.getId(), "Mine", new BigDecimal("200"));

            User other = userDao.save(new User("Other", unique("del"), "hash"));
            assertThatThrownBy(() -> goalService.deleteGoal(other.getId(), goal.getId()))
                    .isInstanceOf(InstanceNotFoundException.class);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  modifyGoal
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("modifyGoal")
    class ModifyGoal {

        @Test
        @DisplayName("updates name in DB")
        void updatesName() throws InstanceNotFoundException {
            Goal goal = goalService.createGoal(user.getId(), "Old Name", new BigDecimal("1000"));

            goalService.modifyGoal(user.getId(), goal.getId(), "New Name", null);

            Goal fetched = goalDao.findById(goal.getId()).orElseThrow();
            assertThat(fetched.getName()).isEqualTo("New Name");
        }

        @Test
        @DisplayName("updates targetAmount in DB")
        void updatesTarget() throws InstanceNotFoundException {
            Goal goal = goalService.createGoal(user.getId(), "Fund", new BigDecimal("1000"));

            goalService.modifyGoal(user.getId(), goal.getId(), null, new BigDecimal("2000"));

            Goal fetched = goalDao.findById(goal.getId()).orElseThrow();
            assertThat(fetched.getTargetAmount()).isEqualByComparingTo("2000.00");
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  addMoney / withdrawMoney
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("addMoney / withdrawMoney")
    class MoneyOperations {

        @Test
        @DisplayName("addMoney increases currentAmount in DB")
        void addMoney() throws InstanceNotFoundException {
            Goal goal = goalService.createGoal(user.getId(), "Savings", new BigDecimal("1000"));

            goalService.addMoney(user.getId(), goal.getId(), new BigDecimal("250"));

            Goal fetched = goalDao.findById(goal.getId()).orElseThrow();
            assertThat(fetched.getCurrentAmount()).isEqualByComparingTo("250.00");
        }

        @Test
        @DisplayName("withdrawMoney decreases currentAmount in DB")
        void withdrawMoney() throws InstanceNotFoundException {
            Goal goal = goalService.createGoal(user.getId(), "Savings", new BigDecimal("1000"));
            goalService.addMoney(user.getId(), goal.getId(), new BigDecimal("500"));

            goalService.withdrawMoney(user.getId(), goal.getId(), new BigDecimal("200"));

            Goal fetched = goalDao.findById(goal.getId()).orElseThrow();
            assertThat(fetched.getCurrentAmount()).isEqualByComparingTo("300.00");
        }

        @Test
        @DisplayName("withdrawMoney throws when amount exceeds currentAmount")
        void withdrawExceeds() throws InstanceNotFoundException {
            Goal goal = goalService.createGoal(user.getId(), "Fund", new BigDecimal("1000"));
            goalService.addMoney(user.getId(), goal.getId(), new BigDecimal("100"));

            assertThatThrownBy(() -> goalService.withdrawMoney(user.getId(), goal.getId(), new BigDecimal("500")))
                    .isInstanceOf(GoalInvalidException.class)
                    .hasMessageContaining("Insufficient");
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  findAllByUserId
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("findAllByUserId")
    class FindAll {

        @Test
        @DisplayName("returns goals ordered by name ascending")
        void orderedByName() {
            goalService.createGoal(user.getId(), "Zebra Fund", new BigDecimal("100"));
            goalService.createGoal(user.getId(), "Apple Fund", new BigDecimal("200"));
            goalService.createGoal(user.getId(), "Middle Fund", new BigDecimal("300"));

            List<Goal> goals = goalService.findAllByUserId(user.getId());

            assertThat(goals).hasSizeGreaterThanOrEqualTo(3);
            assertThat(goals.get(0).getName()).isEqualTo("Apple Fund");
            assertThat(goals.get(1).getName()).isEqualTo("Middle Fund");
        }

        @Test
        @DisplayName("does not return goals from other users")
        void isolatedByUser() {
            goalService.createGoal(user.getId(), "My Goal", new BigDecimal("500"));

            User other = userDao.save(new User("Other", unique("iso"), "hash"));
            goalService.createGoal(other.getId(), "Other Goal", new BigDecimal("500"));

            List<Goal> goals = goalService.findAllByUserId(user.getId());

            assertThat(goals).allMatch(g -> g.getUser().getId().equals(user.getId()));
        }
    }

    // ── helper ───────────────────────────────────────────────────────

    private static String unique(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@test.com";
    }
}
