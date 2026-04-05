package Balio.web.model.services;

import Balio.web.enablebanking.EnableBankingClient;
import Balio.web.enablebanking.EnableBankingSyncService;
import Balio.web.enums.AccountType;
import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.AccountInvalidException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.AccountDao;
import Balio.web.model.entities.BankConnection;
import Balio.web.model.entities.BankConnectionDao;
import Balio.web.model.entities.BankTransactionRule;
import Balio.web.model.entities.BankTransactionRuleDao;
import Balio.web.model.entities.Category;
import Balio.web.model.entities.CategoryDao;
import Balio.web.model.entities.Transaction;
import Balio.web.model.entities.TransactionDao;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link BankServiceImpl}.
 * Validates connection flow, sync routing, rule lifecycle, and guard clauses.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("BankServiceImpl")
class BankServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID ACCOUNT_ID = UUID.randomUUID();
    private static final UUID RULE_ID = UUID.randomUUID();
    private static final UUID CATEGORY_ID = UUID.randomUUID();

    @Mock private AccountDao accountDao;
    @Mock private BankConnectionDao bankConnectionDao;
    @Mock private EnableBankingClient enableBankingClient;
    @Mock private EnableBankingSyncService enableBankingSyncService;
    @Mock private UserDao userDao;
    @Mock private CategoryDao categoryDao;
    @Mock private BankTransactionRuleDao ruleDao;
    @Mock private TransactionDao transactionDao;

    private BankServiceImpl service;
    private final ObjectMapper mapper = new ObjectMapper();

    private User user;
    private Account bankAccount;
    private Account cashAccount;
    private Category category;

    @BeforeEach
    void setUp() {
        service = new BankServiceImpl(
                accountDao, bankConnectionDao,
                enableBankingClient, enableBankingSyncService,
                userDao, categoryDao, ruleDao, transactionDao);

        user = new User("Test", "t@t.com", "pwd");
        setFieldViaReflection(user, "id", USER_ID);

        bankAccount = new Account("Bank", AccountType.BANK, "EUR", BigDecimal.ZERO, user);
        setFieldViaReflection(bankAccount, "id", ACCOUNT_ID);

        cashAccount = new Account("Cash", AccountType.CASH, "EUR", BigDecimal.ZERO, user);
        setFieldViaReflection(cashAccount, "id", UUID.randomUUID());

        category = new Category("Food", TransactionType.EXPENSE, user);
        setFieldViaReflection(category, "id", CATEGORY_ID);
    }

    /* ════════════════════════════════════════════════════════════
     *  initEnableBankingConnection
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("initEnableBankingConnection")
    class InitEnableBankingTests {

        @Test
        @DisplayName("returns authorization URL from Enable Banking for valid BANK account")
        void shouldReturnAuthUrl() throws InstanceNotFoundException {
            ObjectNode authResponse = mapper.createObjectNode();
            authResponse.put("url", "https://enablebanking.com/auth?state=" + ACCOUNT_ID);

            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(bankAccount));
            when(bankConnectionDao.existsByAccountId(ACCOUNT_ID)).thenReturn(false);
            when(enableBankingClient.startAuth("TestBank", "ES", ACCOUNT_ID.toString()))
                    .thenReturn(authResponse);

            String url = service.initEnableBankingConnection(USER_ID, ACCOUNT_ID, "TestBank", "ES");

            assertEquals("https://enablebanking.com/auth?state=" + ACCOUNT_ID, url);
        }

        @Test
        @DisplayName("throws AccountInvalidException for non-BANK account")
        void shouldThrow_whenNotBankAccount() {
            when(accountDao.findByIdAndUserId(any(), eq(USER_ID))).thenReturn(Optional.of(cashAccount));

            assertThrows(AccountInvalidException.class, () ->
                    service.initEnableBankingConnection(USER_ID, cashAccount.getId(), "Bank", "ES"));
        }

        @Test
        @DisplayName("throws AccountInvalidException when account already linked")
        void shouldThrow_whenAlreadyLinked() {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(bankAccount));
            when(bankConnectionDao.existsByAccountId(ACCOUNT_ID)).thenReturn(true);

            assertThrows(AccountInvalidException.class, () ->
                    service.initEnableBankingConnection(USER_ID, ACCOUNT_ID, "Bank", "ES"));
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  completeEnableBankingConnection
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("completeEnableBankingConnection")
    class CompleteEnableBankingTests {

        @Test
        @DisplayName("creates Enable Banking connection and triggers sync")
        void shouldCreateConnection() throws InstanceNotFoundException {
            ObjectNode session = mapper.createObjectNode();
            session.put("session_id", "sess-abc");
            ArrayNode accounts = session.putArray("accounts");
            ObjectNode acc = mapper.createObjectNode();
            acc.put("uid", "eb-acc-456");
            accounts.add(acc);

            when(accountDao.findById(ACCOUNT_ID)).thenReturn(Optional.of(bankAccount));
            when(bankConnectionDao.existsByAccountId(ACCOUNT_ID)).thenReturn(false);
            when(enableBankingClient.createSession("eb-code")).thenReturn(session);
            when(bankConnectionDao.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(enableBankingSyncService.sync(any(BankConnection.class), anyInt())).thenReturn(3);

            BankConnection result = service.completeEnableBankingConnection(ACCOUNT_ID.toString(), "eb-code");

            assertEquals("ENABLE_BANKING", result.getProvider());
            assertEquals("sess-abc", result.getSessionId());
            verify(enableBankingSyncService).sync(any(BankConnection.class), anyInt());
        }

        @Test
        @DisplayName("throws AccountInvalidException for malformed state")
        void shouldThrow_whenStateIsNotUuid() {
            assertThrows(AccountInvalidException.class, () ->
                    service.completeEnableBankingConnection("bad-state", "code"));
        }

        @Test
        @DisplayName("throws AccountInvalidException when already linked")
        void shouldThrow_whenAlreadyLinked() {
            when(accountDao.findById(ACCOUNT_ID)).thenReturn(Optional.of(bankAccount));
            when(bankConnectionDao.existsByAccountId(ACCOUNT_ID)).thenReturn(true);

            assertThrows(AccountInvalidException.class, () ->
                    service.completeEnableBankingConnection(ACCOUNT_ID.toString(), "code"));
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  syncTransactions
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("syncTransactions")
    class SyncTransactionsTests {

        @Test
        @DisplayName("delegates to Enable Banking sync service")
        void shouldUseEnableBankingSync() throws InstanceNotFoundException {
            BankConnection conn = new BankConnection(bankAccount, user, null, null, null);
            conn.setProvider("ENABLE_BANKING");
            when(bankConnectionDao.findByAccountIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(conn));
            when(enableBankingSyncService.sync(eq(conn), anyInt())).thenReturn(4);

            int result = service.syncTransactions(USER_ID, ACCOUNT_ID);

            assertEquals(4, result);
        }

        @Test
        @DisplayName("throws InstanceNotFoundException when connection does not exist")
        void shouldThrow_whenConnectionNotFound() {
            when(bankConnectionDao.findByAccountIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class, () ->
                    service.syncTransactions(USER_ID, ACCOUNT_ID));
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  syncStaleConnections
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("syncStaleConnections")
    class SyncStaleConnectionsTests {

        @Test
        @DisplayName("skips connections that were recently synced")
        void shouldSkip_freshConnections() {
            BankConnection fresh = new BankConnection(bankAccount, user, "tok", "ref", Instant.now().plusSeconds(3600));
            fresh.setLastSync(Instant.now()); // just synced
            when(bankConnectionDao.findAllByUserId(USER_ID)).thenReturn(List.of(fresh));

            int result = service.syncStaleConnections(USER_ID, 60);

            assertEquals(0, result);
            verify(enableBankingSyncService, never()).sync(any());
        }

        @Test
        @DisplayName("syncs connections with null lastSync")
        void shouldSync_nullLastSync() {
            BankConnection stale = new BankConnection(bankAccount, user, null, null, null);
            // lastSync is null by default
            when(bankConnectionDao.findAllByUserId(USER_ID)).thenReturn(List.of(stale));
            when(enableBankingSyncService.sync(eq(stale), anyInt())).thenReturn(2);

            int result = service.syncStaleConnections(USER_ID, 60);

            assertEquals(2, result);
        }

        @Test
        @DisplayName("syncs connections whose lastSync is older than the threshold")
        void shouldSync_staleConnections() {
            BankConnection stale = new BankConnection(bankAccount, user, null, null, null);
            Instant lastSync = Instant.now().minusSeconds(7200); // 2 hours ago
            stale.setLastSync(lastSync);
            when(bankConnectionDao.findAllByUserId(USER_ID)).thenReturn(List.of(stale));
            when(enableBankingSyncService.sync(stale, lastSync)).thenReturn(3);

            int result = service.syncStaleConnections(USER_ID, 60); // stale after 60 min

            assertEquals(3, result);
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  findLinkedConnections / getConnection
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("findLinkedConnections and getConnection")
    class ConnectionQueryTests {

        @Test
        @DisplayName("findLinkedConnections returns all connections for user")
        void shouldReturnAllConnections() {
            BankConnection conn = new BankConnection(bankAccount, user, "tok", "ref", Instant.now());
            when(bankConnectionDao.findAllByUserId(USER_ID)).thenReturn(List.of(conn));

            List<BankConnection> result = service.findLinkedConnections(USER_ID);

            assertEquals(1, result.size());
        }

        @Test
        @DisplayName("getConnection returns null when not linked")
        void shouldReturnNull_whenNotLinked() {
            when(bankConnectionDao.findByAccountIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.empty());

            BankConnection result = service.getConnection(USER_ID, ACCOUNT_ID);

            assertNull(result);
        }

        @Test
        @DisplayName("getConnection returns the connection when linked")
        void shouldReturnConnection_whenLinked() {
            BankConnection conn = new BankConnection(bankAccount, user, "tok", "ref", Instant.now());
            when(bankConnectionDao.findByAccountIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(conn));

            BankConnection result = service.getConnection(USER_ID, ACCOUNT_ID);

            assertEquals(conn, result);
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  unlinkAccount
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("unlinkAccount")
    class UnlinkAccountTests {

        @Test
        @DisplayName("deletes connection on successful unlink")
        void shouldDeleteConnection() throws InstanceNotFoundException {
            BankConnection conn = new BankConnection(bankAccount, user, "tok", "ref", Instant.now());
            when(bankConnectionDao.findByAccountIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(conn));

            service.unlinkAccount(USER_ID, ACCOUNT_ID);

            verify(bankConnectionDao).delete(conn);
        }

        @Test
        @DisplayName("throws InstanceNotFoundException when connection does not exist")
        void shouldThrow_whenNotFound() {
            when(bankConnectionDao.findByAccountIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class, () ->
                    service.unlinkAccount(USER_ID, ACCOUNT_ID));
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  createRule
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("createRule")
    class CreateRuleTests {

        @Test
        @DisplayName("creates rule with namePattern mapping to a name")
        void shouldCreateRule_withNamePattern() throws InstanceNotFoundException {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(bankAccount));
            when(ruleDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BankService.RuleCreationResult result = service.createRule(
                    USER_ID, ACCOUNT_ID, "Amazon", null, null, "Amazon Purchase", null, false, null);

            assertEquals("Amazon", result.rule().getNamePattern());
            assertEquals("Amazon Purchase", result.rule().getMappedName());
            assertEquals(0, result.appliedTransactions());
        }

        @Test
        @DisplayName("creates rule with bankCategory and applies to existing transactions")
        void shouldCreateAndApplyRule_withBankCategory() throws InstanceNotFoundException {
            Transaction tx = new Transaction("Supermarket", new BigDecimal("50"), LocalDate.now(), TransactionType.EXPENSE, user);
            tx.setAccount(bankAccount);
            tx.setBankCategory("GROCERIES");
            setFieldViaReflection(tx, "id", UUID.randomUUID());

            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(bankAccount));
            when(categoryDao.findByIdAndUserId(CATEGORY_ID, USER_ID)).thenReturn(Optional.of(category));
            when(ruleDao.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(ruleDao.findAllByUserIdAndAccountIdOrderByPriorityDesc(USER_ID, ACCOUNT_ID))
                    .thenReturn(List.of());
            when(transactionDao.findAllByUserIdAndAccountIdOrderByDateDesc(USER_ID, ACCOUNT_ID))
                    .thenReturn(List.of(tx));

            BankService.RuleCreationResult result = service.createRule(
                    USER_ID, ACCOUNT_ID, null, "GROCERIES", null, null, CATEGORY_ID, true, null);

            assertEquals("GROCERIES", result.rule().getBankCategory());
            verify(transactionDao).findAllByUserIdAndAccountIdOrderByDateDesc(USER_ID, ACCOUNT_ID);
        }

        @Test
        @DisplayName("throws UserNotFoundException when user does not exist")
        void shouldThrow_whenUserNotFound() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.empty());

            assertThrows(UserNotFoundException.class, () ->
                    service.createRule(USER_ID, ACCOUNT_ID, "pattern", null, null, "Name", null, false, null));
        }

        @Test
        @DisplayName("throws IllegalArgumentException for non-BANK account")
        void shouldThrow_whenNotBankAccount() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.findByIdAndUserId(any(), eq(USER_ID))).thenReturn(Optional.of(cashAccount));

            assertThrows(IllegalArgumentException.class, () ->
                    service.createRule(USER_ID, cashAccount.getId(), "pattern", null, null, "Name", null, false, null));
        }

        @Test
        @DisplayName("throws IllegalArgumentException when neither namePattern nor bankCategory is given")
        void shouldThrow_whenNoNamePatternOrBankCategory() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(bankAccount));

            assertThrows(IllegalArgumentException.class, () ->
                    service.createRule(USER_ID, ACCOUNT_ID, null, null, null, "MappedName", null, false, null));
        }

        @Test
        @DisplayName("throws IllegalArgumentException when neither mappedName nor mappedCategoryId is given")
        void shouldThrow_whenNoMappedNameOrCategory() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(bankAccount));

            assertThrows(IllegalArgumentException.class, () ->
                    service.createRule(USER_ID, ACCOUNT_ID, "pattern", null, null, null, null, false, null));
        }

        @Test
        @DisplayName("throws IllegalArgumentException when namePattern and bankCategory are both blank strings")
        void shouldThrow_whenPatternAndCategoryAreBlank() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(bankAccount));

            assertThrows(IllegalArgumentException.class, () ->
                    service.createRule(USER_ID, ACCOUNT_ID, "   ", "   ", null, "Name", null, false, null));
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  updateRule
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("updateRule")
    class UpdateRuleTests {

        private BankTransactionRule existingRule;

        @BeforeEach
        void buildRule() {
            existingRule = new BankTransactionRule(user, bankAccount,
                    "netflix", null, null, "Netflix", null, 500);
            setFieldViaReflection(existingRule, "id", RULE_ID);
        }

        @Test
        @DisplayName("updates name pattern and saves rule")
        void shouldUpdateNamePattern() throws InstanceNotFoundException {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(bankAccount));
            when(ruleDao.findByIdAndUserIdAndAccountId(RULE_ID, USER_ID, ACCOUNT_ID))
                    .thenReturn(Optional.of(existingRule));
            when(ruleDao.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BankService.RuleUpdateResult result = service.updateRule(
                    USER_ID, ACCOUNT_ID, RULE_ID, "Netflix Premium", null, null, null, null, false, null);

            assertEquals("Netflix Premium", result.rule().getNamePattern());
        }

        @Test
        @DisplayName("throws InstanceNotFoundException when rule does not exist")
        void shouldThrow_whenRuleNotFound() {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(bankAccount));
            when(ruleDao.findByIdAndUserIdAndAccountId(RULE_ID, USER_ID, ACCOUNT_ID))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class, () ->
                    service.updateRule(USER_ID, ACCOUNT_ID, RULE_ID, "New", null, null, null, null, false, null));
        }

        @Test
        @DisplayName("applies rule to existing transactions when applyToExisting is true")
        void shouldApplyToExisting_whenFlagSet() throws InstanceNotFoundException {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(bankAccount));
            when(ruleDao.findByIdAndUserIdAndAccountId(RULE_ID, USER_ID, ACCOUNT_ID))
                    .thenReturn(Optional.of(existingRule));
            when(ruleDao.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(ruleDao.findAllByUserIdAndAccountIdOrderByPriorityDesc(USER_ID, ACCOUNT_ID))
                    .thenReturn(List.of(existingRule));
            when(transactionDao.findAllByUserIdAndAccountIdOrderByDateDesc(USER_ID, ACCOUNT_ID))
                    .thenReturn(List.of());

            service.updateRule(USER_ID, ACCOUNT_ID, RULE_ID, null, null, null, null, null, true, null);

            verify(transactionDao).findAllByUserIdAndAccountIdOrderByDateDesc(USER_ID, ACCOUNT_ID);
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  deleteRule
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("deleteRule")
    class DeleteRuleTests {

        @Test
        @DisplayName("deletes rule when found")
        void shouldDeleteRule() throws InstanceNotFoundException {
            BankTransactionRule rule = new BankTransactionRule(user, bankAccount,
                    "pattern", null, null, "Name", null, 100);
            setFieldViaReflection(rule, "id", RULE_ID);

            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(bankAccount));
            when(ruleDao.findByIdAndUserIdAndAccountId(RULE_ID, USER_ID, ACCOUNT_ID))
                    .thenReturn(Optional.of(rule));

            service.deleteRule(USER_ID, ACCOUNT_ID, RULE_ID);

            verify(ruleDao).delete(rule);
        }

        @Test
        @DisplayName("throws InstanceNotFoundException when rule does not exist")
        void shouldThrow_whenNotFound() {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(bankAccount));
            when(ruleDao.findByIdAndUserIdAndAccountId(RULE_ID, USER_ID, ACCOUNT_ID))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class, () ->
                    service.deleteRule(USER_ID, ACCOUNT_ID, RULE_ID));
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  findAllRulesByUserIdAndAccountId
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("findAllRulesByUserIdAndAccountId")
    class FindAllRulesTests {

        @Test
        @DisplayName("returns rules ordered by priority descending")
        void shouldReturnRulesInOrder() throws InstanceNotFoundException {
            BankTransactionRule r1 = new BankTransactionRule(user, bankAccount, "amazon", "SHOPPING",
                    TransactionType.EXPENSE, "Amazon", null, 1250);
            BankTransactionRule r2 = new BankTransactionRule(user, bankAccount, null, "GROCERIES",
                    null, null, category, 1000);

            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(bankAccount));
            when(ruleDao.findAllByUserIdAndAccountIdOrderByPriorityDesc(USER_ID, ACCOUNT_ID))
                    .thenReturn(List.of(r1, r2));

            List<BankTransactionRule> result = service.findAllRulesByUserIdAndAccountId(USER_ID, ACCOUNT_ID);

            assertEquals(2, result.size());
            assertEquals("amazon", result.get(0).getNamePattern());
        }

        @Test
        @DisplayName("throws InstanceNotFoundException when account does not exist")
        void shouldThrow_whenAccountNotFound() {
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class, () ->
                    service.findAllRulesByUserIdAndAccountId(USER_ID, ACCOUNT_ID));
        }

        @Test
        @DisplayName("throws IllegalArgumentException when account is not BANK type")
        void shouldThrow_whenNotBankAccount() {
            when(accountDao.findByIdAndUserId(any(), eq(USER_ID))).thenReturn(Optional.of(cashAccount));

            assertThrows(IllegalArgumentException.class, () ->
                    service.findAllRulesByUserIdAndAccountId(USER_ID, cashAccount.getId()));
        }
    }

    /* ════════════════════════════════════════════════════════════
     *  Rule matching / applyToExisting logic
     * ════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("Rule application logic")
    class RuleApplicationTests {

        @Test
        @DisplayName("applyWindowDays limits rule application to recent transactions")
        void shouldRespectApplyWindowDays() throws InstanceNotFoundException {
            Transaction recentTx = new Transaction("Amazon", new BigDecimal("30"),
                    LocalDate.now().minusDays(5), TransactionType.EXPENSE, user);
            recentTx.setAccount(bankAccount);
            setFieldViaReflection(recentTx, "id", UUID.randomUUID());

            Transaction oldTx = new Transaction("Amazon old", new BigDecimal("50"),
                    LocalDate.now().minusDays(40), TransactionType.EXPENSE, user);
            oldTx.setAccount(bankAccount);
            setFieldViaReflection(oldTx, "id", UUID.randomUUID());

            BankTransactionRule rule = new BankTransactionRule(user, bankAccount,
                    "Amazon", null, null, "Amazon Mapped", null, 500);

            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(bankAccount));
            when(ruleDao.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(ruleDao.findAllByUserIdAndAccountIdOrderByPriorityDesc(USER_ID, ACCOUNT_ID))
                    .thenReturn(List.of(rule));
            when(transactionDao.findAllByUserIdAndAccountIdOrderByDateDesc(USER_ID, ACCOUNT_ID))
                    .thenReturn(List.of(recentTx, oldTx));

            // Apply window of 30 days — only recentTx should be updated
            BankService.RuleCreationResult result = service.createRule(
                    USER_ID, ACCOUNT_ID, "Amazon", null, null, "Amazon Mapped", null, true, 30);

            assertEquals(1, result.appliedTransactions());
            assertEquals("Amazon Mapped", recentTx.getName()); // changed
            assertEquals("Amazon old", oldTx.getName()); // unchanged
        }

        @Test
        @DisplayName("rule with null transactionType matches both INCOME and EXPENSE")
        void shouldMatchBothTypes_whenTransactionTypeIsNull() throws InstanceNotFoundException {
            Transaction expense = new Transaction("Netflix", new BigDecimal("15"),
                    LocalDate.now(), TransactionType.EXPENSE, user);
            expense.setAccount(bankAccount);
            setFieldViaReflection(expense, "id", UUID.randomUUID());

            Transaction income = new Transaction("Netflix refund", new BigDecimal("15"),
                    LocalDate.now(), TransactionType.INCOME, user);
            income.setAccount(bankAccount);
            setFieldViaReflection(income, "id", UUID.randomUUID());

            BankTransactionRule rule = new BankTransactionRule(user, bankAccount,
                    "Netflix", null, null /* null type = any */, "Netflix", null, 500);

            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(bankAccount));
            when(ruleDao.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(ruleDao.findAllByUserIdAndAccountIdOrderByPriorityDesc(USER_ID, ACCOUNT_ID))
                    .thenReturn(List.of(rule));
            when(transactionDao.findAllByUserIdAndAccountIdOrderByDateDesc(USER_ID, ACCOUNT_ID))
                    .thenReturn(List.of(expense, income));

            BankService.RuleCreationResult result = service.createRule(
                    USER_ID, ACCOUNT_ID, "Netflix", null, null, "Netflix", null, true, null);

            assertEquals(1, result.appliedTransactions()); // only "Netflix refund" is renamed
            assertEquals("Netflix", expense.getName());
            assertEquals("Netflix", income.getName());
        }

            @Test
            @DisplayName("applies mapped category from another matching rule when first one only renames")
            void shouldApplyCategoryWhenFirstMatchOnlyRenames() throws InstanceNotFoundException {
                Transaction tx = new Transaction("Ella Nieminen", new BigDecimal("42"),
                    LocalDate.now(), TransactionType.EXPENSE, user);
                tx.setAccount(bankAccount);
                setFieldViaReflection(tx, "id", UUID.randomUUID());

                BankTransactionRule renameOnly = new BankTransactionRule(
                    user, bankAccount, "Ella Nieminen", null,
                    TransactionType.EXPENSE, "Ella Nieminen", null, 800);
                BankTransactionRule categoryOnly = new BankTransactionRule(
                    user, bankAccount, "Ella Nieminen", null,
                    TransactionType.EXPENSE, null, category, 700);

                when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
                when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(bankAccount));
                when(categoryDao.findByIdAndUserId(CATEGORY_ID, USER_ID)).thenReturn(Optional.of(category));
                when(ruleDao.save(any())).thenAnswer(inv -> inv.getArgument(0));
                when(ruleDao.findAllByUserIdAndAccountIdOrderByPriorityDesc(USER_ID, ACCOUNT_ID))
                    .thenReturn(List.of(renameOnly, categoryOnly));
                when(transactionDao.findAllByUserIdAndAccountIdOrderByDateDesc(USER_ID, ACCOUNT_ID))
                    .thenReturn(List.of(tx));

                BankService.RuleCreationResult result = service.createRule(
                    USER_ID, ACCOUNT_ID, "Ella Nieminen", null, TransactionType.EXPENSE,
                    "Ella Nieminen", CATEGORY_ID, true, null);

                assertEquals(1, result.appliedTransactions());
                assertEquals(category, tx.getCategory());
            }

                @Test
                @DisplayName("does not assign EXPENSE category to INCOME transactions when reapplying")
                void shouldNotAssignMismatchedCategoryType() throws InstanceNotFoundException {
                    Transaction tx = new Transaction("Onni Virtanen", new BigDecimal("8.95"),
                        LocalDate.now(), TransactionType.INCOME, user);
                    tx.setAccount(bankAccount);
                    setFieldViaReflection(tx, "id", UUID.randomUUID());

                    BankTransactionRule mismatchedCategoryRule = new BankTransactionRule(
                        user, bankAccount, "Onni", null,
                        null, null, category, 900); // 'category' is EXPENSE

                    when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
                    when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(bankAccount));
                        when(categoryDao.findByIdAndUserId(CATEGORY_ID, USER_ID)).thenReturn(Optional.of(category));
                    when(ruleDao.save(any())).thenAnswer(inv -> inv.getArgument(0));
                    when(ruleDao.findAllByUserIdAndAccountIdOrderByPriorityDesc(USER_ID, ACCOUNT_ID))
                        .thenReturn(List.of(mismatchedCategoryRule));
                    when(transactionDao.findAllByUserIdAndAccountIdOrderByDateDesc(USER_ID, ACCOUNT_ID))
                        .thenReturn(List.of(tx));

                    BankService.RuleCreationResult result = service.createRule(
                        USER_ID, ACCOUNT_ID, "Onni", null, null,
                        null, CATEGORY_ID, true, null);

                    assertEquals(0, result.appliedTransactions());
                    assertNull(tx.getCategory());
                }

                @Test
                @DisplayName("clears legacy invalid category when transaction type mismatches")
                void shouldClearLegacyInvalidCategory() throws InstanceNotFoundException {
                    Transaction tx = new Transaction("Onni Nieminen", new BigDecimal("2.40"),
                        LocalDate.now(), TransactionType.INCOME, user);
                    tx.setAccount(bankAccount);
                    tx.setCategory(category); // legacy wrong state: EXPENSE category on INCOME transaction
                    setFieldViaReflection(tx, "id", UUID.randomUUID());

                    BankTransactionRule noCategoryRule = new BankTransactionRule(
                        user, bankAccount, "Onni", null,
                        null, "Onni Nieminen", null, 500);

                    when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
                    when(accountDao.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(bankAccount));
                    when(ruleDao.save(any())).thenAnswer(inv -> inv.getArgument(0));
                    when(ruleDao.findAllByUserIdAndAccountIdOrderByPriorityDesc(USER_ID, ACCOUNT_ID))
                        .thenReturn(List.of(noCategoryRule));
                    when(transactionDao.findAllByUserIdAndAccountIdOrderByDateDesc(USER_ID, ACCOUNT_ID))
                        .thenReturn(List.of(tx));

                    BankService.RuleCreationResult result = service.createRule(
                        USER_ID, ACCOUNT_ID, "Onni", null, null,
                        "Onni Nieminen", null, true, null);

                    assertEquals(1, result.appliedTransactions());
                    assertNull(tx.getCategory());
                }
    }

    /* ─── helpers ─────────────────────────────────────────────── */

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
