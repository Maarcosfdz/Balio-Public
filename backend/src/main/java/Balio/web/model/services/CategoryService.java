package Balio.web.model.services;

import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.Category;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

/**
 * Defines the contract for category-related operations.
 * Categories belong to the user who created them; only the owner
 * can create, modify or delete their categories.
 */
public interface CategoryService {

    /**
     * Creates a new category for the user.
     *
     * @param userId the owner
     * @param name   category name
     * @param type   EXPENSE or INCOME
     * @return the persisted category
     * @throws Balio.web.model.Exceptions.UserNotFoundException if the user does not exist (unchecked)
     */
    Category createCategory(UUID userId, String name, TransactionType type);

    /**
     * Deletes a category owned by the user.
     *
     * @throws InstanceNotFoundException if the category does not exist or does not belong to the user
     */
    void deleteCategory(UUID userId, UUID categoryId) throws InstanceNotFoundException;

    /**
     * Modifies the fields of an existing category. Only non-null parameters are applied.
     *
     * @throws InstanceNotFoundException if the category does not exist or does not belong to the user
     */
    Category modifyCategory(UUID userId, UUID categoryId, String name, TransactionType type)
            throws InstanceNotFoundException;

    /**
     * Returns all categories belonging to the user, ordered by name.
     */
    List<Category> findAllByUserId(UUID userId);

    /**
     * Returns a paginated list of categories for the user, optionally filtered by type.
     */
    Page<Category> findPagedByUserId(UUID userId, TransactionType type, Pageable pageable);

    /**
     * Returns a single category belonging to the user.
     *
     * @throws InstanceNotFoundException if the category does not exist or does not belong to the user
     */
    Category findByIdAndUserId(UUID categoryId, UUID userId) throws InstanceNotFoundException;

}
