package Balio.web.model.services;

import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.BankTransactionRule;
import Balio.web.model.entities.BankTransactionRuleDao;
import Balio.web.model.entities.Category;
import Balio.web.model.entities.CategoryDao;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class BankRuleServiceImpl implements BankRuleService {

    private final UserDao userDao;
    private final CategoryDao categoryDao;
    private final BankTransactionRuleDao ruleDao;

    public BankRuleServiceImpl(UserDao userDao, CategoryDao categoryDao,
                               BankTransactionRuleDao ruleDao) {
        this.userDao = userDao;
        this.categoryDao = categoryDao;
        this.ruleDao = ruleDao;
    }

    @Override
    public BankTransactionRule createRule(UUID userId, String namePattern, String bankCategory,
                                          String mappedName, UUID mappedCategoryId, int priority) {

        User user = userDao.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        Category category = resolveCategory(mappedCategoryId, userId);

        BankTransactionRule rule = new BankTransactionRule(
                user, namePattern, bankCategory, mappedName, category, priority);
        ruleDao.save(rule);
        return rule;
    }

    @Override
    public BankTransactionRule updateRule(UUID userId, UUID ruleId, String namePattern,
                                          String bankCategory, String mappedName,
                                          UUID mappedCategoryId, Integer priority)
            throws InstanceNotFoundException {

        BankTransactionRule rule = ruleDao.findByIdAndUserId(ruleId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("BankTransactionRule", ruleId));

        if (namePattern != null) {
            rule.setNamePattern(namePattern);
        }
        if (bankCategory != null) {
            rule.setBankCategory(bankCategory);
        }
        if (mappedName != null) {
            rule.setMappedName(mappedName);
        }
        if (mappedCategoryId != null) {
            rule.setMappedCategory(resolveCategory(mappedCategoryId, userId));
        }
        if (priority != null) {
            rule.setPriority(priority);
        }

        ruleDao.save(rule);
        return rule;
    }

    @Override
    public void deleteRule(UUID userId, UUID ruleId) throws InstanceNotFoundException {
        BankTransactionRule rule = ruleDao.findByIdAndUserId(ruleId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("BankTransactionRule", ruleId));
        ruleDao.delete(rule);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BankTransactionRule> findAllByUserId(UUID userId) {
        return ruleDao.findAllByUserIdOrderByPriorityDesc(userId);
    }

    private Category resolveCategory(UUID categoryId, UUID userId) {
        if (categoryId == null) {
            return null;
        }
        return categoryDao.findByIdAndUserId(categoryId, userId).orElse(null);
    }
}
