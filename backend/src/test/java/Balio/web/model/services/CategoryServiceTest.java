package Balio.web.model.services;

import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.CategoryInvalidException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Category;
import Balio.web.model.entities.CategoryDao;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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

/**
 * Unit tests for {@link CategoryServiceImpl}.
 * <p>
 * Uses Mockito (no Spring context) to test business rules, ownership checks,
 * validation, and exception flows in isolation.
 */
@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    /* ───── shared constants ───── */
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID CATEGORY_ID = UUID.randomUUID();
    private static final String VALID_NAME = "Food";

    @Mock
    private UserDao userDao;

    @Mock
    private CategoryDao categoryDao;

    @InjectMocks
    private CategoryServiceImpl categoryService;

    private User user;
    private Category existingCategory;

    @BeforeEach
    void setUp() {
        user = new User("Nick", "nick@example.com", "encodedPwd");
        setFieldViaReflection(user, "id", USER_ID);

        existingCategory = new Category(VALID_NAME, TransactionType.EXPENSE, user);
        setFieldViaReflection(existingCategory, "id", CATEGORY_ID);
    }

    /* ═══════════════════════════════════════════════════════════
     *  createCategory
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("createCategory")
    class CreateCategoryTests {

        @Test
        @DisplayName("should create category when data is valid")
        void shouldCreateCategory_whenValidData() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            Category result = categoryService.createCategory(USER_ID, VALID_NAME, TransactionType.EXPENSE);

            assertNotNull(result);
            assertEquals(VALID_NAME, result.getName());
            assertEquals(TransactionType.EXPENSE, result.getType());
            assertEquals(user, result.getUser());

            ArgumentCaptor<Category> captor = ArgumentCaptor.forClass(Category.class);
            verify(categoryDao).save(captor.capture());
            assertEquals(VALID_NAME, captor.getValue().getName());
        }

        @Test
        @DisplayName("should create INCOME category correctly")
        void shouldCreateIncomeCategory() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            Category result = categoryService.createCategory(USER_ID, "Salary", TransactionType.INCOME);

            assertEquals(TransactionType.INCOME, result.getType());
            assertEquals("Salary", result.getName());
            verify(categoryDao).save(any(Category.class));
        }

        @Test
        @DisplayName("should throw UserNotFoundException when user does not exist")
        void shouldThrowUserNotFound_whenUserDoesNotExist() {
            UUID unknownUserId = UUID.randomUUID();
            when(userDao.findById(unknownUserId)).thenReturn(Optional.empty());

            assertThrows(UserNotFoundException.class,
                    () -> categoryService.createCategory(unknownUserId, VALID_NAME, TransactionType.EXPENSE));

            verify(categoryDao, never()).save(any());
        }

        @Test
        @DisplayName("should throw CategoryInvalidException when type is null")
        void shouldThrowCategoryInvalid_whenTypeNull() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            CategoryInvalidException ex = assertThrows(CategoryInvalidException.class,
                    () -> categoryService.createCategory(USER_ID, VALID_NAME, null));

            assertEquals("Category type is required", ex.getMessage());
            verify(categoryDao, never()).save(any());
        }

        @ParameterizedTest(name = "should throw CategoryInvalidException when name is \"{0}\"")
        @NullAndEmptySource
        @ValueSource(strings = {"   ", "\t", "\n"})
        @DisplayName("should throw CategoryInvalidException for blank/null name")
        void shouldThrowCategoryInvalid_whenNameBlank(String badName) {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(user));

            CategoryInvalidException ex = assertThrows(CategoryInvalidException.class,
                    () -> categoryService.createCategory(USER_ID, badName, TransactionType.EXPENSE));

            assertEquals("Category name cannot be blank", ex.getMessage());
            verify(categoryDao, never()).save(any());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  deleteCategory
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("deleteCategory")
    class DeleteCategoryTests {

        @Test
        @DisplayName("should delete category when it exists and belongs to user")
        void shouldDeleteCategory_whenExistsAndOwned() throws InstanceNotFoundException {
            when(categoryDao.findByIdAndUserId(CATEGORY_ID, USER_ID))
                    .thenReturn(Optional.of(existingCategory));

            categoryService.deleteCategory(USER_ID, CATEGORY_ID);

            verify(categoryDao).delete(existingCategory);
        }

        @Test
        @DisplayName("should throw InstanceNotFoundException when category does not exist")
        void shouldThrowInstanceNotFound_whenCategoryDoesNotExist() {
            UUID unknownCatId = UUID.randomUUID();
            when(categoryDao.findByIdAndUserId(unknownCatId, USER_ID))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> categoryService.deleteCategory(USER_ID, unknownCatId));

            verify(categoryDao, never()).delete(any());
        }

        @Test
        @DisplayName("should throw InstanceNotFoundException when category belongs to another user")
        void shouldThrowInstanceNotFound_whenCategoryBelongsToAnotherUser() {
            UUID otherUserId = UUID.randomUUID();
            when(categoryDao.findByIdAndUserId(CATEGORY_ID, otherUserId))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> categoryService.deleteCategory(otherUserId, CATEGORY_ID));

            verify(categoryDao, never()).delete(any());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  modifyCategory
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("modifyCategory")
    class ModifyCategoryTests {

        @Test
        @DisplayName("should update name and type when both provided")
        void shouldModifyCategory_whenBothFieldsProvided() throws InstanceNotFoundException {
            when(categoryDao.findByIdAndUserId(CATEGORY_ID, USER_ID))
                    .thenReturn(Optional.of(existingCategory));

            Category result = categoryService.modifyCategory(
                    USER_ID, CATEGORY_ID, "Transport", TransactionType.INCOME);

            assertEquals("Transport", result.getName());
            assertEquals(TransactionType.INCOME, result.getType());
            verify(categoryDao).save(existingCategory);
        }

        @Test
        @DisplayName("should update only name when type is null")
        void shouldModifyOnlyName_whenTypeNull() throws InstanceNotFoundException {
            when(categoryDao.findByIdAndUserId(CATEGORY_ID, USER_ID))
                    .thenReturn(Optional.of(existingCategory));

            Category result = categoryService.modifyCategory(
                    USER_ID, CATEGORY_ID, "New Name", null);

            assertEquals("New Name", result.getName());
            assertEquals(TransactionType.EXPENSE, result.getType()); // unchanged
            verify(categoryDao).save(existingCategory);
        }

        @Test
        @DisplayName("should update only type when name is null")
        void shouldModifyOnlyType_whenNameNull() throws InstanceNotFoundException {
            when(categoryDao.findByIdAndUserId(CATEGORY_ID, USER_ID))
                    .thenReturn(Optional.of(existingCategory));

            Category result = categoryService.modifyCategory(
                    USER_ID, CATEGORY_ID, null, TransactionType.INCOME);

            assertEquals(VALID_NAME, result.getName()); // unchanged
            assertEquals(TransactionType.INCOME, result.getType());
            verify(categoryDao).save(existingCategory);
        }

        @Test
        @DisplayName("should throw InstanceNotFoundException when category does not exist")
        void shouldThrowInstanceNotFound_whenCategoryNotFound() {
            UUID unknownCatId = UUID.randomUUID();
            when(categoryDao.findByIdAndUserId(unknownCatId, USER_ID))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> categoryService.modifyCategory(
                            USER_ID, unknownCatId, "New Name", TransactionType.EXPENSE));

            verify(categoryDao, never()).save(any());
        }

        @Test
        @DisplayName("should throw InstanceNotFoundException when category belongs to another user")
        void shouldThrowInstanceNotFound_whenCategoryBelongsToAnotherUser() {
            UUID otherUserId = UUID.randomUUID();
            when(categoryDao.findByIdAndUserId(CATEGORY_ID, otherUserId))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> categoryService.modifyCategory(
                            otherUserId, CATEGORY_ID, "New Name", TransactionType.EXPENSE));

            verify(categoryDao, never()).save(any());
        }

        @ParameterizedTest(name = "should throw CategoryInvalidException when name is \"{0}\"")
        @ValueSource(strings = {"   ", "\t", "\n", ""})
        @DisplayName("should throw CategoryInvalidException for blank name on modify")
        void shouldThrowCategoryInvalid_whenNameBlank(String blankName) {
            when(categoryDao.findByIdAndUserId(CATEGORY_ID, USER_ID))
                    .thenReturn(Optional.of(existingCategory));

            CategoryInvalidException ex = assertThrows(CategoryInvalidException.class,
                    () -> categoryService.modifyCategory(
                            USER_ID, CATEGORY_ID, blankName, TransactionType.EXPENSE));

            assertEquals("Category name cannot be blank", ex.getMessage());
            verify(categoryDao, never()).save(any());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  findAllByUserId
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("findAllByUserId")
    class FindAllByUserIdTests {

        @Test
        @DisplayName("should return all categories for user ordered by name")
        void shouldReturnAllCategories_whenUserHasCategories() {
            Category cat1 = new Category("A-Category", TransactionType.EXPENSE, user);
            Category cat2 = new Category("B-Category", TransactionType.INCOME, user);

            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID))
                    .thenReturn(List.of(cat1, cat2));

            List<Category> result = categoryService.findAllByUserId(USER_ID);

            assertEquals(2, result.size());
            assertEquals("A-Category", result.get(0).getName());
            assertEquals("B-Category", result.get(1).getName());
        }

        @Test
        @DisplayName("should return empty list when user has no categories")
        void shouldReturnEmptyList_whenNoCategoriesExist() {
            when(categoryDao.findAllByUserIdOrderByNameAsc(USER_ID))
                    .thenReturn(List.of());

            List<Category> result = categoryService.findAllByUserId(USER_ID);

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
        @DisplayName("should return category when found and belongs to user")
        void shouldReturnCategory_whenFound() throws InstanceNotFoundException {
            when(categoryDao.findByIdAndUserId(CATEGORY_ID, USER_ID))
                    .thenReturn(Optional.of(existingCategory));

            Category result = categoryService.findByIdAndUserId(CATEGORY_ID, USER_ID);

            assertNotNull(result);
            assertEquals(VALID_NAME, result.getName());
            assertEquals(CATEGORY_ID, result.getId());
        }

        @Test
        @DisplayName("should throw InstanceNotFoundException when category does not exist")
        void shouldThrowInstanceNotFound_whenCategoryDoesNotExist() {
            UUID unknownCatId = UUID.randomUUID();
            when(categoryDao.findByIdAndUserId(unknownCatId, USER_ID))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> categoryService.findByIdAndUserId(unknownCatId, USER_ID));
        }

        @Test
        @DisplayName("should throw InstanceNotFoundException when category belongs to another user")
        void shouldThrowInstanceNotFound_whenCategoryBelongsToAnotherUser() {
            UUID otherUserId = UUID.randomUUID();
            when(categoryDao.findByIdAndUserId(CATEGORY_ID, otherUserId))
                    .thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> categoryService.findByIdAndUserId(CATEGORY_ID, otherUserId));
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
