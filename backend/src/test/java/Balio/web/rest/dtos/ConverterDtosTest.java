package Balio.web.rest.dtos;

import Balio.web.enums.AccountType;
import Balio.web.enums.BudgetPeriodicity;
import Balio.web.enums.TransactionType;
import Balio.web.enums.WidgetChartType;
import Balio.web.enums.WidgetType;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.BankConnection;
import Balio.web.model.entities.BankTransactionRule;
import Balio.web.model.entities.Budget;
import Balio.web.model.entities.BudgetCategory;
import Balio.web.model.entities.Category;
import Balio.web.model.entities.ChartWidget;
import Balio.web.model.entities.ScheduledTransaction;
import Balio.web.model.entities.Transaction;
import Balio.web.model.entities.User;
import Balio.web.model.services.BudgetService;
import Balio.web.model.services.ScheduledTransactionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for DTO getter/setter round-trips and converter mapping logic.
 * Covers: BudgetCategoryResponseDto (and nested), BankRuleResponseDto,
 * ChartWidgetResponseDto, BankSyncResultDto, AuthenticatedUserDto,
 * CsvImportResultDto, ScheduledTransactionUpdateDto,
 * ChartWidgetConverter, BankConverter, ScheduledTransactionConverter,
 * BudgetConverter.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Converter and DTO tests")
class ConverterDtosTest {

