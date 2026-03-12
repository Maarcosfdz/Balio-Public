package Balio.web.model.services;

import Balio.web.enums.AccountType;
import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.AccountDao;
import Balio.web.model.entities.BankTransactionRule;
import Balio.web.model.entities.BankTransactionRuleDao;
import Balio.web.model.entities.Category;
import Balio.web.model.entities.CategoryDao;
import Balio.web.model.entities.Transaction;
import Balio.web.model.entities.TransactionDao;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class BankRuleServiceImpl implements BankRuleService {

    private final UserDao userDao;
    private final AccountDao accountDao;
    private final CategoryDao categoryDao;
    private final BankTransactionRuleDao ruleDao;
    private final TransactionDao transactionDao;

    public BankRuleServiceImpl(UserDao userDao, AccountDao accountDao, CategoryDao categoryDao,
                               BankTransactionRuleDao ruleDao, TransactionDao transactionDao) {
        this.userDao = userDao;
        this.accountDao = accountDao;
        this.categoryDao = categoryDao;
        this.ruleDao = ruleDao;
        this.transactionDao = transactionDao;
    }

    @Override
    public RuleCreationResult createRule(UUID userId, UUID accountId, String namePattern,
                                         String bankCategory, TransactionType transactionType,
                                         String mappedName, UUID mappedCategoryId,
                                         boolean applyToExisting, Integer applyWindowDays)
            throws InstanceNotFoundException {

        User user = userDao.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        Account account = resolveBankAccount(accountId, userId);

        validateRulePayload(namePattern, bankCategory, mappedName, mappedCategoryId);

        Category category = resolveCategory(mappedCategoryId, userId);
        String normalizedNamePattern = normalize(namePattern);
        String normalizedBankCategory = normalize(bankCategory);
        String normalizedMappedName = normalize(mappedName);
        int computedPriority = calculatePriority(
                normalizedNamePattern, normalizedBankCategory, transactionType);

        BankTransactionRule rule = new BankTransactionRule(
                user, account, normalizedNamePattern, normalizedBankCategory,
                transactionType, normalizedMappedName, category, computedPriority);
        ruleDao.save(rule);

        int appliedTransactions = applyToExisting
                ? applyRulesToExistingTransactions(userId, accountId, applyWindowDays)
                : 0;

        return new RuleCreationResult(rule, appliedTransactions);
    }

    @Override
    public RuleUpdateResult updateRule(UUID userId, UUID accountId, UUID ruleId, String namePattern,
                                       String bankCategory, TransactionType transactionType,
                                       String mappedName, UUID mappedCategoryId,
                                       boolean applyToExisting, Integer applyWindowDays)
            throws InstanceNotFoundException {

        resolveBankAccount(accountId, userId);

        BankTransactionRule rule = ruleDao.findByIdAndUserIdAndAccountId(ruleId, userId, accountId)
                .orElseThrow(() -> new InstanceNotFoundException("BankTransactionRule", ruleId));

        if (namePattern != null) {
            rule.setNamePattern(normalize(namePattern));
        }
        if (bankCategory != null) {
            rule.setBankCategory(normalize(bankCategory));
        }
        rule.setTransactionType(transactionType);
        if (mappedName != null) {
            rule.setMappedName(normalize(mappedName));
        }
        if (mappedCategoryId != null) {
            rule.setMappedCategory(resolveCategory(mappedCategoryId, userId));
        }

        rule.setPriority(calculatePriority(
                rule.getNamePattern(), rule.getBankCategory(), rule.getTransactionType()));

        ruleDao.save(rule);
        int appliedTransactions = applyToExisting
            ? applyRulesToExistingTransactions(userId, accountId, applyWindowDays)
            : 0;

        return new RuleUpdateResult(rule, appliedTransactions);
    }

    @Override
    public void deleteRule(UUID userId, UUID accountId, UUID ruleId) throws InstanceNotFoundException {
        resolveBankAccount(accountId, userId);
        BankTransactionRule rule = ruleDao.findByIdAndUserIdAndAccountId(ruleId, userId, accountId)
                .orElseThrow(() -> new InstanceNotFoundException("BankTransactionRule", ruleId));
        ruleDao.delete(rule);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BankTransactionRule> findAllByUserIdAndAccountId(UUID userId, UUID accountId)
            throws InstanceNotFoundException {
        resolveBankAccount(accountId, userId);
        return ruleDao.findAllByUserIdAndAccountIdOrderByPriorityDesc(userId, accountId);
    }

    private Account resolveBankAccount(UUID accountId, UUID userId) throws InstanceNotFoundException {
        Account account = accountDao.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Account", accountId));
        if (account.getType() != AccountType.BANK) {
            throw new IllegalArgumentException("Only BANK accounts can have bank rules");
        }
        return account;
    }

    private void validateRulePayload(String namePattern, String bankCategory,
                                     String mappedName, UUID mappedCategoryId) {
        if (normalize(namePattern) == null && normalize(bankCategory) == null) {
            throw new IllegalArgumentException("A rule must define a name pattern or bank category");
        }
        if (normalize(mappedName) == null && mappedCategoryId == null) {
            throw new IllegalArgumentException("A rule must map a name or a category");
        }
    }

    private int applyRulesToExistingTransactions(UUID userId, UUID accountId, Integer applyWindowDays) {
        List<BankTransactionRule> rules = ruleDao.findAllByUserIdAndAccountIdOrderByPriorityDesc(userId, accountId);
        List<Transaction> transactions = transactionDao.findAllByUserIdAndAccountIdOrderByDateDesc(userId, accountId);
        LocalDate cutoffDate = resolveCutoffDate(applyWindowDays);

        int updated = 0;
        for (Transaction transaction : transactions) {
            if (cutoffDate != null && transaction.getDate().isBefore(cutoffDate)) {
                continue;
            }
            if (applyRules(transaction, rules)) {
                updated++;
            }
        }
        return updated;
    }

    private boolean applyRules(Transaction transaction, List<BankTransactionRule> rules) {
        String originalName = transaction.getName();
        String resolvedName = originalName;
        Category resolvedCategory = null;

        for (BankTransactionRule rule : rules) {
            if (matches(rule, originalName, transaction.getBankCategory(), transaction.getType())) {
                if (normalize(rule.getMappedName()) != null) {
                    resolvedName = rule.getMappedName();
                }
                resolvedCategory = rule.getMappedCategory();
                break;
            }
        }

        boolean changed = false;
        if (!resolvedName.equals(transaction.getName())) {
            transaction.setName(resolvedName);
            changed = true;
        }
        if (transaction.getCategory() != resolvedCategory) {
            transaction.setCategory(resolvedCategory);
            changed = true;
        }

        return changed;
    }

    private boolean matches(BankTransactionRule rule, String name, String bankCategory,
                            TransactionType transactionType) {
        String normalizedName = name != null ? name.toLowerCase() : "";
        String normalizedCategory = bankCategory != null ? bankCategory.toLowerCase() : null;

        boolean matchesName = rule.getNamePattern() == null
                || normalizedName.contains(rule.getNamePattern().toLowerCase());
        boolean matchesCategory = rule.getBankCategory() == null
                || (normalizedCategory != null
                && normalizedCategory.equals(rule.getBankCategory().toLowerCase()));
        boolean matchesType = rule.getTransactionType() == null
                || rule.getTransactionType() == transactionType;

        return matchesName && matchesCategory && matchesType;
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private int calculatePriority(String namePattern, String bankCategory,
                                  TransactionType transactionType) {
        int score = 0;
        if (bankCategory != null) {
            score += 1_000;
        }
        if (transactionType != null) {
            score += 250;
        }
        if (namePattern != null) {
            score += Math.min(namePattern.length(), 500);
        }
        return score;
    }

    private LocalDate resolveCutoffDate(Integer applyWindowDays) {
        if (applyWindowDays == null || applyWindowDays <= 0) {
            return null;
        }
        return LocalDate.now().minusDays(applyWindowDays.longValue());
    }

    private Category resolveCategory(UUID categoryId, UUID userId) {
        if (categoryId == null) {
            return null;
        }
        return categoryDao.findByIdAndUserId(categoryId, userId).orElse(null);
    }
}
