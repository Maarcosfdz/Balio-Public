package Balio.web.model.services;

import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.CategoryInvalidException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Category;
import Balio.web.model.entities.CategoryDao;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;
import Balio.web.util.StringUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class CategoryServiceImpl implements CategoryService {

    private final UserDao userDao;
    private final CategoryDao categoryDao;

    public CategoryServiceImpl(UserDao userDao, CategoryDao categoryDao) {
        this.userDao = userDao;
        this.categoryDao = categoryDao;
    }

    @Override
    public Category createCategory(UUID userId, String name, TransactionType type,
                                   String iconName, String iconBgColor) {

        User user = userDao.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        if (name == null || name.isBlank()) {
            throw new CategoryInvalidException("Category name cannot be blank");
        }
        if (type == null) {
            throw new CategoryInvalidException("Category type is required");
        }

        Category category = new Category(
                name.trim(), type, user,
                StringUtils.sanitizeOptional(iconName), StringUtils.sanitizeOptional(iconBgColor));
        categoryDao.save(category);

        return category;
    }

    @Override
    public Category createCategory(UUID userId, String name, TransactionType type) {
        return createCategory(userId, name, type, null, null);
    }

    @Override
    public void deleteCategory(UUID userId, UUID categoryId) throws InstanceNotFoundException {

        Category category = categoryDao.findByIdAndUserId(categoryId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Category", categoryId));

        categoryDao.delete(category);
    }

    @Override
    public Category modifyCategory(UUID userId, UUID categoryId, String name, TransactionType type,
                                   String iconName, String iconBgColor)
            throws InstanceNotFoundException {

        Category category = categoryDao.findByIdAndUserId(categoryId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Category", categoryId));

        if (name != null) {
            if (name.isBlank()) {
                throw new CategoryInvalidException("Category name cannot be blank");
            }
            category.setName(name.trim());
        }
        if (type != null) {
            category.setType(type);
        }
        if (iconName != null) {
            category.setIconName(StringUtils.sanitizeOptional(iconName));
        }
        if (iconBgColor != null) {
            category.setIconBgColor(StringUtils.sanitizeOptional(iconBgColor));
        }

        categoryDao.save(category);
        return category;
    }

    @Override
    public Category modifyCategory(UUID userId, UUID categoryId, String name, TransactionType type)
            throws InstanceNotFoundException {
        return modifyCategory(userId, categoryId, name, type, null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Category> findAllByUserId(UUID userId) {
        return categoryDao.findAllByUserIdOrderByNameAsc(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<Category> findPagedByUserId(UUID userId, TransactionType type, Pageable pageable) {
        if (type != null) {
            return categoryDao.findAllByUserIdAndTypeOrderByNameAsc(userId, type, pageable);
        }
        return categoryDao.findAllByUserIdOrderByNameAsc(userId, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Category findByIdAndUserId(UUID categoryId, UUID userId) throws InstanceNotFoundException {
        return categoryDao.findByIdAndUserId(categoryId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Category", categoryId));
    }

}
