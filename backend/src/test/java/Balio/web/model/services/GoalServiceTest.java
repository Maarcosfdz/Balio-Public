package Balio.web.model.services;

import Balio.web.model.Exceptions.GoalInvalidException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Goal;
import Balio.web.model.entities.GoalDao;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GoalServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID GOAL_ID = UUID.randomUUID();
    private static final String VALID_NAME = "Vacation Fund";
    private static final BigDecimal TARGET = new BigDecimal("1000.00");

    @Mock private UserDao userDao;
    @Mock private GoalDao goalDao;
    @InjectMocks private GoalServiceImpl goalService;

    private User user;
    private Goal existingGoal;

    @BeforeEach
    void setUp() {
        user = new User("Nick", "nick@example.com", "encodedPwd");
        setFieldViaReflection(user, "id", USER_ID);

        existingGoal = new Goal(VALID_NAME, TARGET, user);
        setFieldViaReflection(existingGoal, "id", GOAL_ID);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  createGoal
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("createGoal")
    class CreateGoalTests {

        @Test
        @DisplayName("creates goal with valid params")
        void createsGoalWithValidParams() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(goalDao.save(any(Goal.class))).thenAnswer(inv -> inv.getArgument(0));

            Goal result = goalService.createGoal(USER_ID, VALID_NAME, TARGET);

            assertNotNull(result);
            assertEquals(VALID_NAME, result.getName());
            assertEquals(TARGET, result.getTargetAmount());
            assertEquals(BigDecimal.ZERO, result.getCurrentAmount());
            assertEquals(user, result.getUser());

            verify(goalDao).save(any(Goal.class));
        }

        @Test
        @DisplayName("trims whitespace from name")
        void trimsName() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(goalDao.save(any(Goal.class))).thenAnswer(inv -> inv.getArgument(0));

            Goal result = goalService.createGoal(USER_ID, "  My Goal  ", TARGET);

            assertEquals("My Goal", result.getName());
        }

        @Test
        @DisplayName("throws UserNotFoundException when user does not exist")
        void throwsWhenUserNotFound() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.empty());

            assertThrows(UserNotFoundException.class,
                    () -> goalService.createGoal(USER_ID, VALID_NAME, TARGET));

            verify(goalDao, never()).save(any());
        }

        @ParameterizedTest
        @NullSource
        @ValueSource(strings = {"", "   "})
        @DisplayName("throws GoalInvalidException when name is null/blank")
        void throwsWhenNameBlank(String name) {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            assertThrows(GoalInvalidException.class,
                    () -> goalService.createGoal(USER_ID, name, TARGET));

            verify(goalDao, never()).save(any());
        }

        @Test
        @DisplayName("throws GoalInvalidException when targetAmount is null")
        void throwsWhenTargetNull() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            assertThrows(GoalInvalidException.class,
                    () -> goalService.createGoal(USER_ID, VALID_NAME, null));

            verify(goalDao, never()).save(any());
        }

        @Test
        @DisplayName("throws GoalInvalidException when targetAmount is zero")
        void throwsWhenTargetZero() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            assertThrows(GoalInvalidException.class,
                    () -> goalService.createGoal(USER_ID, VALID_NAME, BigDecimal.ZERO));
        }

        @Test
        @DisplayName("throws GoalInvalidException when targetAmount is negative")
        void throwsWhenTargetNegative() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            assertThrows(GoalInvalidException.class,
                    () -> goalService.createGoal(USER_ID, VALID_NAME, new BigDecimal("-10")));
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  deleteGoal
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("deleteGoal")
    class DeleteGoalTests {

        @Test
        @DisplayName("deletes goal successfully")
        void deletesGoal() throws InstanceNotFoundException {
            when(goalDao.findByIdAndUserId(GOAL_ID, USER_ID)).thenReturn(Optional.of(existingGoal));

            goalService.deleteGoal(USER_ID, GOAL_ID);

            verify(goalDao).delete(existingGoal);
        }

        @Test
        @DisplayName("throws InstanceNotFoundException when goal not found")
        void throwsWhenNotFound() {
            when(goalDao.findByIdAndUserId(GOAL_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> goalService.deleteGoal(USER_ID, GOAL_ID));

            verify(goalDao, never()).delete(any());
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  modifyGoal
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("modifyGoal")
    class ModifyGoalTests {

        @Test
        @DisplayName("updates name only when name provided")
        void updatesNameOnly() throws InstanceNotFoundException {
            when(goalDao.findByIdAndUserId(GOAL_ID, USER_ID)).thenReturn(Optional.of(existingGoal));
            when(goalDao.save(any(Goal.class))).thenAnswer(inv -> inv.getArgument(0));

            Goal result = goalService.modifyGoal(USER_ID, GOAL_ID, "New Name", null);

            assertEquals("New Name", result.getName());
            assertEquals(TARGET, result.getTargetAmount()); // unchanged
        }

        @Test
        @DisplayName("updates targetAmount only when targetAmount provided")
        void updatesTargetOnly() throws InstanceNotFoundException {
            when(goalDao.findByIdAndUserId(GOAL_ID, USER_ID)).thenReturn(Optional.of(existingGoal));
            when(goalDao.save(any(Goal.class))).thenAnswer(inv -> inv.getArgument(0));

            BigDecimal newTarget = new BigDecimal("2000.00");
            Goal result = goalService.modifyGoal(USER_ID, GOAL_ID, null, newTarget);

            assertEquals(VALID_NAME, result.getName()); // unchanged
            assertEquals(newTarget, result.getTargetAmount());
        }

        @Test
        @DisplayName("updates both name and targetAmount")
        void updatesBoth() throws InstanceNotFoundException {
            when(goalDao.findByIdAndUserId(GOAL_ID, USER_ID)).thenReturn(Optional.of(existingGoal));
            when(goalDao.save(any(Goal.class))).thenAnswer(inv -> inv.getArgument(0));

            BigDecimal newTarget = new BigDecimal("5000.00");
            Goal result = goalService.modifyGoal(USER_ID, GOAL_ID, "Updated", newTarget);

            assertEquals("Updated", result.getName());
            assertEquals(newTarget, result.getTargetAmount());
        }

        @Test
        @DisplayName("trims whitespace from updated name")
        void trimsUpdatedName() throws InstanceNotFoundException {
            when(goalDao.findByIdAndUserId(GOAL_ID, USER_ID)).thenReturn(Optional.of(existingGoal));
            when(goalDao.save(any(Goal.class))).thenAnswer(inv -> inv.getArgument(0));

            Goal result = goalService.modifyGoal(USER_ID, GOAL_ID, "  Trimmed  ", null);

            assertEquals("Trimmed", result.getName());
        }

        @ParameterizedTest
        @ValueSource(strings = {"", "   "})
        @DisplayName("throws GoalInvalidException when name is blank (not null)")
        void throwsWhenNameBlank(String blankName) {
            when(goalDao.findByIdAndUserId(GOAL_ID, USER_ID)).thenReturn(Optional.of(existingGoal));

            assertThrows(GoalInvalidException.class,
                    () -> goalService.modifyGoal(USER_ID, GOAL_ID, blankName, null));
        }

        @Test
        @DisplayName("throws GoalInvalidException when targetAmount zero")
        void throwsWhenTargetZero() {
            when(goalDao.findByIdAndUserId(GOAL_ID, USER_ID)).thenReturn(Optional.of(existingGoal));

            assertThrows(GoalInvalidException.class,
                    () -> goalService.modifyGoal(USER_ID, GOAL_ID, null, BigDecimal.ZERO));
        }

        @Test
        @DisplayName("throws GoalInvalidException when targetAmount negative")
        void throwsWhenTargetNeg() {
            when(goalDao.findByIdAndUserId(GOAL_ID, USER_ID)).thenReturn(Optional.of(existingGoal));

            assertThrows(GoalInvalidException.class,
                    () -> goalService.modifyGoal(USER_ID, GOAL_ID, null, new BigDecimal("-5")));
        }

        @Test
        @DisplayName("throws InstanceNotFoundException when goal not found")
        void throwsWhenNotFound() {
            when(goalDao.findByIdAndUserId(GOAL_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> goalService.modifyGoal(USER_ID, GOAL_ID, "X", null));
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  addMoney
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("addMoney")
    class AddMoneyTests {

        @Test
        @DisplayName("adds money to goal")
        void addsMoney() throws InstanceNotFoundException {
            existingGoal.setCurrentAmount(new BigDecimal("200.00"));
            when(goalDao.findByIdAndUserId(GOAL_ID, USER_ID)).thenReturn(Optional.of(existingGoal));
            when(goalDao.save(any(Goal.class))).thenAnswer(inv -> inv.getArgument(0));

            Goal result = goalService.addMoney(USER_ID, GOAL_ID, new BigDecimal("300.00"));

            assertEquals(new BigDecimal("500.00"), result.getCurrentAmount());
            verify(goalDao).save(existingGoal);
        }

        @Test
        @DisplayName("adds money to goal with zero currentAmount")
        void addsMoneyFromZero() throws InstanceNotFoundException {
            when(goalDao.findByIdAndUserId(GOAL_ID, USER_ID)).thenReturn(Optional.of(existingGoal));
            when(goalDao.save(any(Goal.class))).thenAnswer(inv -> inv.getArgument(0));

            Goal result = goalService.addMoney(USER_ID, GOAL_ID, new BigDecimal("150.00"));

            assertEquals(new BigDecimal("150.00"), result.getCurrentAmount());
        }

        @Test
        @DisplayName("throws GoalInvalidException when amount is null")
        void throwsWhenAmountNull() {
            assertThrows(GoalInvalidException.class,
                    () -> goalService.addMoney(USER_ID, GOAL_ID, null));
        }

        @Test
        @DisplayName("throws GoalInvalidException when amount is zero")
        void throwsWhenAmountZero() {
            assertThrows(GoalInvalidException.class,
                    () -> goalService.addMoney(USER_ID, GOAL_ID, BigDecimal.ZERO));
        }

        @Test
        @DisplayName("throws GoalInvalidException when amount is negative")
        void throwsWhenAmountNeg() {
            assertThrows(GoalInvalidException.class,
                    () -> goalService.addMoney(USER_ID, GOAL_ID, new BigDecimal("-1")));
        }

        @Test
        @DisplayName("throws InstanceNotFoundException when goal not found")
        void throwsWhenNotFound() {
            when(goalDao.findByIdAndUserId(GOAL_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> goalService.addMoney(USER_ID, GOAL_ID, new BigDecimal("100")));
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  withdrawMoney
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("withdrawMoney")
    class WithdrawMoneyTests {

        @Test
        @DisplayName("withdraws money successfully")
        void withdrawsMoney() throws InstanceNotFoundException {
            existingGoal.setCurrentAmount(new BigDecimal("500.00"));
            when(goalDao.findByIdAndUserId(GOAL_ID, USER_ID)).thenReturn(Optional.of(existingGoal));
            when(goalDao.save(any(Goal.class))).thenAnswer(inv -> inv.getArgument(0));

            Goal result = goalService.withdrawMoney(USER_ID, GOAL_ID, new BigDecimal("200.00"));

            assertEquals(new BigDecimal("300.00"), result.getCurrentAmount());
        }

        @Test
        @DisplayName("withdraws all money (balance goes to zero)")
        void withdrawsAll() throws InstanceNotFoundException {
            existingGoal.setCurrentAmount(new BigDecimal("500.00"));
            when(goalDao.findByIdAndUserId(GOAL_ID, USER_ID)).thenReturn(Optional.of(existingGoal));
            when(goalDao.save(any(Goal.class))).thenAnswer(inv -> inv.getArgument(0));

            Goal result = goalService.withdrawMoney(USER_ID, GOAL_ID, new BigDecimal("500.00"));

            assertEquals(BigDecimal.ZERO.setScale(2), result.getCurrentAmount().setScale(2));
        }

        @Test
        @DisplayName("throws GoalInvalidException when insufficient funds")
        void throwsWhenInsufficientFunds() {
            existingGoal.setCurrentAmount(new BigDecimal("100.00"));
            when(goalDao.findByIdAndUserId(GOAL_ID, USER_ID)).thenReturn(Optional.of(existingGoal));

            assertThrows(GoalInvalidException.class,
                    () -> goalService.withdrawMoney(USER_ID, GOAL_ID, new BigDecimal("200.00")));

            verify(goalDao, never()).save(any());
        }

        @Test
        @DisplayName("throws GoalInvalidException when amount is null")
        void throwsWhenAmountNull() {
            assertThrows(GoalInvalidException.class,
                    () -> goalService.withdrawMoney(USER_ID, GOAL_ID, null));
        }

        @Test
        @DisplayName("throws GoalInvalidException when amount is zero")
        void throwsWhenAmountZero() {
            assertThrows(GoalInvalidException.class,
                    () -> goalService.withdrawMoney(USER_ID, GOAL_ID, BigDecimal.ZERO));
        }

        @Test
        @DisplayName("throws GoalInvalidException when amount is negative")
        void throwsWhenAmountNeg() {
            assertThrows(GoalInvalidException.class,
                    () -> goalService.withdrawMoney(USER_ID, GOAL_ID, new BigDecimal("-50")));
        }

        @Test
        @DisplayName("throws InstanceNotFoundException when goal not found")
        void throwsWhenNotFound() {
            when(goalDao.findByIdAndUserId(GOAL_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> goalService.withdrawMoney(USER_ID, GOAL_ID, new BigDecimal("10")));
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  findAllByUserId
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("findAllByUserId")
    class FindAllTests {

        @Test
        @DisplayName("returns all goals for user")
        void returnsAllGoals() {
            Goal g2 = new Goal("Emergency Fund", new BigDecimal("5000"), user);
            setFieldViaReflection(g2, "id", UUID.randomUUID());

            when(goalDao.findAllByUserIdOrderByNameAsc(USER_ID))
                    .thenReturn(List.of(g2, existingGoal));

            List<Goal> result = goalService.findAllByUserId(USER_ID);

            assertEquals(2, result.size());
            verify(goalDao).findAllByUserIdOrderByNameAsc(USER_ID);
        }

        @Test
        @DisplayName("returns empty list when user has no goals")
        void returnsEmptyList() {
            when(goalDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());

            List<Goal> result = goalService.findAllByUserId(USER_ID);

            assertTrue(result.isEmpty());
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  findByIdAndUserId
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("findByIdAndUserId")
    class FindByIdTests {

        @Test
        @DisplayName("returns goal when found")
        void returnsGoal() throws InstanceNotFoundException {
            when(goalDao.findByIdAndUserId(GOAL_ID, USER_ID)).thenReturn(Optional.of(existingGoal));

            Goal result = goalService.findByIdAndUserId(GOAL_ID, USER_ID);

            assertEquals(existingGoal, result);
        }

        @Test
        @DisplayName("throws InstanceNotFoundException when not found")
        void throwsWhenNotFound() {
            when(goalDao.findByIdAndUserId(GOAL_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> goalService.findByIdAndUserId(GOAL_ID, USER_ID));
        }
    }

    /* ───── helper ───── */

    private static void setFieldViaReflection(Object target, String fieldName, Object value) {
        try {
            java.lang.reflect.Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException("Cannot set field " + fieldName, e);
        }
    }
}
