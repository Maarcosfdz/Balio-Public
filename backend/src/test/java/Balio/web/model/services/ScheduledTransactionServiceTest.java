package Balio.web.model.services;

import Balio.web.enums.AccountType;
import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.ScheduledTransactionInvalidException;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.AccountDao;
import Balio.web.model.entities.Category;
import Balio.web.model.entities.CategoryDao;
import Balio.web.model.entities.ScheduledTransaction;
import Balio.web.model.entities.ScheduledTransactionDao;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import javax.management.InstanceNotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link ScheduledTransactionServiceImpl}.
 * Tests edge cases, unusual values, date patterns, and business rules.
 */
@ExtendWith(MockitoExtension.class)
class ScheduledTransactionServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID ST_ID   = UUID.randomUUID();
    private static final UUID ACC_ID  = UUID.randomUUID();
    private static final UUID CAT_ID  = UUID.randomUUID();

    @Mock private UserDao              userDao;
    @Mock private AccountDao           accountDao;
    @Mock private CategoryDao          categoryDao;
    @Mock private ScheduledTransactionDao scheduledTxDao;
    @Mock private TransactionDao       transactionDao;

    @InjectMocks
    private ScheduledTransactionServiceImpl service;

    private User    user;
    private Account account;
    private Category category;

    @BeforeEach
    void setUp() {
        user     = new User("Tester", "test@example.com", "hashed");
        setFieldViaReflection(user, "id", USER_ID);

        account  = new Account("Bank", AccountType.BANK, "EUR", new BigDecimal("500.00"), user);
        setFieldViaReflection(account, "id", ACC_ID);

        category = new Category("Food", TransactionType.EXPENSE, user);
        setFieldViaReflection(category, "id", CAT_ID);
    }

    // ═══════════════════════════════════════════════════════════
    //  create
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("create")
    class CreateTests {

        @BeforeEach
        void stubUser() {
            lenient().when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            lenient().when(scheduledTxDao.countByUserId(USER_ID)).thenReturn(0L);
        }

        @Test
        @DisplayName("should create with all valid parameters")
        void shouldCreate_whenAllParamsValid() throws InstanceNotFoundException {
            ScheduledTransaction st = service.create(
                    USER_ID, "Rent", new BigDecimal("800.00"),
                    TransactionType.EXPENSE, null, null, true,
                    0, 1, 0, 0, LocalDate.of(2025, 1, 1));

            assertNotNull(st);
            assertEquals("Rent", st.getName());
            assertEquals(new BigDecimal("800.00"), st.getAmount());
            assertEquals(TransactionType.EXPENSE, st.getType());
            assertEquals(0, st.getFreqYears());
            assertEquals(1, st.getFreqMonths());
            assertEquals(0, st.getFreqWeeks());
            assertEquals(0, st.getFreqDays());
            verify(scheduledTxDao).save(any());
        }

        @Test
        @DisplayName("should trim leading/trailing whitespace from name")
        void shouldTrimName() throws InstanceNotFoundException {
            ScheduledTransaction st = service.create(
                    USER_ID, "  Netflix Subscription  ", new BigDecimal("15.99"),
                    TransactionType.EXPENSE, null, null, true,
                    0, 0, 0, 7, LocalDate.now());

            assertEquals("Netflix Subscription", st.getName());
        }

        @Test
        @DisplayName("should create with only freqDays=1 (daily)")
        void shouldCreate_withDailyFrequency() throws InstanceNotFoundException {
            ScheduledTransaction st = service.create(
                    USER_ID, "Savings", new BigDecimal("1.00"),
                    TransactionType.INCOME, null, null, false,
                    0, 0, 0, 1, LocalDate.now());

            assertEquals(1, st.getFreqDays());
            assertEquals(0, st.getFreqWeeks());
        }

        @Test
        @DisplayName("should create with only freqYears=1 (annual)")
        void shouldCreate_withAnnualFrequency() throws InstanceNotFoundException {
            ScheduledTransaction st = service.create(
                    USER_ID, "Car insurance", new BigDecimal("350.00"),
                    TransactionType.EXPENSE, null, null, true,
                    1, 0, 0, 0, LocalDate.of(2025, 3, 1));

            assertEquals(1, st.getFreqYears());
        }

        @Test
        @DisplayName("should create with combined frequency (1 year + 2 months + 3 weeks + 4 days)")
        void shouldCreate_withCombinedFrequency() throws InstanceNotFoundException {
            ScheduledTransaction st = service.create(
                    USER_ID, "Complex schedule", new BigDecimal("99.99"),
                    TransactionType.EXPENSE, null, null, true,
                    1, 2, 3, 4, LocalDate.now());

            assertEquals(1, st.getFreqYears());
            assertEquals(2, st.getFreqMonths());
            assertEquals(3, st.getFreqWeeks());
            assertEquals(4, st.getFreqDays());
        }

        @Test
        @DisplayName("should create with minimum valid amount (0.01)")
        void shouldCreate_withMinimumAmount() throws InstanceNotFoundException {
            ScheduledTransaction st = service.create(
                    USER_ID, "Tiny fee", new BigDecimal("0.01"),
                    TransactionType.EXPENSE, null, null, true,
                    0, 0, 1, 0, LocalDate.now());

            assertEquals(new BigDecimal("0.01"), st.getAmount());
        }

        @Test
        @DisplayName("should create with very large amount")
        void shouldCreate_withLargeAmount() throws InstanceNotFoundException {
            ScheduledTransaction st = service.create(
                    USER_ID, "Salary", new BigDecimal("999999.99"),
                    TransactionType.INCOME, null, null, false,
                    0, 1, 0, 0, LocalDate.now());

            assertEquals(new BigDecimal("999999.99"), st.getAmount());
        }

        @Test
        @DisplayName("should link account and category when provided")
        void shouldCreate_withAccountAndCategory() throws InstanceNotFoundException {
            when(accountDao.findByIdAndUserId(ACC_ID, USER_ID)).thenReturn(Optional.of(account));
            when(categoryDao.findByIdAndUserId(CAT_ID, USER_ID)).thenReturn(Optional.of(category));

            ScheduledTransaction st = service.create(
                    USER_ID, "Groceries", new BigDecimal("100.00"),
                    TransactionType.EXPENSE, ACC_ID, CAT_ID, true,
                    0, 0, 1, 0, LocalDate.now());

            assertEquals(account, st.getAccount());
            assertEquals(category, st.getCategory());
        }

        @Test
        @DisplayName("should create with startDate far in the past")
        void shouldCreate_withPastStartDate() throws InstanceNotFoundException {
            ScheduledTransaction st = service.create(
                    USER_ID, "Old subscription", new BigDecimal("5.00"),
                    TransactionType.EXPENSE, null, null, true,
                    0, 1, 0, 0, LocalDate.of(2020, 1, 1));

            assertEquals(LocalDate.of(2020, 1, 1), st.getStartDate());
        }

        @Test
        @DisplayName("should create with startDate far in the future")
        void shouldCreate_withFutureStartDate() throws InstanceNotFoundException {
            ScheduledTransaction st = service.create(
                    USER_ID, "Future plan", new BigDecimal("200.00"),
                    TransactionType.INCOME, null, null, true,
                    0, 1, 0, 0, LocalDate.of(2030, 12, 31));

            assertEquals(LocalDate.of(2030, 12, 31), st.getStartDate());
        }

        @Test
        @DisplayName("should throw when name is null")
        void shouldThrow_whenNameIsNull() {
            assertThrows(ScheduledTransactionInvalidException.class,
                    () -> service.create(USER_ID, null, new BigDecimal("10.00"),
                            TransactionType.EXPENSE, null, null, true,
                            0, 1, 0, 0, LocalDate.now()));
        }

        @ParameterizedTest
        @ValueSource(strings = {"", "   ", "\t", "\n"})
        @DisplayName("should throw when name is blank")
        void shouldThrow_whenNameIsBlank(String blankName) {
            assertThrows(ScheduledTransactionInvalidException.class,
                    () -> service.create(USER_ID, blankName, new BigDecimal("10.00"),
                            TransactionType.EXPENSE, null, null, true,
                            0, 1, 0, 0, LocalDate.now()));
        }

        @Test
        @DisplayName("should throw when amount is null")
        void shouldThrow_whenAmountIsNull() {
            assertThrows(ScheduledTransactionInvalidException.class,
                    () -> service.create(USER_ID, "Test", null,
                            TransactionType.EXPENSE, null, null, true,
                            0, 1, 0, 0, LocalDate.now()));
        }

        @Test
        @DisplayName("should throw when amount is zero")
        void shouldThrow_whenAmountIsZero() {
            assertThrows(ScheduledTransactionInvalidException.class,
                    () -> service.create(USER_ID, "Test", BigDecimal.ZERO,
                            TransactionType.EXPENSE, null, null, true,
                            0, 1, 0, 0, LocalDate.now()));
        }

        @Test
        @DisplayName("should throw when amount is negative")
        void shouldThrow_whenAmountIsNegative() {
            assertThrows(ScheduledTransactionInvalidException.class,
                    () -> service.create(USER_ID, "Test", new BigDecimal("-50.00"),
                            TransactionType.EXPENSE, null, null, true,
                            0, 1, 0, 0, LocalDate.now()));
        }

        @Test
        @DisplayName("should throw when type is null")
        void shouldThrow_whenTypeIsNull() {
            assertThrows(ScheduledTransactionInvalidException.class,
                    () -> service.create(USER_ID, "Test", new BigDecimal("10.00"),
                            null, null, null, true,
                            0, 1, 0, 0, LocalDate.now()));
        }

        @Test
        @DisplayName("should throw when all frequency components are zero")
        void shouldThrow_whenAllFrequenciesAreZero() {
            assertThrows(ScheduledTransactionInvalidException.class,
                    () -> service.create(USER_ID, "Test", new BigDecimal("10.00"),
                            TransactionType.EXPENSE, null, null, true,
                            0, 0, 0, 0, LocalDate.now()));
        }

        @Test
        @DisplayName("should throw when any frequency component is negative")
        void shouldThrow_whenFrequencyComponentIsNegative() {
            assertThrows(ScheduledTransactionInvalidException.class,
                    () -> service.create(USER_ID, "Test", new BigDecimal("10.00"),
                            TransactionType.EXPENSE, null, null, true,
                            0, -1, 0, 0, LocalDate.now()));
        }

        @Test
        @DisplayName("should throw when freqDays is negative even if others are positive")
        void shouldThrow_whenFreqDaysNegativeAndOthersPositive() {
            assertThrows(ScheduledTransactionInvalidException.class,
                    () -> service.create(USER_ID, "Test", new BigDecimal("10.00"),
                            TransactionType.EXPENSE, null, null, true,
                            1, 0, 0, -2, LocalDate.now()));
        }

        @Test
        @DisplayName("should throw when startDate is null")
        void shouldThrow_whenStartDateIsNull() {
            assertThrows(ScheduledTransactionInvalidException.class,
                    () -> service.create(USER_ID, "Test", new BigDecimal("10.00"),
                            TransactionType.EXPENSE, null, null, true,
                            0, 1, 0, 0, null));
        }

        @Test
        @DisplayName("should throw when maximum scheduled transactions limit is reached")
        void shouldThrow_whenMaxLimitReached() {
            when(scheduledTxDao.countByUserId(USER_ID)).thenReturn(50L);

            assertThrows(ScheduledTransactionInvalidException.class,
                    () -> service.create(USER_ID, "Overflow", new BigDecimal("10.00"),
                            TransactionType.EXPENSE, null, null, true,
                            0, 1, 0, 0, LocalDate.now()));
        }

        @Test
        @DisplayName("should allow creating when just below the limit")
        void shouldAllow_whenAtLimitMinus1() throws InstanceNotFoundException {
            when(scheduledTxDao.countByUserId(USER_ID)).thenReturn(49L);

            assertDoesNotThrow(() -> service.create(
                    USER_ID, "Last one", new BigDecimal("10.00"),
                    TransactionType.EXPENSE, null, null, true,
                    0, 1, 0, 0, LocalDate.now()));
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  firePending
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("firePending")
    class FirePendingTests {

        @Test
        @DisplayName("should return 0 when no active scheduled transactions exist")
        void shouldReturn0_whenNoActiveScheduled() {
            when(scheduledTxDao.findAllByUserIdAndActiveTrue(USER_ID)).thenReturn(List.of());

            int result = service.firePending(USER_ID);

            assertEquals(0, result);
            verifyNoInteractions(transactionDao);
        }

        @Test
        @DisplayName("should create 1 transaction when startDate is today and no lastExecution")
        void shouldCreate1_whenStartDateIsToday() {
            ScheduledTransaction st = buildActiveSt(LocalDate.now(), null, 0, 1, 0, 0);
            when(scheduledTxDao.findAllByUserIdAndActiveTrue(USER_ID)).thenReturn(List.of(st));

            int result = service.firePending(USER_ID);

            assertEquals(1, result);
            verify(transactionDao, times(1)).save(any(Transaction.class));
            assertEquals(LocalDate.now(), st.getLastExecution());
        }

        @Test
        @DisplayName("should create 0 when startDate is tomorrow (future)")
        void shouldCreate0_whenStartDateIsFuture() {
            ScheduledTransaction st = buildActiveSt(LocalDate.now().plusDays(1), null, 0, 1, 0, 0);
            when(scheduledTxDao.findAllByUserIdAndActiveTrue(USER_ID)).thenReturn(List.of(st));

            int result = service.firePending(USER_ID);

            assertEquals(0, result);
            verifyNoInteractions(transactionDao);
        }

        @Test
        @DisplayName("should create multiple transactions for past start dates (monthly)")
        void shouldCreateMultiple_whenStartDateIsInPast_monthly() {
            // Started 3 months ago → should create 3 transactions (3 months ago, 2 months ago, 1 month ago)
            LocalDate start = LocalDate.now().minusMonths(3);
            ScheduledTransaction st = buildActiveSt(start, null, 0, 1, 0, 0);
            when(scheduledTxDao.findAllByUserIdAndActiveTrue(USER_ID)).thenReturn(List.of(st));

            int result = service.firePending(USER_ID);

            // Will be 3 or 4 depending on exact day of month, at minimum 3
            assertTrue(result >= 3);
            verify(transactionDao, atLeast(3)).save(any(Transaction.class));
        }

        @Test
        @DisplayName("should create transactions from lastExecution onward, not from startDate")
        void shouldCreateFromLastExecution_whenLastExecutionSet() {
            LocalDate start = LocalDate.now().minusMonths(6);
            LocalDate lastExec = LocalDate.now().minusMonths(1);
            ScheduledTransaction st = buildActiveSt(start, lastExec, 0, 1, 0, 0);
            when(scheduledTxDao.findAllByUserIdAndActiveTrue(USER_ID)).thenReturn(List.of(st));

            int result = service.firePending(USER_ID);

            // Only transactions after lastExecution → 1
            assertEquals(1, result);
        }

        @Test
        @DisplayName("should not create any transaction when lastExecution was today")
        void shouldCreate0_whenLastExecutionWasToday() {
            ScheduledTransaction st = buildActiveSt(
                    LocalDate.now().minusMonths(1), LocalDate.now(), 0, 1, 0, 0);
            when(scheduledTxDao.findAllByUserIdAndActiveTrue(USER_ID)).thenReturn(List.of(st));

            int result = service.firePending(USER_ID);

            assertEquals(0, result);
        }

        @Test
        @DisplayName("should increase account balance for INCOME transactions")
        void shouldIncreaseBalance_forIncomeType() {
            ScheduledTransaction st = buildActiveSt(LocalDate.now(), null, 0, 1, 0, 0);
            st.setType(TransactionType.INCOME);
            st.setAccount(account);
            st.setAffectsBalance(true);
            BigDecimal before = account.getBalance(); // 500.00

            when(scheduledTxDao.findAllByUserIdAndActiveTrue(USER_ID)).thenReturn(List.of(st));

            service.firePending(USER_ID);

            assertEquals(before.add(st.getAmount()), account.getBalance());
        }

        @Test
        @DisplayName("should decrease account balance for EXPENSE transactions")
        void shouldDecreaseBalance_forExpenseType() {
            ScheduledTransaction st = buildActiveSt(LocalDate.now(), null, 0, 1, 0, 0);
            st.setType(TransactionType.EXPENSE);
            st.setAccount(account);
            st.setAffectsBalance(true);
            BigDecimal before = account.getBalance(); // 500.00

            when(scheduledTxDao.findAllByUserIdAndActiveTrue(USER_ID)).thenReturn(List.of(st));

            service.firePending(USER_ID);

            assertEquals(before.subtract(st.getAmount()), account.getBalance());
        }

        @Test
        @DisplayName("should not change balance when affectsBalance is false")
        void shouldNotChangeBalance_whenAffectsBalanceFalse() {
            ScheduledTransaction st = buildActiveSt(LocalDate.now(), null, 0, 1, 0, 0);
            st.setAccount(account);
            st.setAffectsBalance(false);
            BigDecimal before = account.getBalance();

            when(scheduledTxDao.findAllByUserIdAndActiveTrue(USER_ID)).thenReturn(List.of(st));

            service.firePending(USER_ID);

            assertEquals(before, account.getBalance());
        }

        @Test
        @DisplayName("should not change balance when account is null")
        void shouldNotCrash_whenAccountIsNull() {
            ScheduledTransaction st = buildActiveSt(LocalDate.now(), null, 0, 1, 0, 0);
            st.setAccount(null);
            st.setAffectsBalance(true);

            when(scheduledTxDao.findAllByUserIdAndActiveTrue(USER_ID)).thenReturn(List.of(st));

            assertDoesNotThrow(() -> service.firePending(USER_ID));
        }

        @Test
        @DisplayName("should handle weekly frequency correctly")
        void shouldCreateCorrectly_withWeeklyFrequency() {
            // Started 3 weeks ago → fires at start, +1w, +2w, +3w(=today) = 4 transactions
            LocalDate start = LocalDate.now().minusWeeks(3);
            ScheduledTransaction st = buildActiveSt(start, null, 0, 0, 1, 0);
            when(scheduledTxDao.findAllByUserIdAndActiveTrue(USER_ID)).thenReturn(List.of(st));

            int result = service.firePending(USER_ID);

            assertEquals(4, result);
        }

        @Test
        @DisplayName("should handle daily frequency and cap at 100 iterations max")
        void shouldCapAt100Iterations() {
            // Started 200 days ago with daily frequency
            LocalDate start = LocalDate.now().minusDays(200);
            ScheduledTransaction st = buildActiveSt(start, null, 0, 0, 0, 1);
            when(scheduledTxDao.findAllByUserIdAndActiveTrue(USER_ID)).thenReturn(List.of(st));

            int result = service.firePending(USER_ID);

            // Capped at 100 due to service limit
            assertEquals(100, result);
        }

        @Test
        @DisplayName("should set lastExecution to the last fired date")
        void shouldSetLastExecution_toLastFiredDate() {
            LocalDate start = LocalDate.now().minusMonths(2);
            ScheduledTransaction st = buildActiveSt(start, null, 0, 1, 0, 0);
            when(scheduledTxDao.findAllByUserIdAndActiveTrue(USER_ID)).thenReturn(List.of(st));

            service.firePending(USER_ID);

            assertNotNull(st.getLastExecution());
            assertFalse(st.getLastExecution().isAfter(LocalDate.now()));
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  calculateNextExecution
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("calculateNextExecution")
    class CalculateNextExecutionTests {

        @Test
        @DisplayName("should return startDate when lastExecution is null")
        void shouldReturnStartDate_whenNoLastExecution() {
            ScheduledTransaction st = buildActiveSt(LocalDate.of(2025, 6, 15), null, 0, 1, 0, 0);

            LocalDate next = service.calculateNextExecution(st);

            assertEquals(LocalDate.of(2025, 6, 15), next);
        }

        @Test
        @DisplayName("should return startDate + 1 month when lastExecution is startDate")
        void shouldReturnNextMonth_whenLastExecutionIsStartDate() {
            ScheduledTransaction st = buildActiveSt(
                    LocalDate.of(2025, 1, 15), LocalDate.of(2025, 1, 15), 0, 1, 0, 0);

            LocalDate next = service.calculateNextExecution(st);

            assertEquals(LocalDate.of(2025, 2, 15), next);
        }

        @Test
        @DisplayName("should correctly advance by combined frequency")
        void shouldAdvanceByCombinedFrequency() {
            // freq: 1 year + 2 months + 3 weeks + 4 days
            ScheduledTransaction st = buildActiveSt(
                    LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 1), 1, 2, 3, 4);

            LocalDate expected = LocalDate.of(2024, 1, 1)
                    .plusYears(1).plusMonths(2).plusWeeks(3).plusDays(4);

            assertEquals(expected, service.calculateNextExecution(st));
        }

        @Test
        @DisplayName("should handle month-end edge case (Jan 31 + 1 month = Feb 28/29)")
        void shouldHandleMonthEndEdgeCase() {
            ScheduledTransaction st = buildActiveSt(
                    LocalDate.of(2025, 1, 31), LocalDate.of(2025, 1, 31), 0, 1, 0, 0);

            LocalDate next = service.calculateNextExecution(st);

            // Java LocalDate handles this: Jan 31 + 1 month = Feb 28 (2025 is not leap year)
            assertEquals(LocalDate.of(2025, 2, 28), next);
        }

        @Test
        @DisplayName("should handle leap year correctly (Feb 29 + 1 year)")
        void shouldHandleLeapYearEdgeCase() {
            ScheduledTransaction st = buildActiveSt(
                    LocalDate.of(2024, 2, 29), LocalDate.of(2024, 2, 29), 1, 0, 0, 0);

            LocalDate next = service.calculateNextExecution(st);

            // 2025 is not a leap year, so Feb 29 + 1 year = Feb 28, 2025
            assertEquals(LocalDate.of(2025, 2, 28), next);
        }

        @Test
        @DisplayName("should handle daily frequency (7 days = 1 week)")
        void shouldHandle7DayFrequency() {
            ScheduledTransaction st = buildActiveSt(
                    LocalDate.of(2025, 3, 1), LocalDate.of(2025, 3, 1), 0, 0, 0, 7);

            LocalDate next = service.calculateNextExecution(st);

            assertEquals(LocalDate.of(2025, 3, 8), next);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  update
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("update")
    class UpdateTests {

        private ScheduledTransaction existing;

        @BeforeEach
        void setUp() {
            existing = buildActiveSt(LocalDate.of(2025, 1, 1), null, 0, 1, 0, 0);
            setFieldViaReflection(existing, "id", ST_ID);
            when(scheduledTxDao.findByIdAndUserId(ST_ID, USER_ID)).thenReturn(Optional.of(existing));
        }

        @Test
        @DisplayName("should partially update only name")
        void shouldUpdateOnlyName() throws InstanceNotFoundException {
            service.update(USER_ID, ST_ID, "New Name", null, null,
                    null, null, null, null, null, null, null, null, null);

            assertEquals("New Name", existing.getName());
            assertEquals(1, existing.getFreqMonths()); // unchanged
        }

        @Test
        @DisplayName("should trim name on update")
        void shouldTrimNameOnUpdate() throws InstanceNotFoundException {
            service.update(USER_ID, ST_ID, "  Trimmed  ", null, null,
                    null, null, null, null, null, null, null, null, null);

            assertEquals("Trimmed", existing.getName());
        }

        @Test
        @DisplayName("should update amount to a new positive value")
        void shouldUpdateAmount() throws InstanceNotFoundException {
            service.update(USER_ID, ST_ID, null, new BigDecimal("250.00"), null,
                    null, null, null, null, null, null, null, null, null);

            assertEquals(new BigDecimal("250.00"), existing.getAmount());
        }

        @Test
        @DisplayName("should update freqDays and validate total > 0")
        void shouldUpdateFreqDays() throws InstanceNotFoundException {
            existing.setFreqMonths(0);
            setFieldViaReflection(existing, "freqMonths", 0);
            service.update(USER_ID, ST_ID, null, null, null,
                    null, null, null, 0, 0, 0, 7, null, null);

            assertEquals(7, existing.getFreqDays());
        }

        @Test
        @DisplayName("should throw when update results in all frequencies being zero")
        void shouldThrow_whenUpdateResultsInAllZeroFrequencies() {
            // Existing has freqMonths=1; set all to 0
            assertThrows(ScheduledTransactionInvalidException.class,
                    () -> service.update(USER_ID, ST_ID, null, null, null,
                            null, null, null, 0, 0, 0, 0, null, null));
        }

        @Test
        @DisplayName("should throw when update sets amount to zero")
        void shouldThrow_whenUpdateSetsAmountToZero() {
            assertThrows(ScheduledTransactionInvalidException.class,
                    () -> service.update(USER_ID, ST_ID, null, BigDecimal.ZERO, null,
                            null, null, null, null, null, null, null, null, null));
        }

        @Test
        @DisplayName("should throw when update sets amount to negative")
        void shouldThrow_whenUpdateSetsAmountToNegative() {
            assertThrows(ScheduledTransactionInvalidException.class,
                    () -> service.update(USER_ID, ST_ID, null, new BigDecimal("-1.00"), null,
                            null, null, null, null, null, null, null, null, null));
        }

        @Test
        @DisplayName("should deactivate when active is set to false")
        void shouldDeactivate_whenActiveFalse() throws InstanceNotFoundException {
            service.update(USER_ID, ST_ID, null, null, null,
                    null, null, null, null, null, null, null, null, false);

            assertFalse(existing.isActive());
        }

        @Test
        @DisplayName("should throw InstanceNotFoundException when ST not found")
        void shouldThrow_whenNotFound() {
            when(scheduledTxDao.findByIdAndUserId(ST_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> service.update(USER_ID, ST_ID, "X", null, null,
                            null, null, null, null, null, null, null, null, null));
        }

        @Test
        @DisplayName("should throw when update sets blank name")
        void shouldThrow_whenUpdateSetsBlankName() {
            assertThrows(ScheduledTransactionInvalidException.class,
                    () -> service.update(USER_ID, ST_ID, "   ", null, null,
                            null, null, null, null, null, null, null, null, null));
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  delete
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("delete")
    class DeleteTests {

        @Test
        @DisplayName("should delete existing scheduled transaction")
        void shouldDelete_whenFound() throws InstanceNotFoundException {
            ScheduledTransaction st = buildActiveSt(LocalDate.now(), null, 0, 1, 0, 0);
            when(scheduledTxDao.findByIdAndUserId(ST_ID, USER_ID)).thenReturn(Optional.of(st));

            service.delete(USER_ID, ST_ID);

            verify(scheduledTxDao).delete(st);
        }

        @Test
        @DisplayName("should throw when scheduled transaction not found for user")
        void shouldThrow_whenNotFound() {
            when(scheduledTxDao.findByIdAndUserId(ST_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> service.delete(USER_ID, ST_ID));
        }

        @Test
        @DisplayName("should not delete other user's scheduled transaction")
        void shouldThrow_whenBelongsToAnotherUser() {
            UUID otherId = UUID.randomUUID();
            when(scheduledTxDao.findByIdAndUserId(ST_ID, otherId)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> service.delete(otherId, ST_ID));
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  findAllByUserId
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("findAllByUserId")
    class FindAllTests {

        @Test
        @DisplayName("should return paginated page of scheduled transactions")
        void shouldReturnPage() {
            ScheduledTransaction st = buildActiveSt(LocalDate.now(), null, 0, 1, 0, 0);
            Page<ScheduledTransaction> page = new PageImpl<>(List.of(st));
            when(scheduledTxDao.findAllByUserIdOrderByNameAsc(eq(USER_ID), any(Pageable.class)))
                    .thenReturn(page);

            Page<ScheduledTransaction> result = service.findAllByUserId(USER_ID, 0, 20);

            assertEquals(1, result.getTotalElements());
        }

        @Test
        @DisplayName("should return empty page when user has none")
        void shouldReturnEmptyPage() {
            when(scheduledTxDao.findAllByUserIdOrderByNameAsc(eq(USER_ID), any(Pageable.class)))
                    .thenReturn(Page.empty());

            Page<ScheduledTransaction> result = service.findAllByUserId(USER_ID, 0, 20);

            assertTrue(result.isEmpty());
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    private ScheduledTransaction buildActiveSt(LocalDate startDate, LocalDate lastExecution,
                                                int freqYears, int freqMonths,
                                                int freqWeeks, int freqDays) {
        ScheduledTransaction st = new ScheduledTransaction(
                "Test scheduled", new BigDecimal("100.00"),
                TransactionType.EXPENSE, freqYears, freqMonths, freqWeeks, freqDays,
                startDate, user);
        st.setLastExecution(lastExecution);
        st.setAffectsBalance(false);
        return st;
    }

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
