package Balio.web.model;

import Balio.web.enums.AccountType;
import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.FilterInvalidException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.AccountDao;
import Balio.web.model.entities.Filter;
import Balio.web.model.entities.FilterDao;
import Balio.web.model.entities.Transaction;
import Balio.web.model.entities.TransactionDao;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;
import Balio.web.model.services.FilterService;

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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests for {@link FilterService} with a real H2 database.
 *
 * Key scenarios tested end-to-end (Java + H2):
 * - CRUD persistence of Filter entities (including JSON definition stored as string)
 * - {@code applyFilter} — parses JSON definition and delegates to TransactionDao.findFiltered
 *
 * {@code @Transactional} ensures each test rolls back after completion.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DisplayName("FilterService — Integration Tests")
class FilterServiceImplIT {

    @Autowired FilterService filterService;
    @Autowired FilterDao filterDao;
    @Autowired UserDao userDao;
    @Autowired AccountDao accountDao;
    @Autowired TransactionDao transactionDao;

    private User user;
    private Account account;

    @BeforeEach
    void setUp() {
        user = userDao.save(new User("Tester", unique("filter"), "hashed-pwd"));
        account = accountDao.save(
                new Account("Wallet", AccountType.CASH, "EUR", BigDecimal.ZERO, user));

        // Seed some transactions
        persist(expense("Grocery",   new BigDecimal("50"),   LocalDate.of(2024, 1, 10), account));
        persist(expense("Transport", new BigDecimal("20"),   LocalDate.of(2024, 1, 20), account));
        persist(income("Salary",     new BigDecimal("2000"), LocalDate.of(2024, 2, 1),  account));
        persist(income("Bonus",      new BigDecimal("500"),  LocalDate.of(2024, 3, 1),  null));
    }

    // ═══════════════════════════════════════════════════════════════════
    //  createFilter
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("createFilter")
    class CreateFilter {

        @Test
        @DisplayName("persists filter in DB with correct name and definition")
        void persists() {
            String def = "{\"type\":\"EXPENSE\"}";
            Filter created = filterService.createFilter(user.getId(), "My Filter", def);

            assertThat(created.getId()).isNotNull();
            assertThat(created.getName()).isEqualTo("My Filter");
            assertThat(created.getDefinition()).isEqualTo(def);
            assertThat(filterDao.findById(created.getId())).isPresent();
        }

        @Test
        @DisplayName("persists definition with all known fields")
        void allFields() {
            String def = String.format(
                    "{\"type\":\"EXPENSE\",\"accountId\":\"%s\",\"startDate\":\"2024-01-01\",\"endDate\":\"2024-12-31\"}",
                    account.getId());

            Filter created = filterService.createFilter(user.getId(), "Complex", def);

            assertThat(filterDao.findById(created.getId()).orElseThrow().getDefinition())
                    .isEqualTo(def);
        }

        @Test
        @DisplayName("throws UserNotFoundException for non-existent user")
        void unknownUser() {
            assertThatThrownBy(() ->
                    filterService.createFilter(UUID.randomUUID(), "F", "{\"type\":\"EXPENSE\"}"))
                    .isInstanceOf(UserNotFoundException.class);
        }

        @Test
        @DisplayName("throws FilterInvalidException for invalid JSON")
        void invalidJson() {
            assertThatThrownBy(() ->
                    filterService.createFilter(user.getId(), "Bad", "not-json"))
                    .isInstanceOf(FilterInvalidException.class);
        }

        @Test
        @DisplayName("throws FilterInvalidException for unknown JSON field")
        void unknownField() {
            assertThatThrownBy(() ->
                    filterService.createFilter(user.getId(), "Bad", "{\"foo\":\"bar\"}"))
                    .isInstanceOf(FilterInvalidException.class);
        }

