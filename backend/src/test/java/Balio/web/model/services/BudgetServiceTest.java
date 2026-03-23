package Balio.web.model.services;

import Balio.web.enums.BudgetPeriodicity;
import Balio.web.enums.TransactionType;
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

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link BudgetServiceImpl}.
 * Tests CRUD operations, period calculation for all periodicities,
 * spending calculation, transaction linking, and edge cases.
 */
@ExtendWith(MockitoExtension.class)
class BudgetServiceTest {

    private static final UUID USER_ID    = UUID.randomUUID();
    private static final UUID BUDGET_ID  = UUID.randomUUID();
    private static final UUID BC_ID      = UUID.randomUUID();
    private static final UUID CAT_ID     = UUID.randomUUID();
    private static final UUID TX_ID      = UUID.randomUUID();

    @Mock private UserDao           userDao;
    @Mock private BudgetDao         budgetDao;
    @Mock private BudgetCategoryDao budgetCategoryDao;
    @Mock private CategoryDao       categoryDao;
    @Mock private TransactionDao    transactionDao;

    @InjectMocks
    private BudgetServiceImpl service;

    private User            user;
    private Budget          budget;
    private BudgetCategory  budgetCategory;
    private Category        category;
    private Transaction     transaction;

    @BeforeEach
    void setUp() throws Exception {
        user = new User("testuser", "test@example.com", "password");
        setId(user, USER_ID);

        budget = new Budget("Monthly Budget", BudgetPeriodicity.MONTHLY,
                LocalDate.of(2026, 1, 1), user);
        setId(budget, BUDGET_ID);

        budgetCategory = new BudgetCategory("Food", new BigDecimal("500.00"), 0, budget);
        setId(budgetCategory, BC_ID);

        category = new Category("Groceries", TransactionType.EXPENSE, user);
        setId(category, CAT_ID);

        transaction = new Transaction("Supermarket", new BigDecimal("45.50"),
                LocalDate.of(2026, 1, 15), TransactionType.EXPENSE, user);
        setId(transaction, TX_ID);
    }

    // ── createBudget ────────────────────────────────────────────────────

    @Nested
    @DisplayName("createBudget")
    class CreateBudgetTests {

        @Test
        @DisplayName("valid creation returns saved budget")
        void validCreation() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(budgetDao.countByUserId(USER_ID)).thenReturn(0L);
            when(budgetDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Budget result = service.createBudget(USER_ID, "My Budget",
                    BudgetPeriodicity.MONTHLY, LocalDate.of(2026, 1, 1));

            assertNotNull(result);
            assertEquals("My Budget", result.getName());
            assertEquals(BudgetPeriodicity.MONTHLY, result.getPeriodicity());
        }

        @Test
        @DisplayName("name is trimmed on creation")
        void nameTrimmed() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(budgetDao.countByUserId(USER_ID)).thenReturn(0L);
            when(budgetDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Budget result = service.createBudget(USER_ID, "  Trimmed  ",
                    BudgetPeriodicity.WEEKLY, LocalDate.of(2026, 1, 1));

            assertEquals("Trimmed", result.getName());
        }

        @Test
        @DisplayName("null name throws BudgetInvalidException")
        void nullName() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            assertThrows(BudgetInvalidException.class, () ->
                    service.createBudget(USER_ID, null,
                            BudgetPeriodicity.MONTHLY, LocalDate.of(2026, 1, 1)));
        }

        @ParameterizedTest
        @ValueSource(strings = {"", " ", "   ", "\t"})
        @DisplayName("blank name throws BudgetInvalidException")
        void blankName(String name) {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            assertThrows(BudgetInvalidException.class, () ->
                    service.createBudget(USER_ID, name,
                            BudgetPeriodicity.MONTHLY, LocalDate.of(2026, 1, 1)));
        }

