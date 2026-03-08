package Balio.web.rest.controllers;

import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.CategoryInvalidException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Category;
import Balio.web.model.entities.User;
import Balio.web.model.services.CategoryService;
import Balio.web.rest.common.CommonControllerAdvice;
import Balio.web.rest.dtos.CategoryConverter;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-layer unit tests for {@link CategoryController}.
 * <p>
 * Uses {@code MockMvcBuilders.standaloneSetup()} – no Spring context required.
 * Tests DTO validation, HTTP status codes, JSON payloads, and error handling.
 */
@ExtendWith(MockitoExtension.class)
class CategoryControllerTest {

    /* ───── constants ───── */
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID CATEGORY_ID = UUID.randomUUID();
    private static final String VALID_NAME = "Food";

    /* ───── mocks ───── */
    @Mock
    private CategoryService categoryService;

    /* ───── real collaborators ───── */
    private final CategoryConverter categoryConverter = new CategoryConverter();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private MockMvc mockMvc;

    /* ───── test entities ───── */
    private User testUser;
    private Category testCategory;

    @BeforeEach
    void setUp() {
        CategoryController controller = new CategoryController(categoryService, categoryConverter);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new CommonControllerAdvice())
                .build();

        testUser = new User("Nick", "nick@example.com", "encodedPwd");
        setFieldViaReflection(testUser, "id", USER_ID);