        @Test
        @DisplayName("throws FilterInvalidException for invalid date format")
        void invalidDate() {
            assertThatThrownBy(() ->
                    filterService.createFilter(user.getId(), "Bad", "{\"startDate\":\"2024/01/01\"}"))
                    .isInstanceOf(FilterInvalidException.class);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  deleteFilter / modifyFilter
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("deleteFilter + modifyFilter")
    class CrudOps {

        @Test
        @DisplayName("deleteFilter removes from DB")
        void deleteRemoves() throws InstanceNotFoundException {
            Filter f = filterService.createFilter(user.getId(), "Temp", "{}");
            UUID fId = f.getId();

            filterService.deleteFilter(user.getId(), fId);

            assertThat(filterDao.findById(fId)).isEmpty();
        }

        @Test
        @DisplayName("modifyFilter updates name and definition in DB")
        void modifyUpdates() throws InstanceNotFoundException {
            Filter f = filterService.createFilter(user.getId(), "Old", "{\"type\":\"EXPENSE\"}");

            filterService.modifyFilter(user.getId(), f.getId(), "New", "{\"type\":\"INCOME\"}");

            Filter fetched = filterDao.findById(f.getId()).orElseThrow();
            assertThat(fetched.getName()).isEqualTo("New");
            assertThat(fetched.getDefinition()).isEqualTo("{\"type\":\"INCOME\"}");
        }

        @Test
        @DisplayName("deleteFilter throws for wrong user")
        void wrongUser() {
            Filter f = filterService.createFilter(user.getId(), "Mine", "{}");
            User other = userDao.save(new User("Other", unique("del2"), "hash"));

            assertThatThrownBy(() -> filterService.deleteFilter(other.getId(), f.getId()))
                    .isInstanceOf(InstanceNotFoundException.class);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  applyFilter — the core integration test
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("applyFilter — JSON → TransactionDao.findFiltered")
    class ApplyFilter {

        @Test
        @DisplayName("type=EXPENSE → returns only expense transactions")
        void byTypeExpense() throws InstanceNotFoundException {
            Filter f = filterService.createFilter(user.getId(), "Expenses", "{\"type\":\"EXPENSE\"}");

            List<Transaction> result = filterService.applyFilter(user.getId(), f.getId());

            assertThat(result).hasSize(2)
                    .allMatch(t -> t.getType() == TransactionType.EXPENSE);
        }

        @Test
        @DisplayName("type=INCOME → returns only income transactions")
        void byTypeIncome() throws InstanceNotFoundException {
            Filter f = filterService.createFilter(user.getId(), "Incomes", "{\"type\":\"INCOME\"}");

            List<Transaction> result = filterService.applyFilter(user.getId(), f.getId());

            assertThat(result).hasSize(2)
                    .allMatch(t -> t.getType() == TransactionType.INCOME);
        }

        @Test
        @DisplayName("accountId filter → returns only transactions for that account")
        void byAccountId() throws InstanceNotFoundException {
            String def = String.format("{\"accountId\":\"%s\"}", account.getId());
            Filter f = filterService.createFilter(user.getId(), "ByAccount", def);

            List<Transaction> result = filterService.applyFilter(user.getId(), f.getId());

            // 3 transactions have account set (Grocery, Transport, Salary), Bonus has null account
            assertThat(result).hasSize(3)
                    .allMatch(t -> t.getAccount() != null
                            && t.getAccount().getId().equals(account.getId()));
        }

        @Test
        @DisplayName("startDate + endDate → returns only transactions in range")
        void byDateRange() throws InstanceNotFoundException {
            String def = "{\"startDate\":\"2024-01-01\",\"endDate\":\"2024-01-31\"}";
            Filter f = filterService.createFilter(user.getId(), "January", def);

            List<Transaction> result = filterService.applyFilter(user.getId(), f.getId());

            // Only Grocery (Jan 10) and Transport (Jan 20) fall in January 2024
            assertThat(result).hasSize(2)
                    .allMatch(t -> !t.getDate().isBefore(LocalDate.of(2024, 1, 1))
                            && !t.getDate().isAfter(LocalDate.of(2024, 1, 31)));
        }

        @Test
        @DisplayName("empty definition {} → returns all user transactions")
        void emptyDefinition() throws InstanceNotFoundException {
            Filter f = filterService.createFilter(user.getId(), "All", "{}");

            List<Transaction> result = filterService.applyFilter(user.getId(), f.getId());

            assertThat(result).hasSize(4);
        }

        @Test
        @DisplayName("type + dateRange combined → returns matching subset")
        void typeAndDateRange() throws InstanceNotFoundException {
            String def = "{\"type\":\"EXPENSE\",\"startDate\":\"2024-01-15\",\"endDate\":\"2024-01-31\"}";
            Filter f = filterService.createFilter(user.getId(), "ExpensesLateJan", def);

            List<Transaction> result = filterService.applyFilter(user.getId(), f.getId());

            // Only "Transport" (EXPENSE, Jan 20) matches
            assertThat(result).hasSize(1)
                    .allMatch(t -> t.getName().equals("Transport"));
        }

        @Test
        @DisplayName("throws InstanceNotFoundException for non-existent filter")
        void notFound() {
            assertThatThrownBy(() ->
                    filterService.applyFilter(user.getId(), UUID.randomUUID()))
                    .isInstanceOf(InstanceNotFoundException.class);
        }

        @Test
        @DisplayName("throws InstanceNotFoundException when filter belongs to another user")
        void wrongUser() throws InstanceNotFoundException {
            Filter f = filterService.createFilter(user.getId(), "Mine", "{}");
            User other = userDao.save(new User("Other", unique("app"), "hash"));

            assertThatThrownBy(() -> filterService.applyFilter(other.getId(), f.getId()))
                    .isInstanceOf(InstanceNotFoundException.class);
        }
    }

    // ── helpers ──────────────────────────────────────────────────────

    private Transaction expense(String name, BigDecimal amount, LocalDate date, Account acc) {
        Transaction t = new Transaction(name, amount, date, TransactionType.EXPENSE, user);
        t.setAccount(acc);
        return t;
    }

    private Transaction income(String name, BigDecimal amount, LocalDate date, Account acc) {
        Transaction t = new Transaction(name, amount, date, TransactionType.INCOME, user);
        t.setAccount(acc);
        return t;
    }

    private void persist(Transaction t) {
        transactionDao.save(t);
    }

    private static String unique(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@test.com";
    }
}
