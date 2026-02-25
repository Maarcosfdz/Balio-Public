package Balio.web.model;

import Balio.web.enums.AccountType;
import Balio.web.enums.TransactionType;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.AccountDao;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for the complex {@code findFiltered} JPQL query in TransactionDao.
 *
 * These tests run against H2 in PostgreSQL compatibility mode and verify that
 * each optional filter parameter works correctly in isolation and in combination.
 * Unit tests with Mockito cannot exercise the actual query logic.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DisplayName("TransactionDao.findFiltered — Integration Tests")
class TransactionDaoIT {

    @Autowired UserDao userDao;
    @Autowired AccountDao accountDao;
    @Autowired CategoryDao categoryDao;
    @Autowired TransactionDao transactionDao;

    private User user;
    private User otherUser;
    private Account account1;
    private Account account2;
    private Category expenseCategory;

    // reference dates
    private static final LocalDate JAN_01 = LocalDate.of(2024, 1, 1);
    private static final LocalDate JAN_15 = LocalDate.of(2024, 1, 15);
    private static final LocalDate JAN_31 = LocalDate.of(2024, 1, 31);
    private static final LocalDate FEB_01 = LocalDate.of(2024, 2, 1);

    @BeforeEach
    void setUp() {
        user = userDao.save(new User("TestUser", unique("user1"), "hash"));
        otherUser = userDao.save(new User("Other", unique("user2"), "hash"));

        account1 = accountDao.save(
                new Account("Wallet", AccountType.CASH, "EUR", BigDecimal.ZERO, user));
        account2 = accountDao.save(
                new Account("Bank", AccountType.BANK, "EUR", BigDecimal.ZERO, user));

        expenseCategory = categoryDao.save(
                new Category("Food", TransactionType.EXPENSE, user));

        // ── Transactions for `user` ─────────────────────────────────────
        // expense / account1 / Jan 1
        save(tx("Grocery", new BigDecimal("50"), JAN_01,  TransactionType.EXPENSE, account1, expenseCategory));
        // expense / account2 / Jan 15
        save(tx("Rent",    new BigDecimal("800"), JAN_15, TransactionType.EXPENSE, account2, null));
        // income  / account1 / Jan 31
        save(tx("Salary",  new BigDecimal("2000"), JAN_31, TransactionType.INCOME, account1, null));
        // income  / null      / Feb 1
        save(tx("Gift",    new BigDecimal("100"), FEB_01, TransactionType.INCOME, null, null));

        // ── Transactions for `otherUser` (should never be returned) ──────
        save(txForUser("OtherTx", new BigDecimal("999"), JAN_15, TransactionType.EXPENSE, otherUser));
    }

    // ═══════════════════════════════════════════════════════════════════
    //  No parameters
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("No filter params")
    class NoParams {

        @Test
        @DisplayName("returns all transactions for the user")
        void returnsAll() {
            List<Transaction> result = transactionDao.findFiltered(
                    user.getId(), null, null, null, null, null);
            assertThat(result).hasSize(4);
        }

        @Test
        @DisplayName("never returns transactions from another user")
        void neverReturnsOtherUsers() {
            List<Transaction> result = transactionDao.findFiltered(
                    user.getId(), null, null, null, null, null);
            assertThat(result).noneMatch(t -> t.getUser().getId().equals(otherUser.getId()));
        }

