package Balio.web.model.services;

import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.FilterInvalidException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Category;
import Balio.web.model.entities.Filter;
import Balio.web.model.entities.FilterDao;
import Balio.web.model.entities.Transaction;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FilterServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID FILTER_ID = UUID.randomUUID();
    private static final String VALID_NAME = "Monthly Expenses";
    private static final String VALID_DEFINITION = "{\"type\":\"EXPENSE\"}";

    @Mock private UserDao userDao;
    @Mock private FilterDao filterDao;
    @Mock private TransactionService transactionService;

    private FilterServiceImpl filterService;
    private User user;
    private Filter existingFilter;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper();
        filterService = new FilterServiceImpl(userDao, filterDao, transactionService, objectMapper);

        user = new User("Nick", "nick@example.com", "encodedPwd");
        setFieldViaReflection(user, "id", USER_ID);

        existingFilter = new Filter(VALID_NAME, VALID_DEFINITION, user);
        setFieldViaReflection(existingFilter, "id", FILTER_ID);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  createFilter
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("createFilter")
    class CreateFilterTests {

        @Test
        @DisplayName("creates filter with valid params")
        void createsFilterWithValidParams() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(filterDao.save(any(Filter.class))).thenAnswer(inv -> inv.getArgument(0));

            Filter result = filterService.createFilter(USER_ID, VALID_NAME, VALID_DEFINITION);

            assertNotNull(result);
            assertEquals(VALID_NAME, result.getName());
            assertEquals(VALID_DEFINITION, result.getDefinition());
            assertEquals(user, result.getUser());

            verify(filterDao).save(any(Filter.class));
        }

        @Test
        @DisplayName("trims whitespace from name")
        void trimsName() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(filterDao.save(any(Filter.class))).thenAnswer(inv -> inv.getArgument(0));

            Filter result = filterService.createFilter(USER_ID, "  My Filter  ", VALID_DEFINITION);

            assertEquals("My Filter", result.getName());
        }

        @Test
        @DisplayName("accepts definition with all known fields")
        void acceptsAllFields() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(filterDao.save(any(Filter.class))).thenAnswer(inv -> inv.getArgument(0));

            String def = "{\"type\":\"INCOME\",\"accountId\":\"" + UUID.randomUUID()
                    + "\",\"categoryId\":\"" + UUID.randomUUID()
                    + "\",\"startDate\":\"2024-01-01\",\"endDate\":\"2024-12-31\"}";

            Filter result = filterService.createFilter(USER_ID, VALID_NAME, def);
            assertEquals(def, result.getDefinition());
        }

        @Test
        @DisplayName("accepts empty JSON object")
        void acceptsEmptyObject() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));
            when(filterDao.save(any(Filter.class))).thenAnswer(inv -> inv.getArgument(0));

            Filter result = filterService.createFilter(USER_ID, VALID_NAME, "{}");
            assertEquals("{}", result.getDefinition());
        }

        @Test
        @DisplayName("throws UserNotFoundException when user does not exist")
        void throwsWhenUserNotFound() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.empty());

            assertThrows(UserNotFoundException.class,
                    () -> filterService.createFilter(USER_ID, VALID_NAME, VALID_DEFINITION));

            verify(filterDao, never()).save(any());
        }

        @ParameterizedTest
        @NullSource
        @ValueSource(strings = {"", "   "})
        @DisplayName("throws FilterInvalidException when name is null/blank")
        void throwsWhenNameBlank(String name) {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            assertThrows(FilterInvalidException.class,
                    () -> filterService.createFilter(USER_ID, name, VALID_DEFINITION));

            verify(filterDao, never()).save(any());
        }

        @ParameterizedTest
        @NullSource
        @ValueSource(strings = {"", "   "})
        @DisplayName("throws FilterInvalidException when definition is null/blank")
        void throwsWhenDefinitionBlank(String def) {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            assertThrows(FilterInvalidException.class,
                    () -> filterService.createFilter(USER_ID, VALID_NAME, def));

            verify(filterDao, never()).save(any());
        }

        @Test
        @DisplayName("throws FilterInvalidException when definition is not valid JSON")
        void throwsWhenNotJson() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            assertThrows(FilterInvalidException.class,
                    () -> filterService.createFilter(USER_ID, VALID_NAME, "not-json"));
        }

        @Test
        @DisplayName("throws FilterInvalidException when definition is a JSON array")
        void throwsWhenJsonArray() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            assertThrows(FilterInvalidException.class,
                    () -> filterService.createFilter(USER_ID, VALID_NAME, "[1,2,3]"));
        }

        @Test
        @DisplayName("throws FilterInvalidException when definition has unknown field")
        void throwsWhenUnknownField() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            assertThrows(FilterInvalidException.class,
                    () -> filterService.createFilter(USER_ID, VALID_NAME, "{\"unknownField\":\"val\"}"));
        }

        @Test
        @DisplayName("throws FilterInvalidException when startDate has invalid format")
        void throwsWhenInvalidStartDate() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            assertThrows(FilterInvalidException.class,
                    () -> filterService.createFilter(USER_ID, VALID_NAME, "{\"startDate\":\"2024/01/01\"}"));
        }

        @Test
        @DisplayName("throws FilterInvalidException when endDate has invalid format")
        void throwsWhenInvalidEndDate() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            assertThrows(FilterInvalidException.class,
                    () -> filterService.createFilter(USER_ID, VALID_NAME, "{\"endDate\":\"not-a-date\"}"));
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  deleteFilter
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("deleteFilter")
    class DeleteFilterTests {

        @Test
        @DisplayName("deletes filter successfully")
        void deletesFilter() throws InstanceNotFoundException {
            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(existingFilter));

            filterService.deleteFilter(USER_ID, FILTER_ID);

            verify(filterDao).delete(existingFilter);
        }

        @Test
        @DisplayName("throws InstanceNotFoundException when filter not found")
        void throwsWhenNotFound() {
            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> filterService.deleteFilter(USER_ID, FILTER_ID));

            verify(filterDao, never()).delete(any());
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  modifyFilter
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("modifyFilter")
    class ModifyFilterTests {

        @Test
        @DisplayName("updates name only")
        void updatesNameOnly() throws InstanceNotFoundException {
            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(existingFilter));
            when(filterDao.save(any(Filter.class))).thenAnswer(inv -> inv.getArgument(0));

            Filter result = filterService.modifyFilter(USER_ID, FILTER_ID, "Renamed", null);

            assertEquals("Renamed", result.getName());
            assertEquals(VALID_DEFINITION, result.getDefinition()); // unchanged
        }

        @Test
        @DisplayName("updates definition only")
        void updatesDefinitionOnly() throws InstanceNotFoundException {
            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(existingFilter));
            when(filterDao.save(any(Filter.class))).thenAnswer(inv -> inv.getArgument(0));

            String newDef = "{\"type\":\"INCOME\"}";
            Filter result = filterService.modifyFilter(USER_ID, FILTER_ID, null, newDef);

            assertEquals(VALID_NAME, result.getName()); // unchanged
            assertEquals(newDef, result.getDefinition());
        }

        @Test
        @DisplayName("updates both name and definition")
        void updatesBoth() throws InstanceNotFoundException {
            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(existingFilter));
            when(filterDao.save(any(Filter.class))).thenAnswer(inv -> inv.getArgument(0));

            String newDef = "{\"type\":\"INCOME\"}";
            Filter result = filterService.modifyFilter(USER_ID, FILTER_ID, "New Name", newDef);

            assertEquals("New Name", result.getName());
            assertEquals(newDef, result.getDefinition());
        }

        @Test
        @DisplayName("trims whitespace from updated name")
        void trimsUpdatedName() throws InstanceNotFoundException {
            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(existingFilter));
            when(filterDao.save(any(Filter.class))).thenAnswer(inv -> inv.getArgument(0));

            Filter result = filterService.modifyFilter(USER_ID, FILTER_ID, "  Trimmed  ", null);

            assertEquals("Trimmed", result.getName());
        }

        @ParameterizedTest
        @ValueSource(strings = {"", "   "})
        @DisplayName("throws FilterInvalidException when name is blank")
        void throwsWhenNameBlank(String blankName) {
            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(existingFilter));

            assertThrows(FilterInvalidException.class,
                    () -> filterService.modifyFilter(USER_ID, FILTER_ID, blankName, null));
        }

        @ParameterizedTest
        @ValueSource(strings = {"", "   "})
        @DisplayName("throws FilterInvalidException when definition is blank")
        void throwsWhenDefinitionBlank(String blankDef) {
            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(existingFilter));

            assertThrows(FilterInvalidException.class,
                    () -> filterService.modifyFilter(USER_ID, FILTER_ID, null, blankDef));
        }

        @Test
        @DisplayName("throws FilterInvalidException when definition is invalid JSON")
        void throwsWhenInvalidJson() {
            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(existingFilter));

            assertThrows(FilterInvalidException.class,
                    () -> filterService.modifyFilter(USER_ID, FILTER_ID, null, "invalid"));
        }

        @Test
        @DisplayName("throws FilterInvalidException when definition has unknown field")
        void throwsWhenUnknownField() {
            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(existingFilter));

            assertThrows(FilterInvalidException.class,
                    () -> filterService.modifyFilter(USER_ID, FILTER_ID, null, "{\"badField\":1}"));
        }

        @Test
        @DisplayName("throws InstanceNotFoundException when filter not found")
        void throwsWhenNotFound() {
            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> filterService.modifyFilter(USER_ID, FILTER_ID, "X", null));
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  findAllByUserId
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("findAllByUserId")
    class FindAllTests {

        @Test
        @DisplayName("returns all filters for user")
        void returnsAllFilters() {
            Filter f2 = new Filter("Income Filter", "{\"type\":\"INCOME\"}", user);
            setFieldViaReflection(f2, "id", UUID.randomUUID());

            when(filterDao.findAllByUserIdOrderByNameAsc(USER_ID))
                    .thenReturn(List.of(f2, existingFilter));

            List<Filter> result = filterService.findAllByUserId(USER_ID);

            assertEquals(2, result.size());
            verify(filterDao).findAllByUserIdOrderByNameAsc(USER_ID);
        }

        @Test
        @DisplayName("returns empty list when user has no filters")
        void returnsEmptyList() {
            when(filterDao.findAllByUserIdOrderByNameAsc(USER_ID)).thenReturn(List.of());

            List<Filter> result = filterService.findAllByUserId(USER_ID);

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
        @DisplayName("returns filter when found")
        void returnsFilter() throws InstanceNotFoundException {
            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(existingFilter));

            Filter result = filterService.findByIdAndUserId(FILTER_ID, USER_ID);

            assertEquals(existingFilter, result);
        }

        @Test
        @DisplayName("throws InstanceNotFoundException when not found")
        void throwsWhenNotFound() {
            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> filterService.findByIdAndUserId(FILTER_ID, USER_ID));
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  applyFilter
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("applyFilter")
    class ApplyFilterTests {

        @Test
        @DisplayName("delegates to transactionService with type only")
        void appliesTypeOnly() throws InstanceNotFoundException {
            Filter typeFilter = new Filter("By Type", "{\"type\":\"EXPENSE\"}", user);
            setFieldViaReflection(typeFilter, "id", FILTER_ID);

            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(typeFilter));
            when(transactionService.findFiltered(USER_ID, TransactionType.EXPENSE,
                    null, null, null, null)).thenReturn(List.of());

            List<Transaction> result = filterService.applyFilter(USER_ID, FILTER_ID);

            assertTrue(result.isEmpty());
            verify(transactionService).findFiltered(USER_ID, TransactionType.EXPENSE,
                    null, null, null, null);
        }

        @Test
        @DisplayName("delegates to transactionService with all fields")
        void appliesAllFields() throws InstanceNotFoundException {
            UUID accountId = UUID.randomUUID();
            UUID categoryId = UUID.randomUUID();
            String def = String.format(
                    "{\"type\":\"INCOME\",\"accountId\":\"%s\",\"categoryId\":\"%s\","
                            + "\"startDate\":\"2024-01-01\",\"endDate\":\"2024-06-30\"}",
                    accountId, categoryId);

            Filter fullFilter = new Filter("Full", def, user);
            setFieldViaReflection(fullFilter, "id", FILTER_ID);

            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(fullFilter));
            when(transactionService.findFiltered(USER_ID, TransactionType.INCOME,
                    accountId, categoryId,
                    LocalDate.of(2024, 1, 1), LocalDate.of(2024, 6, 30)))
                    .thenReturn(List.of());

            filterService.applyFilter(USER_ID, FILTER_ID);

            verify(transactionService).findFiltered(USER_ID, TransactionType.INCOME,
                    accountId, categoryId,
                    LocalDate.of(2024, 1, 1), LocalDate.of(2024, 6, 30));
        }

        @Test
        @DisplayName("delegates with empty definition (no criteria)")
        void appliesEmptyDefinition() throws InstanceNotFoundException {
            Filter emptyFilter = new Filter("No filter", "{}", user);
            setFieldViaReflection(emptyFilter, "id", FILTER_ID);

            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(emptyFilter));
            when(transactionService.findFiltered(USER_ID, null, null, null, null, null))
                    .thenReturn(List.of());

            filterService.applyFilter(USER_ID, FILTER_ID);

            verify(transactionService).findFiltered(USER_ID, null, null, null, null, null);
        }

        @Test
        @DisplayName("returns transactions from transactionService")
        void returnsTransactions() throws InstanceNotFoundException {
            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(existingFilter));

            Transaction t1 = new Transaction("Tx1", new BigDecimal("50"), LocalDate.now(), TransactionType.EXPENSE, user);
            Transaction t2 = new Transaction("Tx2", new BigDecimal("100"), LocalDate.now(), TransactionType.EXPENSE, user);
            when(transactionService.findFiltered(eq(USER_ID), eq(TransactionType.EXPENSE),
                    any(), any(), any(), any()))
                    .thenReturn(List.of(t1, t2));

            List<Transaction> result = filterService.applyFilter(USER_ID, FILTER_ID);

            assertEquals(2, result.size());
        }

        @Test
        @DisplayName("throws InstanceNotFoundException when filter not found")
        void throwsWhenNotFound() {
            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> filterService.applyFilter(USER_ID, FILTER_ID));
        }

        // ── in-memory post-filters ────────────────────────────────────────

        @Test
        @DisplayName("filters by single categoryId in categoryIds array")
        void filtersBySingleCategoryId() throws InstanceNotFoundException {
            UUID catId = UUID.randomUUID();
            String def = "{\"categoryIds\":[\"" + catId + "\"]}";
            Filter f = new Filter("Cat", def, user);
            setFieldViaReflection(f, "id", FILTER_ID);

            Category cat = new Category("Food", TransactionType.EXPENSE, user);
            setFieldViaReflection(cat, "id", catId);

            Transaction match = new Transaction("Match", new BigDecimal("10"), LocalDate.now(), TransactionType.EXPENSE, user);
            match.setCategory(cat);

            Category other = new Category("Other", TransactionType.EXPENSE, user);
            setFieldViaReflection(other, "id", UUID.randomUUID());
            Transaction noMatch = new Transaction("NoMatch", new BigDecimal("10"), LocalDate.now(), TransactionType.EXPENSE, user);
            noMatch.setCategory(other);

            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(f));
            when(transactionService.findFiltered(USER_ID, null, null, catId, null, null))
                    .thenReturn(List.of(match, noMatch));

            List<Transaction> result = filterService.applyFilter(USER_ID, FILTER_ID);
            assertEquals(2, result.size()); // single-cat → delegated to DB, no in-memory filter
        }

        @Test
        @DisplayName("filters by multiple categoryIds in-memory")
        void filtersByMultipleCategoryIds() throws InstanceNotFoundException {
            UUID catId1 = UUID.randomUUID();
            UUID catId2 = UUID.randomUUID();
            String def = "{\"categoryIds\":[\"" + catId1 + "\",\"" + catId2 + "\"]}";
            Filter f = new Filter("MultiCat", def, user);
            setFieldViaReflection(f, "id", FILTER_ID);

            Category cat1 = new Category("Food", TransactionType.EXPENSE, user);
            setFieldViaReflection(cat1, "id", catId1);
            Category cat2 = new Category("Transport", TransactionType.EXPENSE, user);
            setFieldViaReflection(cat2, "id", catId2);
            Category cat3 = new Category("Other", TransactionType.EXPENSE, user);
            setFieldViaReflection(cat3, "id", UUID.randomUUID());

            Transaction t1 = new Transaction("A", new BigDecimal("10"), LocalDate.now(), TransactionType.EXPENSE, user);
            t1.setCategory(cat1);
            Transaction t2 = new Transaction("B", new BigDecimal("20"), LocalDate.now(), TransactionType.EXPENSE, user);
            t2.setCategory(cat2);
            Transaction t3 = new Transaction("C", new BigDecimal("30"), LocalDate.now(), TransactionType.EXPENSE, user);
            t3.setCategory(cat3);

            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(f));
            when(transactionService.findFiltered(USER_ID, null, null, null, null, null))
                    .thenReturn(List.of(t1, t2, t3));

            List<Transaction> result = filterService.applyFilter(USER_ID, FILTER_ID);

            assertEquals(2, result.size());
            assertTrue(result.contains(t1));
            assertTrue(result.contains(t2));
        }

        @Test
        @DisplayName("filters by nameQuery in-memory (case-insensitive)")
        void filtersByNameQuery() throws InstanceNotFoundException {
            String def = "{\"nameQuery\":\"grocery\"}";
            Filter f = new Filter("Name", def, user);
            setFieldViaReflection(f, "id", FILTER_ID);

            Transaction match = new Transaction("Grocery Store", new BigDecimal("50"), LocalDate.now(), TransactionType.EXPENSE, user);
            Transaction noMatch = new Transaction("Gas Station", new BigDecimal("40"), LocalDate.now(), TransactionType.EXPENSE, user);

            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(f));
            when(transactionService.findFiltered(USER_ID, null, null, null, null, null))
                    .thenReturn(List.of(match, noMatch));

            List<Transaction> result = filterService.applyFilter(USER_ID, FILTER_ID);

            assertEquals(1, result.size());
            assertEquals("Grocery Store", result.get(0).getName());
        }

        @Test
        @DisplayName("blank nameQuery is ignored (no filtering)")
        void blankNameQueryIgnored() throws InstanceNotFoundException {
            String def = "{\"nameQuery\":\"   \"}";
            Filter f = new Filter("Blank", def, user);
            setFieldViaReflection(f, "id", FILTER_ID);

            Transaction t1 = new Transaction("A", new BigDecimal("10"), LocalDate.now(), TransactionType.EXPENSE, user);
            Transaction t2 = new Transaction("B", new BigDecimal("20"), LocalDate.now(), TransactionType.EXPENSE, user);

            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(f));
            when(transactionService.findFiltered(USER_ID, null, null, null, null, null))
                    .thenReturn(List.of(t1, t2));

            List<Transaction> result = filterService.applyFilter(USER_ID, FILTER_ID);
            assertEquals(2, result.size());
        }

        @Test
        @DisplayName("filters by amountMin in-memory")
        void filtersByAmountMin() throws InstanceNotFoundException {
            String def = "{\"amountMin\":\"50.00\"}";
            Filter f = new Filter("Min", def, user);
            setFieldViaReflection(f, "id", FILTER_ID);

            Transaction t1 = new Transaction("Cheap", new BigDecimal("30.00"), LocalDate.now(), TransactionType.EXPENSE, user);
            Transaction t2 = new Transaction("Exact", new BigDecimal("50.00"), LocalDate.now(), TransactionType.EXPENSE, user);
            Transaction t3 = new Transaction("Expensive", new BigDecimal("100.00"), LocalDate.now(), TransactionType.EXPENSE, user);

            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(f));
            when(transactionService.findFiltered(USER_ID, null, null, null, null, null))
                    .thenReturn(List.of(t1, t2, t3));

            List<Transaction> result = filterService.applyFilter(USER_ID, FILTER_ID);

            assertEquals(2, result.size());
            assertTrue(result.contains(t2));
            assertTrue(result.contains(t3));
        }

        @Test
        @DisplayName("filters by amountMax in-memory")
        void filtersByAmountMax() throws InstanceNotFoundException {
            String def = "{\"amountMax\":\"50.00\"}";
            Filter f = new Filter("Max", def, user);
            setFieldViaReflection(f, "id", FILTER_ID);

            Transaction t1 = new Transaction("Cheap", new BigDecimal("30.00"), LocalDate.now(), TransactionType.EXPENSE, user);
            Transaction t2 = new Transaction("Exact", new BigDecimal("50.00"), LocalDate.now(), TransactionType.EXPENSE, user);
            Transaction t3 = new Transaction("Expensive", new BigDecimal("100.00"), LocalDate.now(), TransactionType.EXPENSE, user);

            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(f));
            when(transactionService.findFiltered(USER_ID, null, null, null, null, null))
                    .thenReturn(List.of(t1, t2, t3));

            List<Transaction> result = filterService.applyFilter(USER_ID, FILTER_ID);

            assertEquals(2, result.size());
            assertTrue(result.contains(t1));
            assertTrue(result.contains(t2));
        }

        @Test
        @DisplayName("filters by specificDates in-memory")
        void filtersBySpecificDates() throws InstanceNotFoundException {
            LocalDate target = LocalDate.of(2025, 3, 15);
            String def = "{\"specificDates\":[\"" + target + "\"]}";
            Filter f = new Filter("Dates", def, user);
            setFieldViaReflection(f, "id", FILTER_ID);

            Transaction tMatch = new Transaction("Match", new BigDecimal("10"), target, TransactionType.EXPENSE, user);
            Transaction tNoMatch = new Transaction("NoMatch", new BigDecimal("20"), target.plusDays(1), TransactionType.EXPENSE, user);

            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(f));
            when(transactionService.findFiltered(USER_ID, null, null, null, null, null))
                    .thenReturn(List.of(tMatch, tNoMatch));

            List<Transaction> result = filterService.applyFilter(USER_ID, FILTER_ID);

            assertEquals(1, result.size());
            assertEquals("Match", result.get(0).getName());
        }

        @Test
        @DisplayName("empty categoryIds array is ignored")
        void emptyCategoryIdsIgnored() throws InstanceNotFoundException {
            String def = "{\"categoryIds\":[]}";
            Filter f = new Filter("Empty", def, user);
            setFieldViaReflection(f, "id", FILTER_ID);

            Transaction t1 = new Transaction("A", new BigDecimal("10"), LocalDate.now(), TransactionType.EXPENSE, user);

            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(f));
            when(transactionService.findFiltered(USER_ID, null, null, null, null, null))
                    .thenReturn(List.of(t1));

            List<Transaction> result = filterService.applyFilter(USER_ID, FILTER_ID);
            assertEquals(1, result.size());
        }

        @Test
        @DisplayName("multi-filter: nameQuery + amountMin combined")
        void combinedFilters() throws InstanceNotFoundException {
            String def = "{\"nameQuery\":\"rent\",\"amountMin\":\"500.00\"}";
            Filter f = new Filter("Combined", def, user);
            setFieldViaReflection(f, "id", FILTER_ID);

            Transaction t1 = new Transaction("Rent Payment", new BigDecimal("800.00"), LocalDate.now(), TransactionType.EXPENSE, user);
            Transaction t2 = new Transaction("Rent cheap", new BigDecimal("100.00"), LocalDate.now(), TransactionType.EXPENSE, user);
            Transaction t3 = new Transaction("Groceries", new BigDecimal("700.00"), LocalDate.now(), TransactionType.EXPENSE, user);

            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(f));
            when(transactionService.findFiltered(USER_ID, null, null, null, null, null))
                    .thenReturn(List.of(t1, t2, t3));

            List<Transaction> result = filterService.applyFilter(USER_ID, FILTER_ID);

            assertEquals(1, result.size());
            assertEquals("Rent Payment", result.get(0).getName());
        }

        @Test
        @DisplayName("transaction with null category is excluded when categoryIds filter active")
        void nullCategoryExcluded() throws InstanceNotFoundException {
            UUID catId1 = UUID.randomUUID();
            UUID catId2 = UUID.randomUUID();
            String def = "{\"categoryIds\":[\"" + catId1 + "\",\"" + catId2 + "\"]}";
            Filter f = new Filter("Multi", def, user);
            setFieldViaReflection(f, "id", FILTER_ID);

            Transaction withCat = new Transaction("A", new BigDecimal("10"), LocalDate.now(), TransactionType.EXPENSE, user);
            Category cat = new Category("Food", TransactionType.EXPENSE, user);
            setFieldViaReflection(cat, "id", catId1);
            withCat.setCategory(cat);

            Transaction noCat = new Transaction("B", new BigDecimal("20"), LocalDate.now(), TransactionType.EXPENSE, user);
            // no category set

            when(filterDao.findByIdAndUserId(FILTER_ID, USER_ID)).thenReturn(Optional.of(f));
            when(transactionService.findFiltered(USER_ID, null, null, null, null, null))
                    .thenReturn(List.of(withCat, noCat));

            List<Transaction> result = filterService.applyFilter(USER_ID, FILTER_ID);

            assertEquals(1, result.size());
            assertEquals("A", result.get(0).getName());
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
