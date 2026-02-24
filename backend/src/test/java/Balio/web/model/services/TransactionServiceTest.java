package Balio.web.model.services;

import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.AccountInvalidException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.AccountDao;
import Balio.web.model.entities.Category;
import Balio.web.model.entities.CategoryDao;
import Balio.web.model.entities.Transaction;
import Balio.web.model.entities.TransactionDao;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;
import Balio.web.enums.AccountType;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import javax.management.InstanceNotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link TransactionServiceImpl}.
 * <p>
 * Uses Mockito (no Spring context) to test business rules, balance adjustments,
 * validation, and exception flows in isolation.
 */
@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    /* ───── shared constants ───── */
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID ACCOUNT_ID = UUID.randomUUID();
    private static final UUID CATEGORY_ID = UUID.randomUUID();
    private static final UUID TRANSACTION_ID = UUID.randomUUID();
    private static final String VALID_NAME = "Groceries";
    private static final BigDecimal VALID_AMOUNT = new BigDecimal("50.00");
    private static final LocalDate VALID_DATE = LocalDate.of(2025, 6, 15);

    @Mock private AccountDao accountDao;
    @Mock private TransactionDao transactionDao;
    @Mock private CategoryDao categoryDao;
    @Mock private UserDao userDao;

    @InjectMocks
    private TransactionServiceImpl transactionService;

    private User user;
    private Account account;
    private Category category;

    @BeforeEach
    void setUp() {
        user = new User("Nick", "nick@example.com", "encodedPwd");
        setFieldViaReflection(user, "id", USER_ID);

        account = new Account("Main Account", AccountType.BANK, "EUR", new BigDecimal("1000.00"), user);
        setFieldViaReflection(account, "id", ACCOUNT_ID);

        category = new Category("Food", TransactionType.EXPENSE, user);
        setFieldViaReflection(category, "id", CATEGORY_ID);
    }

    /* ═══════════════════════════════════════════════════════════
     *  addExpense
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("addExpense")
    class AddExpenseTests {

        @Test
        @DisplayName("should create expense with all params, reducing balance")
        void shouldCreateExpense_whenAllParamsValid() throws AccountInvalidException, UserNotFoundException {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(account));
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(categoryDao.findByIdAndUserId(CATEGORY_ID, USER_ID)).thenReturn(Optional.of(category));

            Transaction result = transactionService.addExpense(
                    USER_ID, ACCOUNT_ID, CATEGORY_ID, VALID_NAME, VALID_AMOUNT, VALID_DATE, true);

            assertNotNull(result);
            assertEquals(VALID_NAME, result.getName());
            assertEquals(VALID_AMOUNT, result.getAmount());
            assertEquals(VALID_DATE, result.getDate());
            assertEquals(TransactionType.EXPENSE, result.getType());
            assertTrue(result.isAffectsBalance());
            assertEquals(account, result.getAccount());
            assertEquals(category, result.getCategory());

            // Balance should have decreased: 1000 - 50 = 950
            assertEquals(new BigDecimal("950.00"), account.getBalance());

            verify(transactionDao).save(any(Transaction.class));
        }

        @Test
        @DisplayName("should default affectsBalance to true when null")
        void shouldDefaultAffectsBalance_whenNull() throws AccountInvalidException, UserNotFoundException {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(account));
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            Transaction result = transactionService.addExpense(
                    USER_ID, ACCOUNT_ID, null, VALID_NAME, VALID_AMOUNT, VALID_DATE, null);

            assertTrue(result.isAffectsBalance());
            assertEquals(new BigDecimal("950.00"), account.getBalance());
        }

        @Test
        @DisplayName("should not modify balance when affectsBalance is false")
        void shouldNotModifyBalance_whenAffectsBalanceFalse() throws AccountInvalidException, UserNotFoundException {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(account));
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            Transaction result = transactionService.addExpense(
                    USER_ID, ACCOUNT_ID, null, VALID_NAME, VALID_AMOUNT, VALID_DATE, false);

            assertFalse(result.isAffectsBalance());
            assertEquals(new BigDecimal("1000.00"), account.getBalance());
        }

        @Test
        @DisplayName("should default date to today when null")
        void shouldDefaultDateToToday_whenNull() throws AccountInvalidException, UserNotFoundException {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(account));
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            Transaction result = transactionService.addExpense(
                    USER_ID, ACCOUNT_ID, null, VALID_NAME, VALID_AMOUNT, null, true);

            assertEquals(LocalDate.now(), result.getDate());
        }

        @Test
        @DisplayName("should set category to null when categoryId not found for user")
        void shouldSetCategoryNull_whenCategoryNotFoundForUser() throws AccountInvalidException, UserNotFoundException {
            UUID unknownCatId = UUID.randomUUID();
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(account));
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(categoryDao.findByIdAndUserId(unknownCatId, USER_ID)).thenReturn(Optional.empty());

            Transaction result = transactionService.addExpense(
                    USER_ID, ACCOUNT_ID, unknownCatId, VALID_NAME, VALID_AMOUNT, VALID_DATE, true);

            assertNull(result.getCategory());
        }

        @Test
        @DisplayName("should set category to null when categoryId is null")
        void shouldSetCategoryNull_whenCategoryIdIsNull() throws AccountInvalidException, UserNotFoundException {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(account));
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            Transaction result = transactionService.addExpense(
                    USER_ID, ACCOUNT_ID, null, VALID_NAME, VALID_AMOUNT, VALID_DATE, true);

            assertNull(result.getCategory());
        }

        @Test
        @DisplayName("should throw AccountInvalidException when accountId is null")
        void shouldThrowAccountInvalid_whenAccountIdNull() {
            assertThrows(AccountInvalidException.class,
                    () -> transactionService.addExpense(
                            USER_ID, null, null, VALID_NAME, VALID_AMOUNT, VALID_DATE, true));

            verify(transactionDao, never()).save(any());
        }

        @Test
        @DisplayName("should throw AccountInvalidException when account not linked to user")
        void shouldThrowAccountInvalid_whenAccountNotLinked() {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(AccountInvalidException.class,
                    () -> transactionService.addExpense(
                            USER_ID, ACCOUNT_ID, null, VALID_NAME, VALID_AMOUNT, VALID_DATE, true));

            verify(transactionDao, never()).save(any());
        }

        @Test
        @DisplayName("should throw UserNotFoundException when user does not exist")
        void shouldThrowUserNotFound_whenUserNotFound() {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(account));
            when(userDao.findById(USER_ID)).thenReturn(Optional.empty());

            assertThrows(UserNotFoundException.class,
                    () -> transactionService.addExpense(
                            USER_ID, ACCOUNT_ID, null, VALID_NAME, VALID_AMOUNT, VALID_DATE, true));

            verify(transactionDao, never()).save(any());
        }

        @ParameterizedTest(name = "should throw IllegalArgumentException when name is \"{0}\"")
        @NullAndEmptySource
        @ValueSource(strings = {"   ", "\t", "\n"})
        @DisplayName("should throw IllegalArgumentException for blank/null name")
        void shouldThrowIllegalArgument_whenNameBlank(String badName) {
            assertThrows(IllegalArgumentException.class,
                    () -> transactionService.addExpense(
                            USER_ID, ACCOUNT_ID, null, badName, VALID_AMOUNT, VALID_DATE, true));

            verify(transactionDao, never()).save(any());
        }

        @Test
        @DisplayName("should throw IllegalArgumentException when amount is null")
        void shouldThrowIllegalArgument_whenAmountNull() {
            assertThrows(IllegalArgumentException.class,
                    () -> transactionService.addExpense(
                            USER_ID, ACCOUNT_ID, null, VALID_NAME, null, VALID_DATE, true));

            verify(transactionDao, never()).save(any());
        }

        @Test
        @DisplayName("should throw IllegalArgumentException when amount is zero")
        void shouldThrowIllegalArgument_whenAmountZero() {
            assertThrows(IllegalArgumentException.class,
                    () -> transactionService.addExpense(
                            USER_ID, ACCOUNT_ID, null, VALID_NAME, BigDecimal.ZERO, VALID_DATE, true));

            verify(transactionDao, never()).save(any());
        }

        @Test
        @DisplayName("should throw IllegalArgumentException when amount is negative")
        void shouldThrowIllegalArgument_whenAmountNegative() {
            assertThrows(IllegalArgumentException.class,
                    () -> transactionService.addExpense(
                            USER_ID, ACCOUNT_ID, null, VALID_NAME, new BigDecimal("-10.00"), VALID_DATE, true));

            verify(transactionDao, never()).save(any());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  addIncome
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("addIncome")
    class AddIncomeTests {

        @Test
        @DisplayName("should create income with all params, increasing balance")
        void shouldCreateIncome_whenAllParamsValid() throws AccountInvalidException, UserNotFoundException {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(account));
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(categoryDao.findByIdAndUserId(CATEGORY_ID, USER_ID)).thenReturn(Optional.of(category));

            Transaction result = transactionService.addIncome(
                    USER_ID, ACCOUNT_ID, CATEGORY_ID, "Salary", new BigDecimal("2000.00"), VALID_DATE, true);

            assertNotNull(result);
            assertEquals("Salary", result.getName());
            assertEquals(new BigDecimal("2000.00"), result.getAmount());
            assertEquals(TransactionType.INCOME, result.getType());
            assertTrue(result.isAffectsBalance());

            // Balance should have increased: 1000 + 2000 = 3000
            assertEquals(new BigDecimal("3000.00"), account.getBalance());

            verify(transactionDao).save(any(Transaction.class));
        }

        @Test
        @DisplayName("should not modify balance when affectsBalance is false")
        void shouldNotModifyBalance_whenAffectsBalanceFalse() throws AccountInvalidException, UserNotFoundException {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(account));
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            transactionService.addIncome(
                    USER_ID, ACCOUNT_ID, null, "Bonus", new BigDecimal("500.00"), VALID_DATE, false);

            assertEquals(new BigDecimal("1000.00"), account.getBalance());
        }

        @Test
        @DisplayName("should throw AccountInvalidException when accountId is null")
        void shouldThrowAccountInvalid_whenAccountIdNull() {
            assertThrows(AccountInvalidException.class,
                    () -> transactionService.addIncome(
                            USER_ID, null, null, "Salary", VALID_AMOUNT, VALID_DATE, true));
        }

        @Test
        @DisplayName("should throw AccountInvalidException when account not linked")
        void shouldThrowAccountInvalid_whenAccountNotLinked() {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(AccountInvalidException.class,
                    () -> transactionService.addIncome(
                            USER_ID, ACCOUNT_ID, null, "Salary", VALID_AMOUNT, VALID_DATE, true));
        }

        @Test
        @DisplayName("should throw UserNotFoundException when user does not exist")
        void shouldThrowUserNotFound_whenUserNotFound() {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(account));
            when(userDao.findById(USER_ID)).thenReturn(Optional.empty());

            assertThrows(UserNotFoundException.class,
                    () -> transactionService.addIncome(
                            USER_ID, ACCOUNT_ID, null, "Salary", VALID_AMOUNT, VALID_DATE, true));
        }

        @ParameterizedTest(name = "should throw IllegalArgumentException when name is \"{0}\"")
        @NullAndEmptySource
        @ValueSource(strings = {"   "})
        @DisplayName("should throw IllegalArgumentException for blank/null name")
        void shouldThrowIllegalArgument_whenNameBlank(String badName) {
            assertThrows(IllegalArgumentException.class,
                    () -> transactionService.addIncome(
                            USER_ID, ACCOUNT_ID, null, badName, VALID_AMOUNT, VALID_DATE, true));
        }

        @Test
        @DisplayName("should throw IllegalArgumentException when amount is zero")
        void shouldThrowIllegalArgument_whenAmountZero() {
            assertThrows(IllegalArgumentException.class,
                    () -> transactionService.addIncome(
                            USER_ID, ACCOUNT_ID, null, "Salary", BigDecimal.ZERO, VALID_DATE, true));
        }

        @Test
        @DisplayName("should throw IllegalArgumentException when amount is negative")
        void shouldThrowIllegalArgument_whenAmountNegative() {
            assertThrows(IllegalArgumentException.class,
                    () -> transactionService.addIncome(
                            USER_ID, ACCOUNT_ID, null, "Salary", new BigDecimal("-1"), VALID_DATE, true));
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  updateTransaction
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("updateTransaction")
    class UpdateTransactionTests {

        private Transaction existingTx;

        @BeforeEach
        void setUpTransaction() {
            existingTx = new Transaction("Old Name", new BigDecimal("100.00"), VALID_DATE, TransactionType.EXPENSE, user);
            setFieldViaReflection(existingTx, "id", TRANSACTION_ID);
            existingTx.setAccount(account);
            existingTx.setAffectsBalance(true);
        }

        @Test
        @DisplayName("should update all fields and adjust balances correctly")
        void shouldUpdateTransaction_whenValidData() throws InstanceNotFoundException, AccountInvalidException {
            // Old balance: 1000. Old tx was EXPENSE 100 affecting → revert adds 100 → 1100.
            // New tx is INCOME 200 affecting → apply adds 200 → 1300.
            when(transactionDao.findByIdAndUserId(TRANSACTION_ID, USER_ID)).thenReturn(Optional.of(existingTx));
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(account));
            when(categoryDao.findByIdAndUserId(CATEGORY_ID, USER_ID)).thenReturn(Optional.of(category));

            Transaction result = transactionService.updateTransaction(
                    USER_ID, TRANSACTION_ID, ACCOUNT_ID, CATEGORY_ID,
                    TransactionType.INCOME, "Updated Name", new BigDecimal("200.00"),
                    LocalDate.of(2025, 7, 1), true);

            assertEquals("Updated Name", result.getName());
            assertEquals(new BigDecimal("200.00"), result.getAmount());
            assertEquals(TransactionType.INCOME, result.getType());
            assertEquals(LocalDate.of(2025, 7, 1), result.getDate());
            assertTrue(result.isAffectsBalance());
            assertEquals(account, result.getAccount());
            assertEquals(category, result.getCategory());

            // 1000 + 100 (revert EXPENSE) + 200 (apply INCOME) = 1300
            assertEquals(new BigDecimal("1300.00"), account.getBalance());
        }

        @Test
        @DisplayName("should revert old balance but not apply new when affectsBalance is false")
        void shouldRevertOldButNotApplyNew_whenAffectsBalanceFalse() throws InstanceNotFoundException, AccountInvalidException {
            when(transactionDao.findByIdAndUserId(TRANSACTION_ID, USER_ID)).thenReturn(Optional.of(existingTx));
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(account));

            transactionService.updateTransaction(
                    USER_ID, TRANSACTION_ID, ACCOUNT_ID, null,
                    TransactionType.EXPENSE, "Updated", VALID_AMOUNT,
                    VALID_DATE, false);

            // 1000 + 100 (revert old EXPENSE) = 1100, no new apply
            assertEquals(new BigDecimal("1100.00"), account.getBalance());
        }

        @Test
        @DisplayName("should not revert when old transaction did not affect balance")
        void shouldNotRevertOld_whenOldDidNotAffectBalance() throws InstanceNotFoundException, AccountInvalidException {
            existingTx.setAffectsBalance(false);

            when(transactionDao.findByIdAndUserId(TRANSACTION_ID, USER_ID)).thenReturn(Optional.of(existingTx));
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(account));

            transactionService.updateTransaction(
                    USER_ID, TRANSACTION_ID, ACCOUNT_ID, null,
                    TransactionType.EXPENSE, "Updated", new BigDecimal("75.00"),
                    VALID_DATE, true);

            // No revert (was false), apply EXPENSE 75: 1000 - 75 = 925
            assertEquals(new BigDecimal("925.00"), account.getBalance());
        }

        @Test
        @DisplayName("should default date to today when null")
        void shouldDefaultDateToToday_whenNull() throws InstanceNotFoundException, AccountInvalidException {
            when(transactionDao.findByIdAndUserId(TRANSACTION_ID, USER_ID)).thenReturn(Optional.of(existingTx));
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(account));

            Transaction result = transactionService.updateTransaction(
                    USER_ID, TRANSACTION_ID, ACCOUNT_ID, null,
                    TransactionType.EXPENSE, "Updated", VALID_AMOUNT,
                    null, true);

            assertEquals(LocalDate.now(), result.getDate());
        }

        @Test
        @DisplayName("should set account to null when accountId is null")
        void shouldSetAccountNull_whenAccountIdNull() throws InstanceNotFoundException, AccountInvalidException {
            when(transactionDao.findByIdAndUserId(TRANSACTION_ID, USER_ID)).thenReturn(Optional.of(existingTx));

            Transaction result = transactionService.updateTransaction(
                    USER_ID, TRANSACTION_ID, null, null,
                    TransactionType.EXPENSE, "Updated", VALID_AMOUNT,
                    VALID_DATE, true);

            assertNull(result.getAccount());
        }

        @Test
        @DisplayName("should set category to null when categoryId is null")
        void shouldSetCategoryNull_whenCategoryIdNull() throws InstanceNotFoundException, AccountInvalidException {
            when(transactionDao.findByIdAndUserId(TRANSACTION_ID, USER_ID)).thenReturn(Optional.of(existingTx));
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(account));

            Transaction result = transactionService.updateTransaction(
                    USER_ID, TRANSACTION_ID, ACCOUNT_ID, null,
                    TransactionType.EXPENSE, "Updated", VALID_AMOUNT,
                    VALID_DATE, true);

            assertNull(result.getCategory());
        }

        @Test
        @DisplayName("should throw InstanceNotFoundException when transaction not found")
        void shouldThrowInstanceNotFound_whenTransactionNotFound() {
            when(transactionDao.findByIdAndUserId(TRANSACTION_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> transactionService.updateTransaction(
                            USER_ID, TRANSACTION_ID, ACCOUNT_ID, null,
                            TransactionType.EXPENSE, "Updated", VALID_AMOUNT,
                            VALID_DATE, true));
        }

        @Test
        @DisplayName("should throw AccountInvalidException when new account not linked")
        void shouldThrowAccountInvalid_whenNewAccountNotLinked() {
            when(transactionDao.findByIdAndUserId(TRANSACTION_ID, USER_ID)).thenReturn(Optional.of(existingTx));
            UUID otherAccountId = UUID.randomUUID();
            when(accountDao.findByIdAndUserId(otherAccountId, USER_ID)).thenReturn(Optional.empty());

            assertThrows(AccountInvalidException.class,
                    () -> transactionService.updateTransaction(
                            USER_ID, TRANSACTION_ID, otherAccountId, null,
                            TransactionType.EXPENSE, "Updated", VALID_AMOUNT,
                            VALID_DATE, true));
        }

        @Test
        @DisplayName("should throw IllegalArgumentException when type is null")
        void shouldThrowIllegalArgument_whenTypeNull() {
            assertThrows(IllegalArgumentException.class,
                    () -> transactionService.updateTransaction(
                            USER_ID, TRANSACTION_ID, ACCOUNT_ID, null,
                            null, "Updated", VALID_AMOUNT, VALID_DATE, true));
        }

        @ParameterizedTest(name = "should throw IllegalArgumentException when name is \"{0}\"")
        @NullAndEmptySource
        @ValueSource(strings = {"   "})
        @DisplayName("should throw IllegalArgumentException for blank/null name on update")
        void shouldThrowIllegalArgument_whenNameBlank(String badName) {
            assertThrows(IllegalArgumentException.class,
                    () -> transactionService.updateTransaction(
                            USER_ID, TRANSACTION_ID, ACCOUNT_ID, null,
                            TransactionType.EXPENSE, badName, VALID_AMOUNT, VALID_DATE, true));
        }

        @Test
        @DisplayName("should throw IllegalArgumentException when amount is zero on update")
        void shouldThrowIllegalArgument_whenAmountZero() {
            assertThrows(IllegalArgumentException.class,
                    () -> transactionService.updateTransaction(
                            USER_ID, TRANSACTION_ID, ACCOUNT_ID, null,
                            TransactionType.EXPENSE, "Name", BigDecimal.ZERO, VALID_DATE, true));
        }

        @Test
        @DisplayName("should throw IllegalArgumentException when amount is negative on update")
        void shouldThrowIllegalArgument_whenAmountNegative() {
            assertThrows(IllegalArgumentException.class,
                    () -> transactionService.updateTransaction(
                            USER_ID, TRANSACTION_ID, ACCOUNT_ID, null,
                            TransactionType.EXPENSE, "Name", new BigDecimal("-5"), VALID_DATE, true));
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  deleteTransaction
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("deleteTransaction")
    class DeleteTransactionTests {

        private Transaction existingTx;

        @BeforeEach
        void setUpTransaction() {
            existingTx = new Transaction("Coffee", new BigDecimal("5.00"), VALID_DATE, TransactionType.EXPENSE, user);
            setFieldViaReflection(existingTx, "id", TRANSACTION_ID);
            existingTx.setAccount(account);
            existingTx.setAffectsBalance(true);
        }

        @Test
        @DisplayName("should delete and revert balance when revertBalance=true and expense affected balance")
        void shouldDeleteAndRevertBalance_whenRevertTrueAndExpenseAffected() throws InstanceNotFoundException {
            when(transactionDao.findByIdAndUserId(TRANSACTION_ID, USER_ID)).thenReturn(Optional.of(existingTx));

            transactionService.deleteTransaction(USER_ID, TRANSACTION_ID, true);

            // Revert EXPENSE: 1000 + 5 = 1005
            assertEquals(new BigDecimal("1005.00"), account.getBalance());
            verify(transactionDao).delete(existingTx);
        }

        @Test
        @DisplayName("should delete and revert balance for income")
        void shouldDeleteAndRevertBalance_whenIncome() throws InstanceNotFoundException {
            existingTx = new Transaction("Salary", new BigDecimal("2000.00"), VALID_DATE, TransactionType.INCOME, user);
            setFieldViaReflection(existingTx, "id", TRANSACTION_ID);
            existingTx.setAccount(account);
            existingTx.setAffectsBalance(true);

            when(transactionDao.findByIdAndUserId(TRANSACTION_ID, USER_ID)).thenReturn(Optional.of(existingTx));

            transactionService.deleteTransaction(USER_ID, TRANSACTION_ID, true);

            // Revert INCOME: 1000 - 2000 = -1000
            assertEquals(new BigDecimal("-1000.00"), account.getBalance());
            verify(transactionDao).delete(existingTx);
        }

        @Test
        @DisplayName("should delete without reverting balance when revertBalance=false")
        void shouldDeleteWithoutRevert_whenRevertFalse() throws InstanceNotFoundException {
            when(transactionDao.findByIdAndUserId(TRANSACTION_ID, USER_ID)).thenReturn(Optional.of(existingTx));

            transactionService.deleteTransaction(USER_ID, TRANSACTION_ID, false);

            assertEquals(new BigDecimal("1000.00"), account.getBalance());
            verify(transactionDao).delete(existingTx);
        }

        @Test
        @DisplayName("should delete without reverting when transaction did not affect balance")
        void shouldDeleteWithoutRevert_whenTxDidNotAffectBalance() throws InstanceNotFoundException {
            existingTx.setAffectsBalance(false);
            when(transactionDao.findByIdAndUserId(TRANSACTION_ID, USER_ID)).thenReturn(Optional.of(existingTx));

            transactionService.deleteTransaction(USER_ID, TRANSACTION_ID, true);

            assertEquals(new BigDecimal("1000.00"), account.getBalance());
            verify(transactionDao).delete(existingTx);
        }

        @Test
        @DisplayName("should delete without reverting when account is null")
        void shouldDeleteWithoutRevert_whenAccountNull() throws InstanceNotFoundException {
            existingTx.setAccount(null);
            when(transactionDao.findByIdAndUserId(TRANSACTION_ID, USER_ID)).thenReturn(Optional.of(existingTx));

            transactionService.deleteTransaction(USER_ID, TRANSACTION_ID, true);

            // Account balance untouched since account is null
            assertEquals(new BigDecimal("1000.00"), account.getBalance());
            verify(transactionDao).delete(existingTx);
        }

        @Test
        @DisplayName("should throw InstanceNotFoundException when transaction not found")
        void shouldThrowInstanceNotFound_whenTransactionNotFound() {
            when(transactionDao.findByIdAndUserId(TRANSACTION_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> transactionService.deleteTransaction(USER_ID, TRANSACTION_ID, true));

            verify(transactionDao, never()).delete(any());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  findByIdAndUserId
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("findByIdAndUserId")
    class FindByIdAndUserIdTests {

        @Test
        @DisplayName("should return transaction when found")
        void shouldReturnTransaction_whenFound() throws InstanceNotFoundException {
            Transaction tx = new Transaction(VALID_NAME, VALID_AMOUNT, VALID_DATE, TransactionType.EXPENSE, user);
            setFieldViaReflection(tx, "id", TRANSACTION_ID);

            when(transactionDao.findByIdAndUserId(TRANSACTION_ID, USER_ID)).thenReturn(Optional.of(tx));

            Transaction result = transactionService.findByIdAndUserId(TRANSACTION_ID, USER_ID);

            assertNotNull(result);
            assertEquals(VALID_NAME, result.getName());
        }

        @Test
        @DisplayName("should throw InstanceNotFoundException when not found")
        void shouldThrowInstanceNotFound_whenNotFound() {
            when(transactionDao.findByIdAndUserId(TRANSACTION_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> transactionService.findByIdAndUserId(TRANSACTION_ID, USER_ID));
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  findAllByUserId
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("findAllByUserId")
    class FindAllByUserIdTests {

        @Test
        @DisplayName("should return all user transactions ordered by date desc")
        void shouldReturnAllTransactions() {
            Transaction tx1 = new Transaction("A", VALID_AMOUNT, VALID_DATE, TransactionType.EXPENSE, user);
            Transaction tx2 = new Transaction("B", VALID_AMOUNT, VALID_DATE.minusDays(1), TransactionType.INCOME, user);
            when(transactionDao.findAllByUserIdOrderByDateDesc(USER_ID)).thenReturn(List.of(tx1, tx2));

            List<Transaction> result = transactionService.findAllByUserId(USER_ID);

            assertEquals(2, result.size());
            assertEquals("A", result.get(0).getName());
            assertEquals("B", result.get(1).getName());
        }

        @Test
        @DisplayName("should return empty list when user has no transactions")
        void shouldReturnEmptyList_whenNoTransactions() {
            when(transactionDao.findAllByUserIdOrderByDateDesc(USER_ID)).thenReturn(List.of());

            List<Transaction> result = transactionService.findAllByUserId(USER_ID);

            assertTrue(result.isEmpty());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  findFiltered
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("findFiltered")
    class FindFilteredTests {

        @Test
        @DisplayName("should pass all filter params to DAO")
        void shouldDelegateAllParams_toDao() {
            LocalDate start = LocalDate.of(2025, 1, 1);
            LocalDate end = LocalDate.of(2025, 12, 31);

            when(transactionDao.findFiltered(USER_ID, TransactionType.EXPENSE, ACCOUNT_ID, CATEGORY_ID, start, end))
                    .thenReturn(List.of());

            List<Transaction> result = transactionService.findFiltered(
                    USER_ID, TransactionType.EXPENSE, ACCOUNT_ID, CATEGORY_ID, start, end);

            assertNotNull(result);
            verify(transactionDao).findFiltered(USER_ID, TransactionType.EXPENSE, ACCOUNT_ID, CATEGORY_ID, start, end);
        }

        @Test
        @DisplayName("should pass null filters to DAO without error")
        void shouldPassNullFilters_toDao() {
            when(transactionDao.findFiltered(USER_ID, null, null, null, null, null))
                    .thenReturn(List.of());

            List<Transaction> result = transactionService.findFiltered(
                    USER_ID, null, null, null, null, null);

            assertTrue(result.isEmpty());
            verify(transactionDao).findFiltered(USER_ID, null, null, null, null, null);
        }

        @Test
        @DisplayName("should return filtered results with partial filters")
        void shouldReturnFiltered_withPartialFilters() {
            Transaction tx = new Transaction(VALID_NAME, VALID_AMOUNT, VALID_DATE, TransactionType.EXPENSE, user);
            when(transactionDao.findFiltered(USER_ID, TransactionType.EXPENSE, null, null, null, null))
                    .thenReturn(List.of(tx));

            List<Transaction> result = transactionService.findFiltered(
                    USER_ID, TransactionType.EXPENSE, null, null, null, null);

            assertEquals(1, result.size());
            assertEquals(TransactionType.EXPENSE, result.get(0).getType());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  Balance adjustment (applyBalance via integration through public methods)
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("Balance adjustment (applyBalance)")
    class BalanceAdjustmentTests {

        @Test
        @DisplayName("EXPENSE should subtract from account balance")
        void expenseShouldSubtract() throws AccountInvalidException, UserNotFoundException {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(account));
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            transactionService.addExpense(USER_ID, ACCOUNT_ID, null, "Test", new BigDecimal("300.00"), VALID_DATE, true);

            assertEquals(new BigDecimal("700.00"), account.getBalance());
        }

        @Test
        @DisplayName("INCOME should add to account balance")
        void incomeShouldAdd() throws AccountInvalidException, UserNotFoundException {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(account));
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            transactionService.addIncome(USER_ID, ACCOUNT_ID, null, "Test", new BigDecimal("300.00"), VALID_DATE, true);

            assertEquals(new BigDecimal("1300.00"), account.getBalance());
        }

        @Test
        @DisplayName("delete with revert on EXPENSE should add back to balance")
        void deleteRevertExpenseShouldAddBack() throws InstanceNotFoundException {
            Transaction tx = new Transaction("Test", new BigDecimal("200.00"), VALID_DATE, TransactionType.EXPENSE, user);
            setFieldViaReflection(tx, "id", TRANSACTION_ID);
            tx.setAccount(account);
            tx.setAffectsBalance(true);

            when(transactionDao.findByIdAndUserId(TRANSACTION_ID, USER_ID)).thenReturn(Optional.of(tx));

            transactionService.deleteTransaction(USER_ID, TRANSACTION_ID, true);

            assertEquals(new BigDecimal("1200.00"), account.getBalance());
        }

        @Test
        @DisplayName("delete with revert on INCOME should subtract from balance")
        void deleteRevertIncomeShouldSubtract() throws InstanceNotFoundException {
            Transaction tx = new Transaction("Test", new BigDecimal("200.00"), VALID_DATE, TransactionType.INCOME, user);
            setFieldViaReflection(tx, "id", TRANSACTION_ID);
            tx.setAccount(account);
            tx.setAffectsBalance(true);

            when(transactionDao.findByIdAndUserId(TRANSACTION_ID, USER_ID)).thenReturn(Optional.of(tx));

            transactionService.deleteTransaction(USER_ID, TRANSACTION_ID, true);

            assertEquals(new BigDecimal("800.00"), account.getBalance());
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
