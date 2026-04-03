package Balio.web.model.services;

import Balio.web.enums.AccountType;
import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.AccountInvalidException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.AccountDao;
import Balio.web.model.entities.BankConnectionDao;
import Balio.web.model.entities.BankTransactionRuleDao;
import Balio.web.model.entities.ScheduledTransaction;
import Balio.web.model.entities.ScheduledTransactionDao;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link AccountServiceImpl}.
 * <p>
 * Uses Mockito (no Spring context) to test business rules, ownership,
 * validation, default-account logic, and exception flows in isolation.
 */
@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    /* ───── shared constants ───── */
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID ACCOUNT_ID = UUID.randomUUID();
    private static final String VALID_NAME = "Main Account";

    @Mock
    private UserDao userDao;

    @Mock
    private AccountDao accountDao;

    @Mock
    private TransactionDao transactionDao;

    @Mock
    private BankConnectionDao bankConnectionDao;

    @Mock
    private BankTransactionRuleDao bankTransactionRuleDao;

    @Mock
    private ScheduledTransactionDao scheduledTransactionDao;

    @InjectMocks
    private AccountServiceImpl accountService;

    private User user;
    private Account existingAccount;

    @BeforeEach
    void setUp() {
        user = new User("Nick", "nick@example.com", "encodedPwd");
        setFieldViaReflection(user, "id", USER_ID);

        existingAccount = new Account(VALID_NAME, AccountType.BANK, "EUR", new BigDecimal("1000.00"), user);
        setFieldViaReflection(existingAccount, "id", ACCOUNT_ID);

        lenient().when(bankTransactionRuleDao.findAllByUserIdAndAccountIdOrderByPriorityDesc(USER_ID, ACCOUNT_ID))
            .thenReturn(List.of());
        lenient().when(bankConnectionDao.findByAccountIdAndUserId(ACCOUNT_ID, USER_ID))
            .thenReturn(Optional.empty());
        lenient().when(transactionDao.findAllByUserIdAndAccountIdOrderByDateDesc(USER_ID, ACCOUNT_ID))
            .thenReturn(List.of());
        lenient().when(scheduledTransactionDao.findAllByUserIdAndAccountIdOrderByStartDateAsc(USER_ID, ACCOUNT_ID))
            .thenReturn(List.of());
    }

    /* ═══════════════════════════════════════════════════════════
     *  createAccount
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("createAccount")
    class CreateAccountTests {

        @Test
        @DisplayName("should create account with all valid explicit params")
        void shouldCreateAccount_whenAllParamsValid() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.countByUserId(USER_ID)).thenReturn(0L);

            Account result = accountService.createAccount(
                    USER_ID, VALID_NAME, AccountType.BANK, "USD", false);

            assertNotNull(result);
            assertEquals(VALID_NAME, result.getName());
            assertEquals(AccountType.BANK, result.getType());
            assertEquals("USD", result.getCurrency());
            assertEquals(BigDecimal.ZERO, result.getBalance());
            assertEquals(user, result.getUser());

            verify(accountDao).save(any(Account.class));
        }

        @Test
        @DisplayName("should use default name when name is null")
        void shouldUseDefaultName_whenNameNull() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.countByUserId(USER_ID)).thenReturn(2L);

            Account result = accountService.createAccount(USER_ID, null, AccountType.CASH, "EUR", false);

            assertEquals("Account 3", result.getName());
        }

        @Test
        @DisplayName("should use default name when name is blank")
        void shouldUseDefaultName_whenNameBlank() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.countByUserId(USER_ID)).thenReturn(0L);

            Account result = accountService.createAccount(USER_ID, "   ", AccountType.CASH, "EUR", false);

            assertEquals("Account 1", result.getName());
        }

        @Test
        @DisplayName("should default type to CASH when type is null")
        void shouldDefaultTypeToCash_whenTypeNull() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.countByUserId(USER_ID)).thenReturn(0L);

            Account result = accountService.createAccount(USER_ID, VALID_NAME, null, "EUR", false);

            assertEquals(AccountType.CASH, result.getType());
        }

        @Test
        @DisplayName("should default currency to EUR when currency is null")
        void shouldDefaultCurrencyToEur_whenCurrencyNull() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.countByUserId(USER_ID)).thenReturn(0L);

            Account result = accountService.createAccount(USER_ID, VALID_NAME, AccountType.BANK, null, false);

            assertEquals("EUR", result.getCurrency());
        }

        @Test
        @DisplayName("should default currency to EUR when currency is blank")
        void shouldDefaultCurrencyToEur_whenCurrencyBlank() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.countByUserId(USER_ID)).thenReturn(0L);

            Account result = accountService.createAccount(USER_ID, VALID_NAME, AccountType.BANK, "  ", false);

            assertEquals("EUR", result.getCurrency());
        }

        @Test
        @DisplayName("should set as default account when setDefault is true")
        void shouldSetDefault_whenSetDefaultTrue() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.countByUserId(USER_ID)).thenReturn(0L);

            Account result = accountService.createAccount(
                    USER_ID, VALID_NAME, AccountType.BANK, "EUR", true);

            assertEquals(result, user.getDefaultAccount());
            verify(userDao).save(user);
        }

        @Test
        @DisplayName("should not set as default when setDefault is false")
        void shouldNotSetDefault_whenSetDefaultFalse() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.countByUserId(USER_ID)).thenReturn(0L);

            accountService.createAccount(USER_ID, VALID_NAME, AccountType.BANK, "EUR", false);

            assertNull(user.getDefaultAccount());
            verify(userDao, never()).save(any());
        }

        @Test
        @DisplayName("should not set as default when setDefault is null")
        void shouldNotSetDefault_whenSetDefaultNull() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.countByUserId(USER_ID)).thenReturn(0L);

            accountService.createAccount(USER_ID, VALID_NAME, AccountType.BANK, "EUR", null);

            assertNull(user.getDefaultAccount());
            verify(userDao, never()).save(any());
        }

        @Test
        @DisplayName("should create account of type OTHER")
        void shouldCreateOtherType() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.countByUserId(USER_ID)).thenReturn(0L);

            Account result = accountService.createAccount(
                    USER_ID, VALID_NAME, AccountType.OTHER, "GBP", false);

            assertEquals(AccountType.OTHER, result.getType());
            assertEquals("GBP", result.getCurrency());
        }

        @Test
        @DisplayName("should throw UserNotFoundException when user does not exist")
        void shouldThrowUserNotFound_whenUserDoesNotExist() {
            UUID unknownId = UUID.randomUUID();
            when(userDao.findById(unknownId)).thenReturn(Optional.empty());

            assertThrows(UserNotFoundException.class,
                    () -> accountService.createAccount(unknownId, VALID_NAME, AccountType.BANK, "EUR", false));

            verify(accountDao, never()).save(any());
        }

        @Test
        @DisplayName("should throw AccountInvalidException when account limit (5) reached")
        void shouldThrowAccountInvalid_whenLimitReached() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.countByUserId(USER_ID)).thenReturn(5L);

            AccountInvalidException ex = assertThrows(AccountInvalidException.class,
                    () -> accountService.createAccount(USER_ID, VALID_NAME, AccountType.BANK, "EUR", false));

            assertTrue(ex.getMessage().contains("5"));
            verify(accountDao, never()).save(any());
        }

        @Test
        @DisplayName("should allow creating when at 4 accounts (just under limit)")
        void shouldAllow_whenJustUnderLimit() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.countByUserId(USER_ID)).thenReturn(4L);

            Account result = accountService.createAccount(
                    USER_ID, VALID_NAME, AccountType.BANK, "EUR", false);

            assertNotNull(result);
            verify(accountDao).save(any(Account.class));
        }

        @Test
        @DisplayName("should always initialize balance to zero")
        void shouldInitializeBalanceToZero() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.countByUserId(USER_ID)).thenReturn(0L);

            Account result = accountService.createAccount(
                    USER_ID, VALID_NAME, AccountType.BANK, "EUR", false);

            assertEquals(BigDecimal.ZERO, result.getBalance());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  deleteAccount
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("deleteAccount")
    class DeleteAccountTests {

        @Test
        @DisplayName("should delete account when it exists and belongs to user")
        void shouldDeleteAccount_whenExistsAndOwned() throws InstanceNotFoundException {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID))
                    .thenReturn(Optional.of(existingAccount));

            accountService.deleteAccount(USER_ID, ACCOUNT_ID);

            verify(accountDao).delete(existingAccount);
        }

        @Test
        @DisplayName("should clear default when deleting the user's default account")
        void shouldClearDefault_whenDeletingDefaultAccount() throws InstanceNotFoundException {
            user.setDefaultAccount(existingAccount);

            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID))
                    .thenReturn(Optional.of(existingAccount));

            accountService.deleteAccount(USER_ID, ACCOUNT_ID);

            assertNull(user.getDefaultAccount());
            verify(userDao).save(user);
            verify(accountDao).delete(existingAccount);
        }

        @Test
        @DisplayName("should not clear default when deleting a non-default account")
        void shouldNotClearDefault_whenDeletingNonDefaultAccount() throws InstanceNotFoundException {
            Account otherDefault = new Account("Other", AccountType.CASH, "EUR", BigDecimal.ZERO, user);
            UUID otherDefaultId = UUID.randomUUID();
            setFieldViaReflection(otherDefault, "id", otherDefaultId);
            user.setDefaultAccount(otherDefault);

            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID))
                    .thenReturn(Optional.of(existingAccount));

            accountService.deleteAccount(USER_ID, ACCOUNT_ID);

            assertEquals(otherDefault, user.getDefaultAccount());
            verify(userDao, never()).save(any());
            verify(accountDao).delete(existingAccount);
        }

        @Test
        @DisplayName("should delete normally when user has no default account set")
        void shouldDeleteNormally_whenNoDefaultAccountSet() throws InstanceNotFoundException {
            // user.defaultAccount is null by default
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID))
                    .thenReturn(Optional.of(existingAccount));

            accountService.deleteAccount(USER_ID, ACCOUNT_ID);

            verify(userDao, never()).save(any());
            verify(accountDao).delete(existingAccount);
        }

        @Test
        @DisplayName("should clear account reference in scheduled transactions before deleting account")
        void shouldClearScheduledTransactionAccountReferences() throws InstanceNotFoundException {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID))
                    .thenReturn(Optional.of(existingAccount));

            ScheduledTransaction scheduled = new ScheduledTransaction(
                    "Rent", new BigDecimal("900.00"), TransactionType.EXPENSE,
                    0, 1, 0, 0, LocalDate.now(), user);
            scheduled.setAccount(existingAccount);

            when(scheduledTransactionDao.findAllByUserIdAndAccountIdOrderByStartDateAsc(USER_ID, ACCOUNT_ID))
                    .thenReturn(List.of(scheduled));

            accountService.deleteAccount(USER_ID, ACCOUNT_ID);

            assertNull(scheduled.getAccount());
            verify(scheduledTransactionDao).saveAll(any());
            verify(accountDao).delete(existingAccount);
        }

        @Test
        @DisplayName("should throw InstanceNotFoundException when account does not exist")
        void shouldThrowInstanceNotFound_whenAccountDoesNotExist() {
            UUID unknownId = UUID.randomUUID();
            when(accountDao.findByIdAndUserId(unknownId, USER_ID))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> accountService.deleteAccount(USER_ID, unknownId));

            verify(accountDao, never()).delete(any());
        }

        @Test
        @DisplayName("should throw InstanceNotFoundException when account belongs to another user")
        void shouldThrowInstanceNotFound_whenAccountBelongsToAnotherUser() {
            UUID otherUserId = UUID.randomUUID();
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, otherUserId))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> accountService.deleteAccount(otherUserId, ACCOUNT_ID));

            verify(accountDao, never()).delete(any());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  modifyAccount
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("modifyAccount")
    class ModifyAccountTests {

        @Test
        @DisplayName("should update all fields when all provided")
        void shouldModifyAccount_whenAllFieldsProvided() throws InstanceNotFoundException {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID))
                    .thenReturn(Optional.of(existingAccount));

            Account result = accountService.modifyAccount(
                    USER_ID, ACCOUNT_ID, "Savings", AccountType.OTHER, "USD");

            assertEquals("Savings", result.getName());
            assertEquals(AccountType.OTHER, result.getType());
            assertEquals("USD", result.getCurrency());
            verify(accountDao).save(existingAccount);
        }

        @Test
        @DisplayName("should update only name when type and currency are null")
        void shouldModifyOnlyName_whenOthersNull() throws InstanceNotFoundException {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID))
                    .thenReturn(Optional.of(existingAccount));

            Account result = accountService.modifyAccount(
                    USER_ID, ACCOUNT_ID, "New Name", null, null);

            assertEquals("New Name", result.getName());
            assertEquals(AccountType.BANK, result.getType()); // unchanged
            assertEquals("EUR", result.getCurrency()); // unchanged
        }

        @Test
        @DisplayName("should update only type when name and currency are null")
        void shouldModifyOnlyType_whenOthersNull() throws InstanceNotFoundException {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID))
                    .thenReturn(Optional.of(existingAccount));

            Account result = accountService.modifyAccount(
                    USER_ID, ACCOUNT_ID, null, AccountType.CASH, null);

            assertEquals(VALID_NAME, result.getName()); // unchanged
            assertEquals(AccountType.CASH, result.getType());
            assertEquals("EUR", result.getCurrency()); // unchanged
        }

        @Test
        @DisplayName("should update only currency when name and type are null")
        void shouldModifyOnlyCurrency_whenOthersNull() throws InstanceNotFoundException {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID))
                    .thenReturn(Optional.of(existingAccount));

            Account result = accountService.modifyAccount(
                    USER_ID, ACCOUNT_ID, null, null, "GBP");

            assertEquals(VALID_NAME, result.getName()); // unchanged
            assertEquals(AccountType.BANK, result.getType()); // unchanged
            assertEquals("GBP", result.getCurrency());
        }

        @Test
        @DisplayName("should not modify anything when all params are null")
        void shouldNotModifyAnything_whenAllNull() throws InstanceNotFoundException {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID))
                    .thenReturn(Optional.of(existingAccount));

            Account result = accountService.modifyAccount(
                    USER_ID, ACCOUNT_ID, null, null, null);

            assertEquals(VALID_NAME, result.getName());
            assertEquals(AccountType.BANK, result.getType());
            assertEquals("EUR", result.getCurrency());
            verify(accountDao).save(existingAccount);
        }

        @Test
        @DisplayName("should throw InstanceNotFoundException when account not found")
        void shouldThrowInstanceNotFound_whenAccountNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(accountDao.findByIdAndUserId(unknownId, USER_ID))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> accountService.modifyAccount(
                            USER_ID, unknownId, "Name", AccountType.BANK, "EUR"));

            verify(accountDao, never()).save(any());
        }

        @Test
        @DisplayName("should throw InstanceNotFoundException when account belongs to another user")
        void shouldThrowInstanceNotFound_whenOwnershipFails() {
            UUID otherUserId = UUID.randomUUID();
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, otherUserId))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> accountService.modifyAccount(
                            otherUserId, ACCOUNT_ID, "Name", AccountType.BANK, "EUR"));

            verify(accountDao, never()).save(any());
        }

        @ParameterizedTest(name = "should throw AccountInvalidException when name is \"{0}\"")
        @ValueSource(strings = {"   ", "\t", "\n", ""})
        @DisplayName("should throw AccountInvalidException for blank name")
        void shouldThrowAccountInvalid_whenNameBlank(String blankName) {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID))
                    .thenReturn(Optional.of(existingAccount));

            AccountInvalidException ex = assertThrows(AccountInvalidException.class,
                    () -> accountService.modifyAccount(
                            USER_ID, ACCOUNT_ID, blankName, null, null));

            assertEquals("Account name cannot be blank", ex.getMessage());
            verify(accountDao, never()).save(any());
        }

        @ParameterizedTest(name = "should throw AccountInvalidException when currency is \"{0}\"")
        @ValueSource(strings = {"   ", "\t", "\n", ""})
        @DisplayName("should throw AccountInvalidException for blank currency")
        void shouldThrowAccountInvalid_whenCurrencyBlank(String blankCurrency) {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID))
                    .thenReturn(Optional.of(existingAccount));

            AccountInvalidException ex = assertThrows(AccountInvalidException.class,
                    () -> accountService.modifyAccount(
                            USER_ID, ACCOUNT_ID, null, null, blankCurrency));

            assertEquals("Currency cannot be blank", ex.getMessage());
            verify(accountDao, never()).save(any());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  setDefaultAccount
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("setDefaultAccount")
    class SetDefaultAccountTests {

        @Test
        @DisplayName("should set account as default when it exists and belongs to user")
        void shouldSetDefault_whenAccountExistsAndOwned() throws InstanceNotFoundException {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID))
                    .thenReturn(Optional.of(existingAccount));

            User result = accountService.setDefaultAccount(USER_ID, ACCOUNT_ID);

            assertEquals(existingAccount, result.getDefaultAccount());
            verify(userDao).save(user);
        }

        @Test
        @DisplayName("should replace previous default with new one")
        void shouldReplaceDefault_whenPreviousDefaultExists() throws InstanceNotFoundException {
            Account previousDefault = new Account("Old Default", AccountType.CASH, "EUR", BigDecimal.ZERO, user);
            setFieldViaReflection(previousDefault, "id", UUID.randomUUID());
            user.setDefaultAccount(previousDefault);

            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID))
                    .thenReturn(Optional.of(existingAccount));

            User result = accountService.setDefaultAccount(USER_ID, ACCOUNT_ID);

            assertEquals(existingAccount, result.getDefaultAccount());
            verify(userDao).save(user);
        }

        @Test
        @DisplayName("should be idempotent when setting same account as default again")
        void shouldBeIdempotent_whenAlreadyDefault() throws InstanceNotFoundException {
            user.setDefaultAccount(existingAccount);

            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID))
                    .thenReturn(Optional.of(existingAccount));

            User result = accountService.setDefaultAccount(USER_ID, ACCOUNT_ID);

            assertEquals(existingAccount, result.getDefaultAccount());
        }

        @Test
        @DisplayName("should throw UserNotFoundException when user does not exist")
        void shouldThrowUserNotFound_whenUserDoesNotExist() {
            UUID unknownUserId = UUID.randomUUID();
            when(userDao.findById(unknownUserId)).thenReturn(Optional.empty());

            assertThrows(UserNotFoundException.class,
                    () -> accountService.setDefaultAccount(unknownUserId, ACCOUNT_ID));
        }

        @Test
        @DisplayName("should throw InstanceNotFoundException when account does not exist")
        void shouldThrowInstanceNotFound_whenAccountDoesNotExist() {
            UUID unknownAccountId = UUID.randomUUID();
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.findByIdAndUserId(unknownAccountId, USER_ID))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> accountService.setDefaultAccount(USER_ID, unknownAccountId));
        }

        @Test
        @DisplayName("should throw InstanceNotFoundException when account belongs to another user")
        void shouldThrowInstanceNotFound_whenAccountBelongsToAnotherUser() {
            UUID otherUserId = UUID.randomUUID();
            when(userDao.findById(otherUserId)).thenReturn(Optional.of(
                    new User("Other", "other@test.com", "pwd")));
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, otherUserId))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> accountService.setDefaultAccount(otherUserId, ACCOUNT_ID));
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  clearDefaultAccount
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("clearDefaultAccount")
    class ClearDefaultAccountTests {

        @Test
        @DisplayName("should clear default when user has a default account")
        void shouldClearDefault_whenDefaultExists() {
            user.setDefaultAccount(existingAccount);
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            User result = accountService.clearDefaultAccount(USER_ID);

            assertNull(result.getDefaultAccount());
            verify(userDao).save(user);
        }

        @Test
        @DisplayName("should be idempotent when default is already null")
        void shouldBeIdempotent_whenNoDefaultSet() {
            // user.defaultAccount is null by default
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            User result = accountService.clearDefaultAccount(USER_ID);

            assertNull(result.getDefaultAccount());
            verify(userDao).save(user);
        }

        @Test
        @DisplayName("should throw UserNotFoundException when user does not exist")
        void shouldThrowUserNotFound_whenUserDoesNotExist() {
            UUID unknownUserId = UUID.randomUUID();
            when(userDao.findById(unknownUserId)).thenReturn(Optional.empty());

            assertThrows(UserNotFoundException.class,
                    () -> accountService.clearDefaultAccount(unknownUserId));
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  findAllByUserId
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("findAllByUserId")
    class FindAllByUserIdTests {

        @Test
        @DisplayName("should return all accounts ordered by name")
        void shouldReturnAllAccounts_whenUserHasAccounts() {
            Account a1 = new Account("A-Savings", AccountType.BANK, "EUR", BigDecimal.ZERO, user);
            Account a2 = new Account("B-Cash", AccountType.CASH, "USD", BigDecimal.TEN, user);

            when(accountDao.findAllByUserIdOrderByNameAsc(USER_ID))
                    .thenReturn(List.of(a1, a2));

            List<Account> result = accountService.findAllByUserId(USER_ID);

            assertEquals(2, result.size());
            assertEquals("A-Savings", result.get(0).getName());
            assertEquals("B-Cash", result.get(1).getName());
        }

        @Test
        @DisplayName("should return empty list when user has no accounts")
        void shouldReturnEmptyList_whenNoAccounts() {
            when(accountDao.findAllByUserIdOrderByNameAsc(USER_ID))
                    .thenReturn(List.of());

            List<Account> result = accountService.findAllByUserId(USER_ID);

            assertTrue(result.isEmpty());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  findByIdAndUserId
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("findByIdAndUserId")
    class FindByIdAndUserIdTests {

        @Test
        @DisplayName("should return account when it exists and belongs to user")
        void shouldReturnAccount_whenFoundAndOwned() throws InstanceNotFoundException {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID))
                    .thenReturn(Optional.of(existingAccount));

            Account result = accountService.findByIdAndUserId(ACCOUNT_ID, USER_ID);

            assertNotNull(result);
            assertEquals(VALID_NAME, result.getName());
            assertEquals(ACCOUNT_ID, result.getId());
        }

        @Test
        @DisplayName("should throw InstanceNotFoundException when account does not exist")
        void shouldThrowInstanceNotFound_whenAccountDoesNotExist() {
            UUID unknownId = UUID.randomUUID();
            when(accountDao.findByIdAndUserId(unknownId, USER_ID))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> accountService.findByIdAndUserId(unknownId, USER_ID));
        }

        @Test
        @DisplayName("should throw InstanceNotFoundException when account belongs to another user")
        void shouldThrowInstanceNotFound_whenAccountBelongsToAnotherUser() {
            UUID otherUserId = UUID.randomUUID();
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, otherUserId))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> accountService.findByIdAndUserId(ACCOUNT_ID, otherUserId));
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