        testCategory = new Category(VALID_NAME, TransactionType.EXPENSE, testUser);
        setFieldViaReflection(testCategory, "id", CATEGORY_ID);
    }

    /* ═══════════════════════════════════════════════════════════
     *  POST /category/create
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("POST /category/create")
    class CreateCategoryEndpoint {

        @Test
        @DisplayName("201 – valid category returns created resource")
        void shouldReturn201_whenValidCategory() throws Exception {
            when(categoryService.createCategory(eq(USER_ID), eq(VALID_NAME), eq(TransactionType.EXPENSE)))
                    .thenReturn(testCategory);

            mockMvc.perform(post("/category/create")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(categoryJson(VALID_NAME, "EXPENSE")))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id", is(CATEGORY_ID.toString())))
                    .andExpect(jsonPath("$.name", is(VALID_NAME)))
                    .andExpect(jsonPath("$.type", is("EXPENSE")))
                    .andExpect(jsonPath("$.userId", is(USER_ID.toString())));
        }

        @Test
        @DisplayName("201 – INCOME category")
        void shouldReturn201_whenIncomeCategory() throws Exception {
            Category incomeCategory = new Category("Salary", TransactionType.INCOME, testUser);
            setFieldViaReflection(incomeCategory, "id", UUID.randomUUID());

            when(categoryService.createCategory(eq(USER_ID), eq("Salary"), eq(TransactionType.INCOME)))
                    .thenReturn(incomeCategory);

            mockMvc.perform(post("/category/create")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(categoryJson("Salary", "INCOME")))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.name", is("Salary")))
                    .andExpect(jsonPath("$.type", is("INCOME")));
        }

        @Test
        @DisplayName("400 – blank name")
        void shouldReturn400_whenBlankName() throws Exception {
            mockMvc.perform(post("/category/create")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(categoryJson("", "EXPENSE")))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – null name (missing)")
        void shouldReturn400_whenNullName() throws Exception {
            mockMvc.perform(post("/category/create")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(categoryJson(null, "EXPENSE")))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – name exceeds max length (60)")
        void shouldReturn400_whenNameTooLong() throws Exception {
            String longName = "A".repeat(61);
            mockMvc.perform(post("/category/create")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(categoryJson(longName, "EXPENSE")))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – empty body")
        void shouldReturn400_whenEmptyBody() throws Exception {
            mockMvc.perform(post("/category/create")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400/500 – invalid enum value for type (deserialization error)")
        void shouldReturnError_whenInvalidEnumType() throws Exception {
            // Jackson fails to deserialize an invalid enum value.
            // Without a HttpMessageNotReadableException handler in the advice,
            // this results in 500. Add such a handler to get a clean 400.
            mockMvc.perform(post("/category/create")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\":\"Food\",\"type\":\"INVALID_TYPE\"}"))
                    .andExpect(status().isInternalServerError());
        }

        @Test
        @DisplayName("404 – UserNotFoundException")
        void shouldReturn404_whenUserNotFound() throws Exception {
            when(categoryService.createCategory(eq(USER_ID), eq(VALID_NAME), eq(TransactionType.EXPENSE)))
                    .thenThrow(new UserNotFoundException("User not found"));

            mockMvc.perform(post("/category/create")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(categoryJson(VALID_NAME, "EXPENSE")))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code", is("project.exceptions.InstanceNotFoundException")));
        }

        @Test
        @DisplayName("400 – CategoryInvalidException (business rule violation)")
        void shouldReturn400_whenCategoryInvalid() throws Exception {
            when(categoryService.createCategory(eq(USER_ID), eq(VALID_NAME), isNull()))
                    .thenThrow(new CategoryInvalidException("Category type is required"));

            mockMvc.perform(post("/category/create")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(categoryJson(VALID_NAME, null)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code", is("project.exceptions.CategoryInvalidException")));
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  PUT /category/{categoryId}
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("PUT /category/{categoryId}")
    class UpdateCategoryEndpoint {

        @Test
        @DisplayName("200 – valid update returns updated category")
        void shouldReturn200_whenValidUpdate() throws Exception {
            Category updated = new Category("Transport", TransactionType.INCOME, testUser);
            setFieldViaReflection(updated, "id", CATEGORY_ID);

            when(categoryService.modifyCategory(
                    eq(USER_ID), eq(CATEGORY_ID), eq("Transport"), eq(TransactionType.INCOME)))
                    .thenReturn(updated);

            mockMvc.perform(put("/category/{categoryId}", CATEGORY_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(categoryJson("Transport", "INCOME")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(CATEGORY_ID.toString())))
                    .andExpect(jsonPath("$.name", is("Transport")))
                    .andExpect(jsonPath("$.type", is("INCOME")));
        }

        @Test
        @DisplayName("404 – category not found")
        void shouldReturn404_whenCategoryNotFound() throws Exception {
            when(categoryService.modifyCategory(
                    eq(USER_ID), eq(CATEGORY_ID), eq(VALID_NAME), eq(TransactionType.EXPENSE)))
                    .thenThrow(new InstanceNotFoundException("Category", CATEGORY_ID));

            mockMvc.perform(put("/category/{categoryId}", CATEGORY_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(categoryJson(VALID_NAME, "EXPENSE")))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code", is("project.exceptions.InstanceNotFoundException")));
        }

        @Test
        @DisplayName("400 – blank name on update")
        void shouldReturn400_whenBlankNameOnUpdate() throws Exception {
            mockMvc.perform(put("/category/{categoryId}", CATEGORY_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(categoryJson("", "EXPENSE")))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – name too long on update")
        void shouldReturn400_whenNameTooLongOnUpdate() throws Exception {
            String longName = "A".repeat(61);
            mockMvc.perform(put("/category/{categoryId}", CATEGORY_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(categoryJson(longName, "EXPENSE")))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – empty body on update")
        void shouldReturn400_whenEmptyBodyOnUpdate() throws Exception {
            mockMvc.perform(put("/category/{categoryId}", CATEGORY_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400/500 – invalid enum type on update (deserialization error)")
        void shouldReturnError_whenInvalidEnumTypeOnUpdate() throws Exception {
            // Jackson fails to deserialize an invalid enum value.
            // Without a HttpMessageNotReadableException handler in the advice,
            // this results in 500. Add such a handler to get a clean 400.
            mockMvc.perform(put("/category/{categoryId}", CATEGORY_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\":\"Food\",\"type\":\"BAD_VALUE\"}"))
                    .andExpect(status().isInternalServerError());
        }

        @Test
        @DisplayName("400 – CategoryInvalidException on update (blank name from service)")
        void shouldReturn400_whenCategoryInvalidOnUpdate() throws Exception {
            when(categoryService.modifyCategory(
                    eq(USER_ID), eq(CATEGORY_ID), eq(VALID_NAME), eq(TransactionType.EXPENSE)))
                    .thenThrow(new CategoryInvalidException("Category name cannot be blank"));

            mockMvc.perform(put("/category/{categoryId}", CATEGORY_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(categoryJson(VALID_NAME, "EXPENSE")))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code", is("project.exceptions.CategoryInvalidException")));
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  DELETE /category/{categoryId}
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("DELETE /category/{categoryId}")
    class DeleteCategoryEndpoint {

        @Test
        @DisplayName("204 – successful delete")
        void shouldReturn204_whenDeleteSuccessful() throws Exception {
            mockMvc.perform(delete("/category/{categoryId}", CATEGORY_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNoContent());

            verify(categoryService).deleteCategory(USER_ID, CATEGORY_ID);
        }

        @Test
        @DisplayName("404 – category not found on delete")
        void shouldReturn404_whenCategoryNotFoundOnDelete() throws Exception {
            doThrow(new InstanceNotFoundException("Category", CATEGORY_ID))
                    .when(categoryService).deleteCategory(USER_ID, CATEGORY_ID);

            mockMvc.perform(delete("/category/{categoryId}", CATEGORY_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code", is("project.exceptions.InstanceNotFoundException")));
        }

        @Test
        @DisplayName("404 – category belongs to another user (ownership failure)")
        void shouldReturn404_whenCategoryBelongsToAnotherUser() throws Exception {
            doThrow(new InstanceNotFoundException("Category", CATEGORY_ID))
                    .when(categoryService).deleteCategory(USER_ID, CATEGORY_ID);

            mockMvc.perform(delete("/category/{categoryId}", CATEGORY_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  GET /category
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("GET /category")
    class ListCategoriesEndpoint {

        @Test
        @DisplayName("200 – returns all categories as summary DTOs")
        void shouldReturn200_withCategorySummaries() throws Exception {
            Category cat1 = new Category("A-Category", TransactionType.EXPENSE, testUser);
            setFieldViaReflection(cat1, "id", UUID.randomUUID());
            Category cat2 = new Category("B-Category", TransactionType.INCOME, testUser);
            setFieldViaReflection(cat2, "id", UUID.randomUUID());

            when(categoryService.findAllByUserId(USER_ID)).thenReturn(List.of(cat1, cat2));

            mockMvc.perform(get("/category")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)))
                    .andExpect(jsonPath("$[0].name", is("A-Category")))
                    .andExpect(jsonPath("$[1].name", is("B-Category")))
                    .andExpect(jsonPath("$[0].id").exists())
                    .andExpect(jsonPath("$[0].type").exists());
        }

        @Test
        @DisplayName("200 – returns empty list when no categories")
        void shouldReturn200_whenNoCategories() throws Exception {
            when(categoryService.findAllByUserId(USER_ID)).thenReturn(List.of());

            mockMvc.perform(get("/category")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  GET /category/{categoryId}
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("GET /category/{categoryId}")
    class GetCategoryEndpoint {

        @Test
        @DisplayName("200 – returns full category detail")
        void shouldReturn200_whenCategoryFound() throws Exception {
            when(categoryService.findByIdAndUserId(CATEGORY_ID, USER_ID)).thenReturn(testCategory);

            mockMvc.perform(get("/category/{categoryId}", CATEGORY_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(CATEGORY_ID.toString())))
                    .andExpect(jsonPath("$.name", is(VALID_NAME)))
                    .andExpect(jsonPath("$.type", is("EXPENSE")))
                    .andExpect(jsonPath("$.userId", is(USER_ID.toString())));
        }

        @Test
        @DisplayName("404 – category not found")
        void shouldReturn404_whenCategoryNotFound() throws Exception {
            when(categoryService.findByIdAndUserId(CATEGORY_ID, USER_ID))
                    .thenThrow(new InstanceNotFoundException("Category", CATEGORY_ID));

            mockMvc.perform(get("/category/{categoryId}", CATEGORY_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code", is("project.exceptions.InstanceNotFoundException")));
        }

        @Test
        @DisplayName("404 – category belongs to another user")
        void shouldReturn404_whenCategoryBelongsToAnotherUser() throws Exception {
            when(categoryService.findByIdAndUserId(CATEGORY_ID, USER_ID))
                    .thenThrow(new InstanceNotFoundException("Category", CATEGORY_ID));

            mockMvc.perform(get("/category/{categoryId}", CATEGORY_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  Helpers
     * ═══════════════════════════════════════════════════════════ */

    /**
     * Builds a CategoryDto JSON string with optional fields.
     */
    private String categoryJson(String name, String type) throws Exception {
        Map<String, Object> map = new HashMap<>();
        if (name != null) map.put("name", name);
        if (type != null) map.put("type", type);
        return objectMapper.writeValueAsString(map);
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