        @Test
        @DisplayName("results are ordered by date descending")
        void orderedByDateDesc() {
            List<Transaction> result = transactionDao.findFiltered(
                    user.getId(), null, null, null, null, null);
            // Feb 1 → Jan 31 → Jan 15 → Jan 1
            assertThat(result.get(0).getDate()).isEqualTo(FEB_01);
            assertThat(result.get(result.size() - 1).getDate()).isEqualTo(JAN_01);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Filter by type
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Filter by type")
    class ByType {

        @Test
        @DisplayName("EXPENSE returns only expenses")
        void expense() {
            List<Transaction> result = transactionDao.findFiltered(
                    user.getId(), TransactionType.EXPENSE, null, null, null, null);
            assertThat(result).hasSize(2)
                    .allMatch(t -> t.getType() == TransactionType.EXPENSE);
        }

        @Test
        @DisplayName("INCOME returns only incomes")
        void income() {
            List<Transaction> result = transactionDao.findFiltered(
                    user.getId(), TransactionType.INCOME, null, null, null, null);
            assertThat(result).hasSize(2)
                    .allMatch(t -> t.getType() == TransactionType.INCOME);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Filter by accountId
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Filter by accountId")
    class ByAccount {

        @Test
        @DisplayName("account1 returns only account1 transactions")
        void account1Only() {
            List<Transaction> result = transactionDao.findFiltered(
                    user.getId(), null, account1.getId(), null, null, null);
            assertThat(result).hasSize(2)
                    .allMatch(t -> t.getAccount() != null
                            && t.getAccount().getId().equals(account1.getId()));
        }

        @Test
        @DisplayName("account2 returns only account2 transactions")
        void account2Only() {
            List<Transaction> result = transactionDao.findFiltered(
                    user.getId(), null, account2.getId(), null, null, null);
            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("unknown accountId returns empty list")
        void unknownAccount() {
            List<Transaction> result = transactionDao.findFiltered(
                    user.getId(), null, UUID.randomUUID(), null, null, null);
            assertThat(result).isEmpty();
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Filter by categoryId
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Filter by categoryId")
    class ByCategory {

        @Test
        @DisplayName("expenseCategory returns only that category's transactions")
        void byExpenseCategory() {
            List<Transaction> result = transactionDao.findFiltered(
                    user.getId(), null, null, expenseCategory.getId(), null, null);
            assertThat(result).hasSize(1)
                    .allMatch(t -> t.getCategory() != null
                            && t.getCategory().getId().equals(expenseCategory.getId()));
        }

        @Test
        @DisplayName("unknown categoryId returns empty list")
        void unknownCategory() {
            List<Transaction> result = transactionDao.findFiltered(
                    user.getId(), null, null, UUID.randomUUID(), null, null);
            assertThat(result).isEmpty();
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Filter by date range
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Filter by date range")
    class ByDate {

        @Test
        @DisplayName("startDate only → returns transactions on and after that date")
        void startDateOnly() {
            List<Transaction> result = transactionDao.findFiltered(
                    user.getId(), null, null, null, JAN_15, null);
            assertThat(result).hasSize(3)
                    .allMatch(t -> !t.getDate().isBefore(JAN_15));
        }

        @Test
        @DisplayName("endDate only → returns transactions on and before that date")
        void endDateOnly() {
            List<Transaction> result = transactionDao.findFiltered(
                    user.getId(), null, null, null, null, JAN_15);
            assertThat(result).hasSize(2)
                    .allMatch(t -> !t.getDate().isAfter(JAN_15));
        }

        @Test
        @DisplayName("startDate + endDate → returns transactions within the range (inclusive)")
        void dateRange() {
            List<Transaction> result = transactionDao.findFiltered(
                    user.getId(), null, null, null, JAN_15, JAN_31);
            assertThat(result).hasSize(2)
                    .allMatch(t -> !t.getDate().isBefore(JAN_15) && !t.getDate().isAfter(JAN_31));
        }

        @Test
        @DisplayName("start == end → returns only transactions on that exact day")
        void exactDate() {
            List<Transaction> result = transactionDao.findFiltered(
                    user.getId(), null, null, null, JAN_15, JAN_15);
            assertThat(result).hasSize(1)
                    .allMatch(t -> t.getDate().equals(JAN_15));
        }

        @Test
        @DisplayName("range with no matches → empty list")
        void noMatches() {
            LocalDate farFuture = LocalDate.of(2099, 1, 1);
            List<Transaction> result = transactionDao.findFiltered(
                    user.getId(), null, null, null, farFuture, farFuture);
            assertThat(result).isEmpty();
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Combined filters
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Combined filters")
    class CombinedFilters {

        @Test
        @DisplayName("type + accountId → only matching transactions")
        void typeAndAccount() {
            List<Transaction> result = transactionDao.findFiltered(
                    user.getId(), TransactionType.EXPENSE, account1.getId(), null, null, null);
            // Only "Grocery" matches (EXPENSE + account1)
            assertThat(result).hasSize(1)
                    .allMatch(t -> t.getType() == TransactionType.EXPENSE
                            && t.getAccount().getId().equals(account1.getId()));
        }

        @Test
        @DisplayName("type + startDate → only matching transactions")
        void typeAndDate() {
            List<Transaction> result = transactionDao.findFiltered(
                    user.getId(), TransactionType.INCOME, null, null, JAN_31, null);
            assertThat(result).hasSize(2)
                    .allMatch(t -> t.getType() == TransactionType.INCOME
                            && !t.getDate().isBefore(JAN_31));
        }
    }

    // ── helpers ──────────────────────────────────────────────────────

    private Transaction tx(String name, BigDecimal amount, LocalDate date,
                           TransactionType type, Account account, Category category) {
        Transaction t = new Transaction(name, amount, date, type, user);
        t.setAccount(account);
        t.setCategory(category);
        return t;
    }

    private Transaction txForUser(String name, BigDecimal amount, LocalDate date,
                                  TransactionType type, User txUser) {
        return new Transaction(name, amount, date, type, txUser);
    }

    private void save(Transaction t) {
        transactionDao.save(t);
    }

    private static String unique(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@test.com";
    }
}