    private static void setId(Object target, UUID id) {
        try {
            java.lang.reflect.Field f = target.getClass().getDeclaredField("id");
            f.setAccessible(true);
            f.set(target, id);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }

    // ── BudgetCategoryResponseDto ─────────────────────────────────────────

    @Nested
    @DisplayName("BudgetCategoryResponseDto")
    class BudgetCategoryResponseDtoTests {

        @Test
        @DisplayName("getter/setter round-trip for main fields")
        void shouldRoundTripMainFields() {
            BudgetCategoryResponseDto dto = new BudgetCategoryResponseDto();
            String id = UUID.randomUUID().toString();
            BigDecimal max = new BigDecimal("500.00");
            BigDecimal spent = new BigDecimal("150.00");
            BigDecimal remaining = new BigDecimal("350.00");

            dto.setId(id);
            dto.setName("Food");
            dto.setMaxAmount(max);
            dto.setDisplayOrder(3);
            dto.setSpent(spent);
            dto.setRemaining(remaining);
            dto.setUsagePercent(30.0);
            dto.setLinkedCategories(List.of());
            dto.setTransactions(List.of());

            assertEquals(id, dto.getId());
            assertEquals("Food", dto.getName());
            assertEquals(max, dto.getMaxAmount());
            assertEquals(3, dto.getDisplayOrder());
            assertEquals(spent, dto.getSpent());
            assertEquals(remaining, dto.getRemaining());
            assertEquals(30.0, dto.getUsagePercent());
            assertNotNull(dto.getLinkedCategories());
            assertNotNull(dto.getTransactions());
        }

        @Test
        @DisplayName("LinkedCategoryDto getter/setter round-trip")
        void shouldRoundTripLinkedCategoryDto() {
            BudgetCategoryResponseDto.LinkedCategoryDto lc =
                    new BudgetCategoryResponseDto.LinkedCategoryDto();
            String id = UUID.randomUUID().toString();

            lc.setId(id);
            lc.setName("Groceries");

            assertEquals(id, lc.getId());
            assertEquals("Groceries", lc.getName());
        }

        @Test
        @DisplayName("TransactionSummaryDto getter/setter round-trip")
        void shouldRoundTripTransactionSummaryDto() {
            BudgetCategoryResponseDto.TransactionSummaryDto tx =
                    new BudgetCategoryResponseDto.TransactionSummaryDto();
            String id = UUID.randomUUID().toString();
            BigDecimal amount = new BigDecimal("25.00");

            tx.setId(id);
            tx.setName("Supermarket");
            tx.setAmount(amount);
            tx.setDate("2026-03-01");
            tx.setCategoryName("Food");
            tx.setManual(true);

            assertEquals(id, tx.getId());
            assertEquals("Supermarket", tx.getName());
            assertEquals(amount, tx.getAmount());
            assertEquals("2026-03-01", tx.getDate());
            assertEquals("Food", tx.getCategoryName());
            assertTrue(tx.isManual());
        }
    }

    // ── BankRuleResponseDto ────────────────────────────────────────────────

    @Nested
    @DisplayName("BankRuleResponseDto")
    class BankRuleResponseDtoTests {

        @Test
        @DisplayName("getter/setter round-trip for all fields")
        void shouldRoundTripAllFields() {
            BankRuleResponseDto dto = new BankRuleResponseDto();
            String id = UUID.randomUUID().toString();
            String accountId = UUID.randomUUID().toString();
            String catId = UUID.randomUUID().toString();

            dto.setId(id);
            dto.setAccountId(accountId);
            dto.setAccountName("My Bank");
            dto.setNamePattern("AMAZON");
            dto.setBankCategory("Shopping");
            dto.setTransactionType(TransactionType.EXPENSE);
            dto.setMappedName("Amazon Purchase");
            dto.setMappedCategoryId(catId);
            dto.setMappedCategoryName("Online Shopping");
            dto.setPriority(5);
            dto.setAppliedTransactions(12);

            assertEquals(id, dto.getId());
            assertEquals(accountId, dto.getAccountId());
            assertEquals("My Bank", dto.getAccountName());
            assertEquals("AMAZON", dto.getNamePattern());
            assertEquals("Shopping", dto.getBankCategory());
            assertEquals(TransactionType.EXPENSE, dto.getTransactionType());
            assertEquals("Amazon Purchase", dto.getMappedName());
            assertEquals(catId, dto.getMappedCategoryId());
            assertEquals("Online Shopping", dto.getMappedCategoryName());
            assertEquals(5, dto.getPriority());
            assertEquals(12, dto.getAppliedTransactions());
        }
    }

    // ── ChartWidgetResponseDto ─────────────────────────────────────────────

    @Nested
    @DisplayName("ChartWidgetResponseDto")
    class ChartWidgetResponseDtoTests {

        @Test
        @DisplayName("getter/setter round-trip for all fields")
        void shouldRoundTripAllFields() {
            ChartWidgetResponseDto dto = new ChartWidgetResponseDto();
            String id = UUID.randomUUID().toString();

            dto.setId(id);
            dto.setName("Revenue Chart");
            dto.setWidgetType("CHART");
            dto.setChartType("BAR");
            dto.setConfiguration("{\"filter\":{}}");
            dto.setPinned(true);
            dto.setVisible(false);
            dto.setDisplayOrder(2);
            dto.setLayoutSize("LG");

            assertEquals(id, dto.getId());
            assertEquals("Revenue Chart", dto.getName());
            assertEquals("CHART", dto.getWidgetType());
            assertEquals("BAR", dto.getChartType());
            assertEquals("{\"filter\":{}}", dto.getConfiguration());
            assertTrue(dto.isPinned());
            assertFalse(dto.isVisible());
            assertEquals(2, dto.getDisplayOrder());
            assertEquals("LG", dto.getLayoutSize());
        }
    }

    // ── BankSyncResultDto ─────────────────────────────────────────────────

    @Nested
    @DisplayName("BankSyncResultDto")
    class BankSyncResultDtoTests {

        @Test
        @DisplayName("no-arg constructor initializes to zero")
        void shouldInitializeToZero() {
            BankSyncResultDto dto = new BankSyncResultDto();
            assertEquals(0, dto.getImported());
            assertEquals(0, dto.getSyncedAccounts());
        }

        @Test
        @DisplayName("single-arg constructor: syncedAccounts=1 when imported>0")
        void shouldSetSyncedAccountsOneWhenImportedPositive() {
            BankSyncResultDto dto = new BankSyncResultDto(5);
            assertEquals(5, dto.getImported());
            assertEquals(1, dto.getSyncedAccounts());
        }

        @Test
        @DisplayName("single-arg constructor: syncedAccounts=0 when imported=0")
        void shouldSetSyncedAccountsZeroWhenImportedZero() {
            BankSyncResultDto dto = new BankSyncResultDto(0);
            assertEquals(0, dto.getImported());
            assertEquals(0, dto.getSyncedAccounts());
        }

        @Test
        @DisplayName("two-arg constructor sets fields independently")
        void shouldSetBothFieldsIndependently() {
            BankSyncResultDto dto = new BankSyncResultDto(10, 3);
            assertEquals(10, dto.getImported());
            assertEquals(3, dto.getSyncedAccounts());
        }

        @Test
        @DisplayName("setters override constructor values")
        void shouldOverrideWithSetters() {
            BankSyncResultDto dto = new BankSyncResultDto(5, 2);
            dto.setImported(99);
            dto.setSyncedAccounts(7);
            assertEquals(99, dto.getImported());
            assertEquals(7, dto.getSyncedAccounts());
        }
    }

    // ── AuthenticatedUserDto ──────────────────────────────────────────────

    @Nested
    @DisplayName("AuthenticatedUserDto")
    class AuthenticatedUserDtoTests {

        @Test
        @DisplayName("all-args constructor round-trip")
        void shouldRoundTripAllArgsConstructor() {
            String id = UUID.randomUUID().toString();
            AuthenticatedUserDto dto = new AuthenticatedUserDto(
                    id, "alice", "alice@example.com", "access-token", "refresh-token");

            assertEquals(id, dto.getId());
            assertEquals("alice", dto.getNickname());
            assertEquals("alice@example.com", dto.getEmail());
            assertEquals("access-token", dto.getAccessToken());
            assertEquals("refresh-token", dto.getRefreshToken());
        }

        @Test
        @DisplayName("no-arg constructor with setters round-trip")
        void shouldRoundTripSetters() {
            AuthenticatedUserDto dto = new AuthenticatedUserDto();
            dto.setId("new-id");
            dto.setNickname("bob");
            dto.setEmail("bob@example.com");
            dto.setAccessToken("tok-a");
            dto.setRefreshToken("tok-r");

            assertEquals("new-id", dto.getId());
            assertEquals("bob", dto.getNickname());
            assertEquals("bob@example.com", dto.getEmail());
            assertEquals("tok-a", dto.getAccessToken());
            assertEquals("tok-r", dto.getRefreshToken());
        }
    }

    // ── CsvImportResultDto ─────────────────────────────────────────────────

    @Nested
    @DisplayName("CsvImportResultDto")
    class CsvImportResultDtoTests {

        @Test
        @DisplayName("no-arg constructor has empty error list by default")
        void shouldHaveEmptyErrorsByDefault() {
            CsvImportResultDto dto = new CsvImportResultDto();
            assertNotNull(dto.getErrors());
            assertTrue(dto.getErrors().isEmpty());
        }

        @Test
        @DisplayName("all-args constructor sets all fields")
        void shouldSetAllFieldsViaConstructor() {
            List<String> errors = List.of("Line 3: bad date", "Line 7: bad amount");
            CsvImportResultDto dto = new CsvImportResultDto(10, 2, errors);

            assertEquals(10, dto.getImported());
            assertEquals(2, dto.getSkipped());
            assertEquals(2, dto.getErrors().size());
        }

        @Test
        @DisplayName("setters override values")
        void shouldOverrideWithSetters() {
            CsvImportResultDto dto = new CsvImportResultDto();
            dto.setImported(5);
            dto.setSkipped(1);
            dto.setErrors(List.of("err"));

            assertEquals(5, dto.getImported());
            assertEquals(1, dto.getSkipped());
            assertEquals(1, dto.getErrors().size());
        }
    }

    // ── ScheduledTransactionUpdateDto ─────────────────────────────────────

    @Nested
    @DisplayName("ScheduledTransactionUpdateDto")
    class ScheduledTransactionUpdateDtoTests {

        @Test
        @DisplayName("getter/setter round-trip for all fields")
        void shouldRoundTripAllFields() {
            ScheduledTransactionUpdateDto dto = new ScheduledTransactionUpdateDto();
            UUID accountId = UUID.randomUUID();
            UUID categoryId = UUID.randomUUID();
            LocalDate date = LocalDate.of(2026, 6, 1);
            BigDecimal amount = new BigDecimal("75.00");

            dto.setName("Rent");
            dto.setAmount(amount);
            dto.setType(TransactionType.EXPENSE);
            dto.setAccountId(accountId);
            dto.setCategoryId(categoryId);
            dto.setAffectsBalance(true);
            dto.setFreqYears(0);
            dto.setFreqMonths(1);
            dto.setFreqWeeks(0);
            dto.setFreqDays(0);
            dto.setStartDate(date);
            dto.setActive(false);

            assertEquals("Rent", dto.getName());
            assertEquals(amount, dto.getAmount());
            assertEquals(TransactionType.EXPENSE, dto.getType());
            assertEquals(accountId, dto.getAccountId());
            assertEquals(categoryId, dto.getCategoryId());
            assertTrue(dto.getAffectsBalance());
            assertEquals(0, dto.getFreqYears());
            assertEquals(1, dto.getFreqMonths());
            assertEquals(0, dto.getFreqWeeks());
            assertEquals(0, dto.getFreqDays());
            assertEquals(date, dto.getStartDate());
            assertFalse(dto.getActive());
        }
    }

    // ── ChartWidgetConverter ──────────────────────────────────────────────

    @Nested
    @DisplayName("ChartWidgetConverter")
    class ChartWidgetConverterTests {

        private ChartWidgetConverter converter;
        private User user;
        private ChartWidget widget;

        @BeforeEach
        void setUp() {
            converter = new ChartWidgetConverter();
            user = new User("test", "t@t.com", "pwd");
            widget = new ChartWidget(
                    "Revenue", WidgetType.CHART, WidgetChartType.BAR,
                    "{\"filter\":{}}", true, false, 2, "LG", user);
            setId(widget, UUID.randomUUID());
        }

        @Test
        @DisplayName("toResponseDto maps all fields")
        void shouldMapToResponseDto() {
            ChartWidgetResponseDto dto = converter.toResponseDto(widget);

            assertEquals(widget.getId().toString(), dto.getId());
            assertEquals("Revenue", dto.getName());
            assertEquals("CHART", dto.getWidgetType());
            assertEquals("BAR", dto.getChartType());
            assertEquals("{\"filter\":{}}", dto.getConfiguration());
            assertTrue(dto.isPinned());
            assertFalse(dto.isVisible());
            assertEquals(2, dto.getDisplayOrder());
            assertEquals("LG", dto.getLayoutSize());
        }

        @Test
        @DisplayName("toSummaryDto maps all fields except configuration")
        void shouldMapToSummaryDto() {
            ChartWidgetSummaryDto dto = converter.toSummaryDto(widget);

            assertEquals(widget.getId().toString(), dto.getId());
            assertEquals("Revenue", dto.getName());
            assertEquals("CHART", dto.getWidgetType());
            assertEquals("BAR", dto.getChartType());
            assertTrue(dto.isPinned());
            assertFalse(dto.isVisible());
            assertEquals(2, dto.getDisplayOrder());
            assertEquals("LG", dto.getLayoutSize());
        }

        @Test
        @DisplayName("toPreviewDto sets widgetType, chartType, and data")
        void shouldMapToPreviewDto() {
            ObjectNode data = new ObjectMapper().createObjectNode().put("kpi", 42);
            ChartWidgetPreviewResponseDto dto = converter.toPreviewDto("KPI", "KPI_CARD", data);

            assertEquals("KPI", dto.getWidgetType());
            assertEquals("KPI_CARD", dto.getChartType());
            assertEquals(42, dto.getData().get("kpi").asInt());
        }
    }

    // ── BankConverter ─────────────────────────────────────────────────────

    @Nested
    @DisplayName("BankConverter")
    class BankConverterTests {

        private BankConverter converter;
        private User user;
        private Account account;

        @BeforeEach
        void setUp() {
            converter = new BankConverter();
            user = new User("test", "t@t.com", "pwd");
            account = new Account("Savings", AccountType.BANK, "EUR", BigDecimal.ZERO, user);
            setId(account, UUID.randomUUID());
        }

        @Test
        @DisplayName("toConnectionDto maps all fields and sets linked=true")
        void shouldMapToConnectionDto() {
            BankConnection connection = new BankConnection(
                    account, user, "access-tok", "refresh-tok",
                    Instant.now().plusSeconds(3600));
            setId(connection, UUID.randomUUID());
            connection.setProvider("ENABLE_BANKING");
            Instant lastSync = Instant.now();
            connection.setLastSync(lastSync);
            connection.setConsentExpires(Instant.now().plusSeconds(7200));

            BankConnectionDto dto = converter.toConnectionDto(connection);

            assertEquals(connection.getId().toString(), dto.getId());
            assertEquals(account.getId().toString(), dto.getAccountId());
            assertEquals("ENABLE_BANKING", dto.getProvider());
            assertEquals(lastSync, dto.getLastSync());
            assertNotNull(dto.getConsentExpires());
            assertTrue(dto.isLinked());
        }

        @Test
        @DisplayName("toRuleResponseDto maps rule with mapped category")
        void shouldMapRuleWithMappedCategory() {
            Category mappedCat = new Category("Food", TransactionType.EXPENSE, user);
            setId(mappedCat, UUID.randomUUID());
            BankTransactionRule rule = new BankTransactionRule(
                    user, account, "MERCADONA", "Supermarkets",
                    TransactionType.EXPENSE, "Grocery shopping", mappedCat, 1);
            setId(rule, UUID.randomUUID());

            BankRuleResponseDto dto = converter.toRuleResponseDto(rule);

            assertEquals(rule.getId().toString(), dto.getId());
            assertEquals(account.getId().toString(), dto.getAccountId());
            assertEquals("Savings", dto.getAccountName());
            assertEquals("MERCADONA", dto.getNamePattern());
            assertEquals("Supermarkets", dto.getBankCategory());
            assertEquals(TransactionType.EXPENSE, dto.getTransactionType());
            assertEquals("Grocery shopping", dto.getMappedName());
            assertEquals(1, dto.getPriority());
            assertEquals(mappedCat.getId().toString(), dto.getMappedCategoryId());
            assertEquals("Food", dto.getMappedCategoryName());
        }

        @Test
        @DisplayName("toRuleResponseDto maps rule without mapped category")
        void shouldMapRuleWithoutMappedCategory() {
            BankTransactionRule rule = new BankTransactionRule(
                    user, account, "AMAZON", null,
                    TransactionType.EXPENSE, null, null, 2);
            setId(rule, UUID.randomUUID());

            BankRuleResponseDto dto = converter.toRuleResponseDto(rule);

            assertNull(dto.getMappedCategoryId());
            assertNull(dto.getMappedCategoryName());
        }
    }

    // ── ScheduledTransactionConverter ─────────────────────────────────────

    @Nested
    @DisplayName("ScheduledTransactionConverter")
    class ScheduledTransactionConverterTests {

        private ScheduledTransactionService scheduledTransactionService;
        private ScheduledTransactionConverter converter;
        private User user;

        @BeforeEach
        void setUp() {
            scheduledTransactionService = mock(ScheduledTransactionService.class);
            converter = new ScheduledTransactionConverter(scheduledTransactionService);
            user = new User("tester", "t@t.com", "pwd");
        }

        @Test
        @DisplayName("toResponseDto with active=true, account and category set")
        void shouldMapActiveWithAccountAndCategory() {
            ScheduledTransaction st = new ScheduledTransaction(
                    "Salary", new BigDecimal("2000"), TransactionType.INCOME,
                    0, 1, 0, 0, LocalDate.of(2026, 1, 1), user);
            setId(st, UUID.randomUUID());

            Account account = new Account("Main", AccountType.BANK, "EUR", BigDecimal.ZERO, user);
            setId(account, UUID.randomUUID());
            Category cat = new Category("Income Cat", TransactionType.INCOME, user);
            setId(cat, UUID.randomUUID());
            st.setAccount(account);
            st.setCategory(cat);

            LocalDate nextExec = LocalDate.of(2026, 2, 1);
            when(scheduledTransactionService.calculateNextExecution(st)).thenReturn(nextExec);

            ScheduledTransactionResponseDto dto = converter.toResponseDto(st);

            assertEquals(st.getId().toString(), dto.getId());
            assertEquals("Salary", dto.getName());
            assertEquals(new BigDecimal("2000"), dto.getAmount());
            assertEquals(TransactionType.INCOME, dto.getType());
            assertTrue(dto.isActive());
            assertEquals(nextExec, dto.getNextExecution());
            assertEquals(account.getId().toString(), dto.getAccountId());
            assertEquals("Main", dto.getAccountName());
            assertEquals(cat.getId().toString(), dto.getCategoryId());
            assertEquals("Income Cat", dto.getCategoryName());
        }

        @Test
        @DisplayName("toResponseDto with active=false skips nextExecution calculation")
        void shouldSkipNextExecWhenInactive() {
            ScheduledTransaction st = new ScheduledTransaction(
                    "Old Sub", new BigDecimal("10"), TransactionType.EXPENSE,
                    0, 0, 0, 7, LocalDate.of(2025, 1, 1), user);
            setId(st, UUID.randomUUID());
            st.setActive(false);

            ScheduledTransactionResponseDto dto = converter.toResponseDto(st);

            assertFalse(dto.isActive());
            assertNull(dto.getNextExecution());
            verify(scheduledTransactionService, never()).calculateNextExecution(any());
        }

        @Test
        @DisplayName("toResponseDto with no account and no category leaves those fields null")
        void shouldLeaveAccountAndCategoryNull() {
            ScheduledTransaction st = new ScheduledTransaction(
                    "Transfer", new BigDecimal("500"), TransactionType.EXPENSE,
                    0, 0, 1, 0, LocalDate.of(2026, 3, 1), user);
            setId(st, UUID.randomUUID());
            when(scheduledTransactionService.calculateNextExecution(st))
                    .thenReturn(LocalDate.of(2026, 3, 8));

            ScheduledTransactionResponseDto dto = converter.toResponseDto(st);

            assertNull(dto.getAccountId());
            assertNull(dto.getAccountName());
            assertNull(dto.getCategoryId());
            assertNull(dto.getCategoryName());
        }
    }

    // ── BudgetConverter ───────────────────────────────────────────────────

    @Nested
    @DisplayName("BudgetConverter")
    class BudgetConverterTests {

        private BudgetService budgetService;
        private BudgetConverter converter;
        private User user;

        @BeforeEach
        void setUp() {
            budgetService = mock(BudgetService.class);
            converter = new BudgetConverter(budgetService);
            user = new User("tester", "t@t.com", "pwd");
            setId(user, UUID.randomUUID());
        }

        @Test
        @DisplayName("toSummaryDto maps budget with one category")
        void shouldMapToSummaryDto() {
            Budget budget = mock(Budget.class);
            UUID budgetId = UUID.randomUUID();
            when(budget.getId()).thenReturn(budgetId);
            when(budget.getName()).thenReturn("Monthly Budget");
            when(budget.getPeriodicity()).thenReturn(BudgetPeriodicity.MONTHLY);
            when(budget.getStartDate()).thenReturn(LocalDate.of(2026, 1, 1));
            when(budget.getUser()).thenReturn(user);

            BudgetCategory bc = mock(BudgetCategory.class);
            when(bc.getMaxAmount()).thenReturn(new BigDecimal("500"));
            when(budget.getCategories()).thenReturn(List.of(bc));

            LocalDate ps = LocalDate.of(2026, 3, 1);
            LocalDate pe = LocalDate.of(2026, 3, 31);
            when(budgetService.getCurrentPeriodDates(budget))
                    .thenReturn(new LocalDate[]{ps, pe});
            when(budgetService.getPreviousPeriodDates(budget))
                    .thenReturn(new LocalDate[]{LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 28)});
            when(budgetService.calculateSpent(any(), any(), any(), any()))
                    .thenReturn(new BigDecimal("150"));

            BudgetSummaryDto dto = converter.toSummaryDto(budget);

            assertEquals(budgetId.toString(), dto.getId());
            assertEquals("Monthly Budget", dto.getName());
            assertEquals(BudgetPeriodicity.MONTHLY, dto.getPeriodicity());
            assertEquals(new BigDecimal("500"), dto.getTotalBudget());
            assertEquals(new BigDecimal("150"), dto.getTotalSpent());
            assertEquals(new BigDecimal("350"), dto.getTotalRemaining());
            assertEquals(30.0, dto.getUsagePercent(), 0.01);
            assertEquals(1, dto.getCategoryCount());
        }

        @Test
        @DisplayName("toResponseDto maps budget with categories and transactions")
        void shouldMapToResponseDto() {
            Budget budget = mock(Budget.class);
            UUID budgetId = UUID.randomUUID();
            UUID bcId = UUID.randomUUID();
            UUID txId = UUID.randomUUID();
            UUID userId = ((User) user).getId();

            when(budget.getId()).thenReturn(budgetId);
            when(budget.getName()).thenReturn("Annual Budget");
            when(budget.getPeriodicity()).thenReturn(BudgetPeriodicity.ANNUAL);
            when(budget.getStartDate()).thenReturn(LocalDate.of(2026, 1, 1));
            when(budget.getUser()).thenReturn(user);

            BudgetCategory bc = mock(BudgetCategory.class);
            when(bc.getId()).thenReturn(bcId);
            when(bc.getName()).thenReturn("Transport");
            when(bc.getMaxAmount()).thenReturn(new BigDecimal("200"));
            when(bc.getDisplayOrder()).thenReturn(1);
            when(bc.getLinkedCategories()).thenReturn(Set.of());

            Transaction tx = new Transaction("Metro", new BigDecimal("30"),
                    LocalDate.of(2026, 3, 10), TransactionType.EXPENSE, user);
            setId(tx, txId);
            when(bc.getManualTransactions()).thenReturn(Set.of(tx));
            when(budget.getCategories()).thenReturn(List.of(bc));

            LocalDate ps = LocalDate.of(2026, 1, 1);
            LocalDate pe = LocalDate.of(2026, 12, 31);
            when(budgetService.getCurrentPeriodDates(budget))
                    .thenReturn(new LocalDate[]{ps, pe});
            when(budgetService.getPreviousPeriodDates(budget))
                    .thenReturn(new LocalDate[]{LocalDate.of(2025, 1, 1), LocalDate.of(2025, 12, 31)});
            when(budgetService.calculateSpent(eq(userId), any(), any(), any()))
                    .thenReturn(new BigDecimal("80"));
            when(budgetService.getTransactionsInPeriod(eq(userId), any(), any(), any()))
                    .thenReturn(List.of(tx));

            BudgetResponseDto dto = converter.toResponseDto(budget);

            assertEquals(budgetId.toString(), dto.getId());
            assertEquals(1, dto.getCategories().size());
            BudgetCategoryResponseDto catDto = dto.getCategories().get(0);
            assertEquals("Transport", catDto.getName());
            assertEquals(new BigDecimal("200"), dto.getTotalBudget());
            assertEquals(new BigDecimal("80"), dto.getTotalSpent());
            assertEquals(1, catDto.getTransactions().size());
            assertTrue(catDto.getTransactions().get(0).isManual());
        }

        @Test
        @DisplayName("toSummaryDto returns 0% usage when total budget is zero")
        void shouldReturnZeroPercentWhenTotalIsZero() {
            Budget budget = mock(Budget.class);
            when(budget.getId()).thenReturn(UUID.randomUUID());
            when(budget.getName()).thenReturn("Empty Budget");
            when(budget.getPeriodicity()).thenReturn(BudgetPeriodicity.MONTHLY);
            when(budget.getStartDate()).thenReturn(LocalDate.of(2026, 1, 1));
            when(budget.getUser()).thenReturn(user);
            when(budget.getCategories()).thenReturn(List.of());
            when(budgetService.getCurrentPeriodDates(budget))
                    .thenReturn(new LocalDate[]{LocalDate.of(2026, 3, 1), LocalDate.of(2026, 3, 31)});
            when(budgetService.getPreviousPeriodDates(budget))
                    .thenReturn(new LocalDate[]{LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 28)});

            BudgetSummaryDto dto = converter.toSummaryDto(budget);

            assertEquals(0.0, dto.getUsagePercent(), 0.001);
        }
    }
}