        @Test
        @DisplayName("null periodicity throws BudgetInvalidException")
        void nullPeriodicity() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            assertThrows(BudgetInvalidException.class, () ->
                    service.createBudget(USER_ID, "Budget", null, LocalDate.of(2026, 1, 1)));
        }

        @Test
        @DisplayName("null startDate throws BudgetInvalidException")
        void nullStartDate() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            assertThrows(BudgetInvalidException.class, () ->
                    service.createBudget(USER_ID, "Budget",
                            BudgetPeriodicity.MONTHLY, null));
        }

        @Test
        @DisplayName("user not found throws UserNotFoundException")
        void userNotFound() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.empty());

            assertThrows(UserNotFoundException.class, () ->
                    service.createBudget(USER_ID, "Budget",
                            BudgetPeriodicity.MONTHLY, LocalDate.of(2026, 1, 1)));
        }

        @Test
        @DisplayName("at limit (9/10 budgets) creation is allowed")
        void atLimitMinusOne() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(budgetDao.countByUserId(USER_ID)).thenReturn(9L);
            when(budgetDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            assertDoesNotThrow(() ->
                    service.createBudget(USER_ID, "Budget",
                            BudgetPeriodicity.MONTHLY, LocalDate.of(2026, 1, 1)));
        }

        @Test
        @DisplayName("at maximum limit (10) throws BudgetInvalidException")
        void maxLimitReached() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(budgetDao.countByUserId(USER_ID)).thenReturn(10L);

            BudgetInvalidException ex = assertThrows(BudgetInvalidException.class, () ->
                    service.createBudget(USER_ID, "Budget",
                            BudgetPeriodicity.MONTHLY, LocalDate.of(2026, 1, 1)));

            assertTrue(ex.getMessage().contains("10"));
        }

        @Test
        @DisplayName("all periodicities can be created")
        void allPeriodicities() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(budgetDao.countByUserId(USER_ID)).thenReturn(0L);
            when(budgetDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            for (BudgetPeriodicity p : BudgetPeriodicity.values()) {
                Budget b = service.createBudget(USER_ID, "Budget " + p,
                        p, LocalDate.of(2026, 1, 1));
                assertEquals(p, b.getPeriodicity());
            }
        }

        @Test
        @DisplayName("far future startDate is accepted")
        void farFutureStartDate() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(budgetDao.countByUserId(USER_ID)).thenReturn(0L);
            when(budgetDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            assertDoesNotThrow(() ->
                    service.createBudget(USER_ID, "Future Budget",
                            BudgetPeriodicity.ANNUAL, LocalDate.of(2099, 12, 31)));
        }

        @Test
        @DisplayName("past startDate is accepted")
        void pastStartDate() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(budgetDao.countByUserId(USER_ID)).thenReturn(0L);
            when(budgetDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            assertDoesNotThrow(() ->
                    service.createBudget(USER_ID, "Old Budget",
                            BudgetPeriodicity.MONTHLY, LocalDate.of(2020, 1, 1)));
        }
    }

    // ── deleteBudget ────────────────────────────────────────────────────

    @Nested
    @DisplayName("deleteBudget")
    class DeleteBudgetTests {

        @Test
        @DisplayName("valid deletion calls delete on repo")
        void validDelete() throws Exception {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));

            service.deleteBudget(USER_ID, BUDGET_ID);

            verify(budgetDao).delete(budget);
        }

        @Test
        @DisplayName("budget not found throws InstanceNotFoundException")
        void notFound() {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class, () ->
                    service.deleteBudget(USER_ID, BUDGET_ID));
        }

        @Test
        @DisplayName("other user's budget throws InstanceNotFoundException")
        void otherUsersBudget() {
            UUID otherUser = UUID.randomUUID();
            when(budgetDao.findByIdAndUserId(BUDGET_ID, otherUser))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class, () ->
                    service.deleteBudget(otherUser, BUDGET_ID));
        }
    }

    // ── modifyBudget ────────────────────────────────────────────────────

    @Nested
    @DisplayName("modifyBudget")
    class ModifyBudgetTests {

        @Test
        @DisplayName("update only name")
        void updateOnlyName() throws Exception {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));
            when(budgetDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Budget result = service.modifyBudget(USER_ID, BUDGET_ID,
                    "New Name", null, null);

            assertEquals("New Name", result.getName());
            assertEquals(BudgetPeriodicity.MONTHLY, result.getPeriodicity()); // unchanged
        }

        @Test
        @DisplayName("update only periodicity")
        void updateOnlyPeriodicity() throws Exception {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));
            when(budgetDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Budget result = service.modifyBudget(USER_ID, BUDGET_ID,
                    null, BudgetPeriodicity.ANNUAL, null);

            assertEquals(BudgetPeriodicity.ANNUAL, result.getPeriodicity());
            assertEquals("Monthly Budget", result.getName()); // unchanged
        }

        @Test
        @DisplayName("update only startDate")
        void updateOnlyStartDate() throws Exception {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));
            when(budgetDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            LocalDate newDate = LocalDate.of(2026, 3, 1);
            Budget result = service.modifyBudget(USER_ID, BUDGET_ID,
                    null, null, newDate);

            assertEquals(newDate, result.getStartDate());
        }

        @Test
        @DisplayName("all null parameters — no changes applied")
        void allNullNoChanges() throws Exception {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));
            when(budgetDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Budget result = service.modifyBudget(USER_ID, BUDGET_ID,
                    null, null, null);

            assertEquals("Monthly Budget", result.getName());
            assertEquals(BudgetPeriodicity.MONTHLY, result.getPeriodicity());
        }

        @Test
        @DisplayName("name is trimmed on update")
        void nameTrimmed() throws Exception {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));
            when(budgetDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Budget result = service.modifyBudget(USER_ID, BUDGET_ID,
                    "  Trimmed Name  ", null, null);

            assertEquals("Trimmed Name", result.getName());
        }

        @ParameterizedTest
        @ValueSource(strings = {"", " ", "   "})
        @DisplayName("blank name throws BudgetInvalidException")
        void blankName(String name) {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));

            assertThrows(BudgetInvalidException.class, () ->
                    service.modifyBudget(USER_ID, BUDGET_ID, name, null, null));
        }

        @Test
        @DisplayName("budget not found throws InstanceNotFoundException")
        void notFound() {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class, () ->
                    service.modifyBudget(USER_ID, BUDGET_ID,
                            "Name", null, null));
        }
    }

    // ── findAll / findById ──────────────────────────────────────────────

    @Nested
    @DisplayName("findAll / findById")
    class FindTests {

        @Test
        @DisplayName("findAllByUserId returns list of budgets")
        void findAll() {
            when(budgetDao.findAllByUserIdOrderByNameAsc(USER_ID))
                    .thenReturn(List.of(budget));

            List<Budget> result = service.findAllByUserId(USER_ID);

            assertEquals(1, result.size());
            assertEquals(budget, result.get(0));
        }

        @Test
        @DisplayName("findAllByUserId returns empty list")
        void findAllEmpty() {
            when(budgetDao.findAllByUserIdOrderByNameAsc(USER_ID))
                    .thenReturn(List.of());

            assertTrue(service.findAllByUserId(USER_ID).isEmpty());
        }

        @Test
        @DisplayName("findByIdAndUserId found returns budget")
        void findByIdFound() throws Exception {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));

            Budget result = service.findByIdAndUserId(BUDGET_ID, USER_ID);
            assertEquals(budget, result);
        }

        @Test
        @DisplayName("findByIdAndUserId not found throws InstanceNotFoundException")
        void findByIdNotFound() {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class, () ->
                    service.findByIdAndUserId(BUDGET_ID, USER_ID));
        }
    }

    // ── createBudgetCategory ────────────────────────────────────────────

    @Nested
    @DisplayName("createBudgetCategory")
    class CreateBudgetCategoryTests {

        @Test
        @DisplayName("valid creation without linked categories")
        void validCreationNoLinks() throws Exception {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));
            when(budgetCategoryDao.countByBudgetId(BUDGET_ID)).thenReturn(0L);
            when(budgetCategoryDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BudgetCategory bc = service.createBudgetCategory(USER_ID, BUDGET_ID,
                    "Transport", new BigDecimal("200.00"), null);

            assertNotNull(bc);
            assertEquals("Transport", bc.getName());
            assertEquals(new BigDecimal("200.00"), bc.getMaxAmount());
            assertTrue(bc.getLinkedCategories().isEmpty());
        }

        @Test
        @DisplayName("valid creation with linked categories")
        void validCreationWithLinks() throws Exception {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));
            when(budgetCategoryDao.countByBudgetId(BUDGET_ID)).thenReturn(0L);
            when(categoryDao.findAllById(List.of(CAT_ID)))
                    .thenReturn(List.of(category));
            when(budgetCategoryDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BudgetCategory bc = service.createBudgetCategory(USER_ID, BUDGET_ID,
                    "Food", new BigDecimal("300.00"), List.of(CAT_ID));

            assertFalse(bc.getLinkedCategories().isEmpty());
            assertTrue(bc.getLinkedCategories().contains(category));
        }

        @Test
        @DisplayName("name is trimmed on creation")
        void nameTrimmed() throws Exception {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));
            when(budgetCategoryDao.countByBudgetId(BUDGET_ID)).thenReturn(0L);
            when(budgetCategoryDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BudgetCategory bc = service.createBudgetCategory(USER_ID, BUDGET_ID,
                    "  Trimmed  ", new BigDecimal("100.00"), null);

            assertEquals("Trimmed", bc.getName());
        }

        @Test
        @DisplayName("null name throws BudgetInvalidException")
        void nullName() {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));

            assertThrows(BudgetInvalidException.class, () ->
                    service.createBudgetCategory(USER_ID, BUDGET_ID,
                            null, new BigDecimal("100.00"), null));
        }

        @ParameterizedTest
        @ValueSource(strings = {"", "  ", "\t"})
        @DisplayName("blank name throws BudgetInvalidException")
        void blankName(String name) {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));

            assertThrows(BudgetInvalidException.class, () ->
                    service.createBudgetCategory(USER_ID, BUDGET_ID,
                            name, new BigDecimal("100.00"), null));
        }

        @Test
        @DisplayName("null maxAmount throws BudgetInvalidException")
        void nullMaxAmount() {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));

            assertThrows(BudgetInvalidException.class, () ->
                    service.createBudgetCategory(USER_ID, BUDGET_ID,
                            "Food", null, null));
        }

        @Test
        @DisplayName("zero maxAmount throws BudgetInvalidException")
        void zeroMaxAmount() {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));

            assertThrows(BudgetInvalidException.class, () ->
                    service.createBudgetCategory(USER_ID, BUDGET_ID,
                            "Food", BigDecimal.ZERO, null));
        }

        @Test
        @DisplayName("negative maxAmount throws BudgetInvalidException")
        void negativeMaxAmount() {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));

            assertThrows(BudgetInvalidException.class, () ->
                    service.createBudgetCategory(USER_ID, BUDGET_ID,
                            "Food", new BigDecimal("-50.00"), null));
        }

        @Test
        @DisplayName("max categories (40) reached throws BudgetInvalidException")
        void maxCategoriesReached() {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));
            when(budgetCategoryDao.countByBudgetId(BUDGET_ID)).thenReturn(40L);

            BudgetInvalidException ex = assertThrows(BudgetInvalidException.class, () ->
                    service.createBudgetCategory(USER_ID, BUDGET_ID,
                            "Food", new BigDecimal("100.00"), null));

            assertTrue(ex.getMessage().contains("40"));
        }

        @Test
        @DisplayName("at 39/40 categories — creation is allowed")
        void atLimitMinusOne() throws Exception {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));
            when(budgetCategoryDao.countByBudgetId(BUDGET_ID)).thenReturn(39L);
            when(budgetCategoryDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            assertDoesNotThrow(() ->
                    service.createBudgetCategory(USER_ID, BUDGET_ID,
                            "Category", new BigDecimal("100.00"), null));
        }

        @Test
        @DisplayName("budget not found throws InstanceNotFoundException")
        void budgetNotFound() {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class, () ->
                    service.createBudgetCategory(USER_ID, BUDGET_ID,
                            "Food", new BigDecimal("100.00"), null));
        }

        @Test
        @DisplayName("very large maxAmount is accepted")
        void veryLargeAmount() throws Exception {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));
            when(budgetCategoryDao.countByBudgetId(BUDGET_ID)).thenReturn(0L);
            when(budgetCategoryDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BigDecimal huge = new BigDecimal("999999999999.99");
            BudgetCategory bc = service.createBudgetCategory(USER_ID, BUDGET_ID,
                    "Huge", huge, null);

            assertEquals(huge, bc.getMaxAmount());
        }

        @Test
        @DisplayName("displayOrder is set to current category count")
        void displayOrderSetCorrectly() throws Exception {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));
            // budget has one category already in its list
            budget.getCategories().add(budgetCategory);
            when(budgetCategoryDao.countByBudgetId(BUDGET_ID)).thenReturn(1L);
            when(budgetCategoryDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BudgetCategory bc = service.createBudgetCategory(USER_ID, BUDGET_ID,
                    "Second", new BigDecimal("100.00"), null);

            assertEquals(1, bc.getDisplayOrder());
        }
    }

    // ── modifyBudgetCategory ────────────────────────────────────────────

    @Nested
    @DisplayName("modifyBudgetCategory")
    class ModifyBudgetCategoryTests {

        @BeforeEach
        void setupMocks() {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));
        }

        @Test
        @DisplayName("update name only")
        void updateNameOnly() throws Exception {
            when(budgetCategoryDao.findByIdAndBudgetId(BC_ID, BUDGET_ID))
                    .thenReturn(Optional.of(budgetCategory));
            when(budgetCategoryDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BudgetCategory result = service.modifyBudgetCategory(USER_ID, BUDGET_ID,
                    BC_ID, "New Name", null, null);

            assertEquals("New Name", result.getName());
            assertEquals(new BigDecimal("500.00"), result.getMaxAmount()); // unchanged
        }

        @Test
        @DisplayName("update maxAmount only")
        void updateMaxAmountOnly() throws Exception {
            when(budgetCategoryDao.findByIdAndBudgetId(BC_ID, BUDGET_ID))
                    .thenReturn(Optional.of(budgetCategory));
            when(budgetCategoryDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BigDecimal newAmount = new BigDecimal("750.00");
            BudgetCategory result = service.modifyBudgetCategory(USER_ID, BUDGET_ID,
                    BC_ID, null, newAmount, null);

            assertEquals(newAmount, result.getMaxAmount());
            assertEquals("Food", result.getName()); // unchanged
        }

        @Test
        @DisplayName("update linkedCategories replaces existing")
        void updateLinkedCategories() throws Exception {
            // pre-populate
            budgetCategory.getLinkedCategories().add(category);

            UUID newCatId = UUID.randomUUID();
            Category newCat = new Category("Transport", TransactionType.EXPENSE, user);
            setId(newCat, newCatId);

            when(budgetCategoryDao.findByIdAndBudgetId(BC_ID, BUDGET_ID))
                    .thenReturn(Optional.of(budgetCategory));
            when(categoryDao.findAllById(List.of(newCatId))).thenReturn(List.of(newCat));
            when(budgetCategoryDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BudgetCategory result = service.modifyBudgetCategory(USER_ID, BUDGET_ID,
                    BC_ID, null, null, List.of(newCatId));

            assertEquals(1, result.getLinkedCategories().size());
            assertTrue(result.getLinkedCategories().contains(newCat));
            assertFalse(result.getLinkedCategories().contains(category));
        }

        @Test
        @DisplayName("empty linkedCategoryIds clears all linked categories")
        void clearLinkedCategories() throws Exception {
            budgetCategory.getLinkedCategories().add(category);

            when(budgetCategoryDao.findByIdAndBudgetId(BC_ID, BUDGET_ID))
                    .thenReturn(Optional.of(budgetCategory));
            when(budgetCategoryDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BudgetCategory result = service.modifyBudgetCategory(USER_ID, BUDGET_ID,
                    BC_ID, null, null, List.of());

            assertTrue(result.getLinkedCategories().isEmpty());
        }

        @Test
        @DisplayName("null linkedCategoryIds leaves existing links unchanged")
        void nullLinkedCategoriesNoChange() throws Exception {
            budgetCategory.getLinkedCategories().add(category);

            when(budgetCategoryDao.findByIdAndBudgetId(BC_ID, BUDGET_ID))
                    .thenReturn(Optional.of(budgetCategory));
            when(budgetCategoryDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BudgetCategory result = service.modifyBudgetCategory(USER_ID, BUDGET_ID,
                    BC_ID, null, null, null);

            assertEquals(1, result.getLinkedCategories().size());
        }

        @Test
        @DisplayName("name is trimmed on update")
        void nameTrimmed() throws Exception {
            when(budgetCategoryDao.findByIdAndBudgetId(BC_ID, BUDGET_ID))
                    .thenReturn(Optional.of(budgetCategory));
            when(budgetCategoryDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BudgetCategory result = service.modifyBudgetCategory(USER_ID, BUDGET_ID,
                    BC_ID, "  Trimmed  ", null, null);

            assertEquals("Trimmed", result.getName());
        }

        @ParameterizedTest
        @ValueSource(strings = {"", " ", "   "})
        @DisplayName("blank name throws BudgetInvalidException")
        void blankName(String name) {
            when(budgetCategoryDao.findByIdAndBudgetId(BC_ID, BUDGET_ID))
                    .thenReturn(Optional.of(budgetCategory));

            assertThrows(BudgetInvalidException.class, () ->
                    service.modifyBudgetCategory(USER_ID, BUDGET_ID,
                            BC_ID, name, null, null));
        }

        @Test
        @DisplayName("zero maxAmount throws BudgetInvalidException")
        void zeroMaxAmount() {
            when(budgetCategoryDao.findByIdAndBudgetId(BC_ID, BUDGET_ID))
                    .thenReturn(Optional.of(budgetCategory));

            assertThrows(BudgetInvalidException.class, () ->
                    service.modifyBudgetCategory(USER_ID, BUDGET_ID,
                            BC_ID, null, BigDecimal.ZERO, null));
        }

        @Test
        @DisplayName("negative maxAmount throws BudgetInvalidException")
        void negativeMaxAmount() {
            when(budgetCategoryDao.findByIdAndBudgetId(BC_ID, BUDGET_ID))
                    .thenReturn(Optional.of(budgetCategory));

            assertThrows(BudgetInvalidException.class, () ->
                    service.modifyBudgetCategory(USER_ID, BUDGET_ID,
                            BC_ID, null, new BigDecimal("-1.00"), null));
        }

        @Test
        @DisplayName("budgetCategory not found throws InstanceNotFoundException")
        void categoryNotFound() {
            when(budgetCategoryDao.findByIdAndBudgetId(BC_ID, BUDGET_ID))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class, () ->
                    service.modifyBudgetCategory(USER_ID, BUDGET_ID,
                            BC_ID, "Name", null, null));
        }

        @Test
        @DisplayName("budget not found throws InstanceNotFoundException")
        void budgetNotFound() {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class, () ->
                    service.modifyBudgetCategory(USER_ID, BUDGET_ID,
                            BC_ID, "Name", null, null));
        }
    }

    // ── deleteBudgetCategory ────────────────────────────────────────────

    @Nested
    @DisplayName("deleteBudgetCategory")
    class DeleteBudgetCategoryTests {

        @Test
        @DisplayName("valid deletion calls delete")
        void validDelete() throws Exception {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));
            when(budgetCategoryDao.findByIdAndBudgetId(BC_ID, BUDGET_ID))
                    .thenReturn(Optional.of(budgetCategory));

            service.deleteBudgetCategory(USER_ID, BUDGET_ID, BC_ID);

            verify(budgetCategoryDao).delete(budgetCategory);
        }

        @Test
        @DisplayName("category not found throws InstanceNotFoundException")
        void categoryNotFound() {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));
            when(budgetCategoryDao.findByIdAndBudgetId(BC_ID, BUDGET_ID))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class, () ->
                    service.deleteBudgetCategory(USER_ID, BUDGET_ID, BC_ID));
        }

        @Test
        @DisplayName("budget not found throws InstanceNotFoundException")
        void budgetNotFound() {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class, () ->
                    service.deleteBudgetCategory(USER_ID, BUDGET_ID, BC_ID));
        }
    }

    // ── linkTransaction / unlinkTransaction ─────────────────────────────

    @Nested
    @DisplayName("linkTransaction / unlinkTransaction")
    class TransactionLinkingTests {

        @Test
        @DisplayName("link adds transaction to manualTransactions")
        void linkAddsTransaction() throws Exception {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));
            when(budgetCategoryDao.findByIdAndBudgetId(BC_ID, BUDGET_ID))
                    .thenReturn(Optional.of(budgetCategory));
            when(transactionDao.findByIdAndUserId(TX_ID, USER_ID))
                    .thenReturn(Optional.of(transaction));
            when(budgetCategoryDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            service.linkTransaction(USER_ID, BUDGET_ID, BC_ID, TX_ID);

            assertTrue(budgetCategory.getManualTransactions().contains(transaction));
            verify(budgetCategoryDao).save(budgetCategory);
        }

        @Test
        @DisplayName("unlink removes transaction from manualTransactions")
        void unlinkRemovesTransaction() throws Exception {
            budgetCategory.getManualTransactions().add(transaction);

            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));
            when(budgetCategoryDao.findByIdAndBudgetId(BC_ID, BUDGET_ID))
                    .thenReturn(Optional.of(budgetCategory));
            when(transactionDao.findByIdAndUserId(TX_ID, USER_ID))
                    .thenReturn(Optional.of(transaction));
            when(budgetCategoryDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            service.unlinkTransaction(USER_ID, BUDGET_ID, BC_ID, TX_ID);

            assertFalse(budgetCategory.getManualTransactions().contains(transaction));
        }

        @Test
        @DisplayName("link — budget not found throws InstanceNotFoundException")
        void linkBudgetNotFound() {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class, () ->
                    service.linkTransaction(USER_ID, BUDGET_ID, BC_ID, TX_ID));
        }

        @Test
        @DisplayName("link — budgetCategory not found throws InstanceNotFoundException")
        void linkCategoryNotFound() {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));
            when(budgetCategoryDao.findByIdAndBudgetId(BC_ID, BUDGET_ID))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class, () ->
                    service.linkTransaction(USER_ID, BUDGET_ID, BC_ID, TX_ID));
        }

        @Test
        @DisplayName("link — transaction not found throws InstanceNotFoundException")
        void linkTransactionNotFound() {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));
            when(budgetCategoryDao.findByIdAndBudgetId(BC_ID, BUDGET_ID))
                    .thenReturn(Optional.of(budgetCategory));
            when(transactionDao.findByIdAndUserId(TX_ID, USER_ID))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class, () ->
                    service.linkTransaction(USER_ID, BUDGET_ID, BC_ID, TX_ID));
        }

        @Test
        @DisplayName("unlink — transaction not found throws InstanceNotFoundException")
        void unlinkTransactionNotFound() {
            when(budgetDao.findByIdAndUserId(BUDGET_ID, USER_ID))
                    .thenReturn(Optional.of(budget));
            when(budgetCategoryDao.findByIdAndBudgetId(BC_ID, BUDGET_ID))
                    .thenReturn(Optional.of(budgetCategory));
            when(transactionDao.findByIdAndUserId(TX_ID, USER_ID))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class, () ->
                    service.unlinkTransaction(USER_ID, BUDGET_ID, BC_ID, TX_ID));
        }
    }

    // ── calculateSpent ──────────────────────────────────────────────────

    @Nested
    @DisplayName("calculateSpent")
    class CalculateSpentTests {

        private static final LocalDate START = LocalDate.of(2026, 1, 1);
        private static final LocalDate END   = LocalDate.of(2026, 1, 31);

        @Test
        @DisplayName("no linked categories, no manual transactions → zero")
        void emptyCategory() {
            BigDecimal spent = service.calculateSpent(USER_ID, budgetCategory, START, END);
            assertEquals(BigDecimal.ZERO, spent);
        }

        @Test
        @DisplayName("auto-linked via category IDs returns sum of matching transactions")
        void autoLinkedTransactions() throws Exception {
            budgetCategory.getLinkedCategories().add(category);

            Transaction tx1 = makeTx("Supermarket", "30.00", LocalDate.of(2026, 1, 10));
            Transaction tx2 = makeTx("Bakery", "12.50", LocalDate.of(2026, 1, 20));

            when(transactionDao.findExpensesByCategoryIdsAndDateRange(
                    USER_ID, List.of(CAT_ID), START, END))
                    .thenReturn(List.of(tx1, tx2));

            BigDecimal spent = service.calculateSpent(USER_ID, budgetCategory, START, END);

            assertEquals(new BigDecimal("42.50"), spent);
        }

        @Test
        @DisplayName("manual-linked transactions in period are counted")
        void manualTransactionsInPeriod() throws Exception {
            Transaction tx = makeTx("Manual", "55.00", LocalDate.of(2026, 1, 15));
            budgetCategory.getManualTransactions().add(tx);

            BigDecimal spent = service.calculateSpent(USER_ID, budgetCategory, START, END);

            assertEquals(new BigDecimal("55.00"), spent);
        }

        @Test
        @DisplayName("manual transaction before period start is excluded")
        void manualTransactionBeforePeriod() throws Exception {
            Transaction tx = makeTx("Old", "100.00", LocalDate.of(2025, 12, 31));
            budgetCategory.getManualTransactions().add(tx);

            BigDecimal spent = service.calculateSpent(USER_ID, budgetCategory, START, END);

            assertEquals(BigDecimal.ZERO, spent);
        }

        @Test
        @DisplayName("manual transaction after period end is excluded")
        void manualTransactionAfterPeriod() throws Exception {
            Transaction tx = makeTx("Future", "100.00", LocalDate.of(2026, 2, 1));
            budgetCategory.getManualTransactions().add(tx);

            BigDecimal spent = service.calculateSpent(USER_ID, budgetCategory, START, END);

            assertEquals(BigDecimal.ZERO, spent);
        }

        @Test
        @DisplayName("transaction on period start date is included")
        void transactionOnPeriodStart() throws Exception {
            Transaction tx = makeTx("OnStart", "20.00", START);
            budgetCategory.getManualTransactions().add(tx);

            BigDecimal spent = service.calculateSpent(USER_ID, budgetCategory, START, END);

            assertEquals(new BigDecimal("20.00"), spent);
        }

        @Test
        @DisplayName("transaction on period end date is included")
        void transactionOnPeriodEnd() throws Exception {
            Transaction tx = makeTx("OnEnd", "20.00", END);
            budgetCategory.getManualTransactions().add(tx);

            BigDecimal spent = service.calculateSpent(USER_ID, budgetCategory, START, END);

            assertEquals(new BigDecimal("20.00"), spent);
        }

        @Test
        @DisplayName("transaction in both auto and manual is counted only once")
        void deduplicationAutoAndManual() throws Exception {
            budgetCategory.getLinkedCategories().add(category);

            // Same transaction returned by both auto-link and in manual set
            Transaction tx = makeTx("Supermarket", "45.00", LocalDate.of(2026, 1, 10));

            when(transactionDao.findExpensesByCategoryIdsAndDateRange(
                    USER_ID, List.of(CAT_ID), START, END))
                    .thenReturn(List.of(tx));
            budgetCategory.getManualTransactions().add(tx);

            BigDecimal spent = service.calculateSpent(USER_ID, budgetCategory, START, END);

            // Should be 45.00, not 90.00
            assertEquals(new BigDecimal("45.00"), spent);
        }

        @Test
        @DisplayName("auto-linked + manual non-overlapping are both counted")
        void autoAndManualNonOverlapping() throws Exception {
            budgetCategory.getLinkedCategories().add(category);

            Transaction autoTx = makeTx("Auto", "30.00", LocalDate.of(2026, 1, 5));
            Transaction manualTx = makeTx("Manual", "20.00", LocalDate.of(2026, 1, 20));

            when(transactionDao.findExpensesByCategoryIdsAndDateRange(
                    USER_ID, List.of(CAT_ID), START, END))
                    .thenReturn(List.of(autoTx));
            budgetCategory.getManualTransactions().add(manualTx);

            BigDecimal spent = service.calculateSpent(USER_ID, budgetCategory, START, END);

            assertEquals(new BigDecimal("50.00"), spent);
        }

        @Test
        @DisplayName("multiple auto-linked categories sum all transactions")
        void multipleLinkedCategories() throws Exception {
            Category cat2 = new Category("Eating Out", TransactionType.EXPENSE, user);
            UUID cat2Id = UUID.randomUUID();
            setId(cat2, cat2Id);

            budgetCategory.getLinkedCategories().add(category);
            budgetCategory.getLinkedCategories().add(cat2);

            Transaction tx1 = makeTx("Groceries tx", "40.00", LocalDate.of(2026, 1, 5));
            Transaction tx2 = makeTx("Restaurant", "25.00", LocalDate.of(2026, 1, 12));

            when(transactionDao.findExpensesByCategoryIdsAndDateRange(
                    eq(USER_ID), anyList(), eq(START), eq(END)))
                    .thenReturn(List.of(tx1, tx2));

            BigDecimal spent = service.calculateSpent(USER_ID, budgetCategory, START, END);

            assertEquals(new BigDecimal("65.00"), spent);
        }
    }

    // ── getTransactionsInPeriod ─────────────────────────────────────────

    @Nested
    @DisplayName("getTransactionsInPeriod")
    class GetTransactionsInPeriodTests {

        private static final LocalDate START = LocalDate.of(2026, 1, 1);
        private static final LocalDate END   = LocalDate.of(2026, 1, 31);

        @Test
        @DisplayName("returns empty list when nothing linked")
        void empty() {
            List<Transaction> result = service.getTransactionsInPeriod(
                    USER_ID, budgetCategory, START, END);
            assertTrue(result.isEmpty());
        }

        @Test
        @DisplayName("auto-linked transactions included")
        void autoLinked() throws Exception {
            budgetCategory.getLinkedCategories().add(category);
            Transaction tx = makeTx("Groceries", "30.00", LocalDate.of(2026, 1, 10));

            when(transactionDao.findExpensesByCategoryIdsAndDateRange(
                    USER_ID, List.of(CAT_ID), START, END))
                    .thenReturn(List.of(tx));

            List<Transaction> result = service.getTransactionsInPeriod(
                    USER_ID, budgetCategory, START, END);

            assertEquals(1, result.size());
            assertEquals(tx, result.get(0));
        }

        @Test
        @DisplayName("manual transactions in period included")
        void manualInPeriod() throws Exception {
            Transaction tx = makeTx("Manual", "15.00", LocalDate.of(2026, 1, 20));
            budgetCategory.getManualTransactions().add(tx);

            List<Transaction> result = service.getTransactionsInPeriod(
                    USER_ID, budgetCategory, START, END);

            assertEquals(1, result.size());
        }

        @Test
        @DisplayName("manual transaction out of period excluded")
        void manualOutOfPeriod() throws Exception {
            Transaction tx = makeTx("Old", "15.00", LocalDate.of(2025, 12, 15));
            budgetCategory.getManualTransactions().add(tx);

            List<Transaction> result = service.getTransactionsInPeriod(
                    USER_ID, budgetCategory, START, END);

            assertTrue(result.isEmpty());
        }

        @Test
        @DisplayName("same transaction in auto and manual — only listed once")
        void deduplication() throws Exception {
            budgetCategory.getLinkedCategories().add(category);

            Transaction tx = makeTx("Supermarket", "45.00", LocalDate.of(2026, 1, 10));

            when(transactionDao.findExpensesByCategoryIdsAndDateRange(
                    USER_ID, List.of(CAT_ID), START, END))
                    .thenReturn(List.of(tx));
            budgetCategory.getManualTransactions().add(tx);

            List<Transaction> result = service.getTransactionsInPeriod(
                    USER_ID, budgetCategory, START, END);

            assertEquals(1, result.size());
        }
    }

    // ── Period calculation ──────────────────────────────────────────────

    @Nested
    @DisplayName("getCurrentPeriodDates")
    class PeriodCalculationTests {

        @Test
        @DisplayName("MONTHLY: startDate=2026-01-01, today falls in Jan period")
        void monthlyCurrentPeriod() {
            Budget b = new Budget("B", BudgetPeriodicity.MONTHLY,
                    LocalDate.of(2026, 1, 1), user);
            LocalDate[] period = service.getCurrentPeriodDates(b);
            // today is 2026-03-23, so period should be Mar 1 – Mar 31
            assertNotNull(period);
            assertEquals(2, period.length);
            assertFalse(LocalDate.now().isBefore(period[0]));
            assertFalse(LocalDate.now().isAfter(period[1]));
        }

        @Test
        @DisplayName("WEEKLY: today is within a 7-day window from startDate")
        void weeklyCurrentPeriod() {
            // Start from a Monday in the past to anchor periods
            LocalDate start = LocalDate.of(2026, 1, 5);
            Budget b = new Budget("B", BudgetPeriodicity.WEEKLY, start, user);
            LocalDate[] period = service.getCurrentPeriodDates(b);
            assertNotNull(period);
            assertEquals(7, period[0].until(period[1]).getDays() + 1);
            assertFalse(LocalDate.now().isBefore(period[0]));
            assertFalse(LocalDate.now().isAfter(period[1]));
        }

        @Test
        @DisplayName("QUARTERLY: period spans 3 months")
        void quarterlyPeriodSpans3Months() {
            LocalDate start = LocalDate.of(2026, 1, 1);
            Budget b = new Budget("B", BudgetPeriodicity.QUARTERLY, start, user);
            LocalDate[] period = service.getCurrentPeriodDates(b);
            // Apr 1 would be in period [Apr 1, Jun 30]
            LocalDate testDate = period[0];
            assertEquals(testDate.plusMonths(3).minusDays(1), period[1]);
        }

        @Test
        @DisplayName("FOUR_MONTHLY: period spans 4 months")
        void fourMonthlyPeriodSpans4Months() {
            LocalDate start = LocalDate.of(2026, 1, 1);
            Budget b = new Budget("B", BudgetPeriodicity.FOUR_MONTHLY, start, user);
            LocalDate[] period = service.getCurrentPeriodDates(b);
            assertEquals(period[0].plusMonths(4).minusDays(1), period[1]);
        }

        @Test
        @DisplayName("BIANNUAL: period spans 6 months")
        void biannualPeriodSpans6Months() {
            LocalDate start = LocalDate.of(2026, 1, 1);
            Budget b = new Budget("B", BudgetPeriodicity.BIANNUAL, start, user);
            LocalDate[] period = service.getCurrentPeriodDates(b);
            assertEquals(period[0].plusMonths(6).minusDays(1), period[1]);
        }

        @Test
        @DisplayName("ANNUAL: period spans 1 year")
        void annualPeriodSpans1Year() {
            LocalDate start = LocalDate.of(2026, 1, 1);
            Budget b = new Budget("B", BudgetPeriodicity.ANNUAL, start, user);
            LocalDate[] period = service.getCurrentPeriodDates(b);
            assertEquals(period[0].plusYears(1).minusDays(1), period[1]);
        }

        @Test
        @DisplayName("reference before budgetStart returns first period")
        void beforeBudgetStart() {
            // Budget starts in the future
            LocalDate start = LocalDate.of(2027, 1, 1);
            Budget b = new Budget("B", BudgetPeriodicity.MONTHLY, start, user);
            LocalDate[] period = service.getCurrentPeriodDates(b);
            // Today is before start, so we get the first period [2027-01-01, 2027-01-31]
            assertEquals(start, period[0]);
            assertEquals(start.plusMonths(1).minusDays(1), period[1]);
        }

        @Test
        @DisplayName("MONTHLY startDate=Jan31: next period starts Feb28/29")
        void jan31MonthlyEdgeCase() {
            LocalDate start = LocalDate.of(2025, 1, 31);
            Budget b = new Budget("B", BudgetPeriodicity.MONTHLY, start, user);

            // Get period containing Feb 28, 2025 (non-leap year)
            // Period 1: Jan 31 – Feb 27 (next would be Feb 28)
            // Actually: advanceByPeriod(Jan31, MONTHLY) = Feb 28
            // Period 1 = Jan31 – Feb 27
            // Period 2 = Feb 28 – Mar 27
            LocalDate refDate = LocalDate.of(2025, 2, 15);
            // refDate is in period 1 (Jan31 – Feb27)
            LocalDate[] period = service.getPreviousPeriodDates(b);
            assertNotNull(period);
            assertTrue(period[1].isAfter(period[0]));
        }

        @Test
        @DisplayName("previous period is immediately before current period")
        void previousPeriodAdjacentToCurrent() {
            Budget b = new Budget("B", BudgetPeriodicity.MONTHLY,
                    LocalDate.of(2026, 1, 1), user);
            LocalDate[] current = service.getCurrentPeriodDates(b);
            LocalDate[] previous = service.getPreviousPeriodDates(b);

            assertEquals(current[0].minusDays(1), previous[1]);
        }

        @Test
        @DisplayName("no gap or overlap between consecutive periods")
        void noGapBetweenPeriods() {
            Budget b = new Budget("B", BudgetPeriodicity.MONTHLY,
                    LocalDate.of(2026, 1, 1), user);
            LocalDate[] previous = service.getPreviousPeriodDates(b);
            LocalDate[] current = service.getCurrentPeriodDates(b);

            // previous[1] + 1 day = current[0]
            assertEquals(previous[1].plusDays(1), current[0]);
        }

        @Test
        @DisplayName("period start date is always <= period end date")
        void startBeforeEnd() {
            for (BudgetPeriodicity p : BudgetPeriodicity.values()) {
                Budget b = new Budget("B", p, LocalDate.of(2026, 1, 1), user);
                LocalDate[] period = service.getCurrentPeriodDates(b);
                assertFalse(period[0].isAfter(period[1]),
                        "start should be <= end for periodicity " + p);
            }
        }

        @Test
        @DisplayName("ANNUAL: startDate on Feb 29 (leap year) — next year uses Feb 28")
        void annualLeapYearEdgeCase() {
            // 2024 is a leap year, Feb 29 exists
            LocalDate start = LocalDate.of(2024, 2, 29);
            Budget b = new Budget("B", BudgetPeriodicity.ANNUAL, start, user);
            // Period 1: Feb 29 2024 – Feb 27 2025 (since plusYears(1) gives Feb 28 2025)
            // Today (2026-03-23) is in period 3
            LocalDate[] period = service.getCurrentPeriodDates(b);
            assertNotNull(period);
            assertTrue(period[1].isAfter(period[0]));
        }
    }

    // ── helpers ─────────────────────────────────────────────────────────

    /** Creates a Transaction with a set ID via reflection. */
    private Transaction makeTx(String name, String amount, LocalDate date) throws Exception {
        Transaction tx = new Transaction(name, new BigDecimal(amount), date,
                TransactionType.EXPENSE, user);
        setId(tx, UUID.randomUUID());
        return tx;
    }

    /** Sets a private UUID 'id' field via reflection. */
    private static void setId(Object entity, UUID id) throws Exception {
        Field field = entity.getClass().getDeclaredField("id");
        field.setAccessible(true);
        field.set(entity, id);
    }
}
