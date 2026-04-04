package Balio.web.model.services;

import Balio.web.enablebanking.EnableBankingClient;
import Balio.web.enablebanking.EnableBankingSyncService;
import Balio.web.enums.AccountType;
import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.AccountInvalidException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.AccountDao;
import Balio.web.model.entities.BankConnection;
import Balio.web.model.entities.BankConnectionDao;
import Balio.web.model.entities.BankTransactionRule;
import Balio.web.model.entities.BankTransactionRuleDao;
import Balio.web.model.entities.Category;
import Balio.web.model.entities.CategoryDao;
import Balio.web.model.entities.Transaction;
import Balio.web.model.entities.TransactionDao;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class BankServiceImpl implements BankService {

    private static final Logger log = LoggerFactory.getLogger(BankServiceImpl.class);

    private final AccountDao accountDao;
    private final BankConnectionDao bankConnectionDao;
    private final EnableBankingClient enableBankingClient;
    private final EnableBankingSyncService enableBankingSyncService;
    private final UserDao userDao;
    private final CategoryDao categoryDao;
    private final BankTransactionRuleDao ruleDao;
    private final TransactionDao transactionDao;

    public BankServiceImpl(AccountDao accountDao,
                           BankConnectionDao bankConnectionDao,
                           EnableBankingClient enableBankingClient,
                           EnableBankingSyncService enableBankingSyncService,
                           UserDao userDao,
                           CategoryDao categoryDao,
                           BankTransactionRuleDao ruleDao,
                           TransactionDao transactionDao) {
        this.accountDao = accountDao;
        this.bankConnectionDao = bankConnectionDao;
        this.enableBankingClient = enableBankingClient;
        this.enableBankingSyncService = enableBankingSyncService;
        this.userDao = userDao;
        this.categoryDao = categoryDao;
        this.ruleDao = ruleDao;
        this.transactionDao = transactionDao;
    }

    // ── SYNC ─────────────────────────────────────────────────────────────

    @Override
    public int syncTransactions(UUID userId, UUID accountId) throws InstanceNotFoundException {
        return syncTransactions(userId, accountId, 90);
    }

    @Override
    public int syncTransactions(UUID userId, UUID accountId, int lookBackDays) throws InstanceNotFoundException {
        BankConnection connection = bankConnectionDao.findByAccountIdAndUserId(accountId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("BankConnection", accountId));

        return enableBankingSyncService.sync(connection, lookBackDays);
    }

    @Override
    public int syncStaleConnections(UUID userId, int staleMinutes) {
        Instant threshold = Instant.now().minus(staleMinutes, ChronoUnit.MINUTES);
        int imported = 0;
        for (BankConnection connection : bankConnectionDao.findAllByUserId(userId)) {
            if (connection.getLastSync() == null || connection.getLastSync().isBefore(threshold)) {
                imported += syncWithProvider(connection);
            }
        }
        return imported;
    }

    @Override
    public int syncAllConnections(UUID userId) {
        int imported = 0;
        for (BankConnection connection : bankConnectionDao.findAllByUserId(userId)) {
            imported += syncWithProvider(connection);
        }
        return imported;
    }

    @Override
    @Transactional(readOnly = true)
    public List<BankConnection> findLinkedConnections(UUID userId) {
        return bankConnectionDao.findAllByUserId(userId);
    }

    private int syncWithProvider(BankConnection connection) {
        return enableBankingSyncService.sync(connection);
    }

    // ── ENABLE BANKING: INIT ─────────────────────────────────────────────

    @Override
    public String initEnableBankingConnection(UUID userId, UUID accountId,
                                              String aspspName, String aspspCountry)
            throws InstanceNotFoundException {
        Account account = accountDao.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Account", accountId));

        if (account.getType() != AccountType.BANK) {
            throw new AccountInvalidException("Only BANK accounts can be linked");
        }
        if (bankConnectionDao.existsByAccountId(accountId)) {
            throw new AccountInvalidException("Account is already linked to a bank");
        }

        JsonNode authResponse = enableBankingClient.startAuth(
                aspspName, aspspCountry, accountId.toString());
        return authResponse.path("url").asText();
    }

    // ── ENABLE BANKING: COMPLETE ─────────────────────────────────────────

    @Override
    public BankConnection completeEnableBankingConnection(String state, String code)
            throws InstanceNotFoundException {
        UUID accountId;
        try {
            accountId = UUID.fromString(state);
        } catch (IllegalArgumentException e) {
            throw new AccountInvalidException("Invalid Enable Banking state");
        }

        Account account = accountDao.findById(accountId)
                .orElseThrow(() -> new InstanceNotFoundException("Account", accountId));

        if (bankConnectionDao.existsByAccountId(accountId)) {
            throw new AccountInvalidException("Account is already linked");
        }

        // Complete auth → creates a session with accounts
        JsonNode session = enableBankingClient.createSession(code);
        log.info("Enable Banking createSession raw response: {}", session);
        String sessionId = session.path("session_id").asText(null);

        // Pick the first account
        JsonNode accounts = session.path("accounts");
        log.info("Enable Banking accounts node (isArray={}, size={}): {}",
                accounts.isArray(), accounts.size(), accounts);
        String ebAccountId = null;
        if (accounts.isArray() && !accounts.isEmpty()) {
            JsonNode first = accounts.get(0);
            log.info("Enable Banking first account node: {}", first);
            ebAccountId = first.path("uid").asText(
                    first.path("account_id").asText(null));
        }
        log.info("Enable Banking extracted: sessionId={}, ebAccountId={}", sessionId, ebAccountId);

        BankConnection connection = new BankConnection(
                account, account.getUser(), null, null, null);
        connection.setProvider("ENABLE_BANKING");
        connection.setExternalAccountId(ebAccountId);
        connection.setSessionId(sessionId);

        bankConnectionDao.save(connection);
        log.info("Enable Banking connection established: accountId={}, sessionId={}",
                accountId, sessionId);
        syncWithProvider(connection);
        return connection;
    }

    // ── STATUS ───────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public BankConnection getConnection(UUID userId, UUID accountId) {
        return bankConnectionDao.findByAccountIdAndUserId(accountId, userId).orElse(null);
    }

    // ── UNLINK ───────────────────────────────────────────────────────────

    @Override
    public void unlinkAccount(UUID userId, UUID accountId) throws InstanceNotFoundException {
        BankConnection connection = bankConnectionDao.findByAccountIdAndUserId(accountId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("BankConnection", accountId));

        bankConnectionDao.delete(connection);
        log.info("Bank connection removed: accountId={}", accountId);
    }

    // ══════════════════════════════════════════════════════════════════════
    // ── MAPPING RULES ─────────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════

    @Override
    public RuleCreationResult createRule(UUID userId, UUID accountId, String namePattern,
                                         String bankCategory, TransactionType transactionType,
                                         String mappedName, UUID mappedCategoryId,
                                         boolean excludeMatch, BigDecimal amountMultiplier,
                                         boolean applyToExisting, Integer applyWindowDays)
            throws InstanceNotFoundException {

        User user = userDao.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        Account account = resolveBankAccount(accountId, userId);

        BigDecimal normalizedMultiplier = normalizeMultiplier(amountMultiplier);
        validateRulePayload(namePattern, bankCategory, mappedName, mappedCategoryId,
            excludeMatch, normalizedMultiplier);

        Category category = resolveCategory(mappedCategoryId, userId);
        if (category != null && transactionType != null && category.getType() != transactionType) {
            throw new IllegalArgumentException("Mapped category type must match rule transaction type");
        }
        String normalizedNamePattern = normalize(namePattern);
        String normalizedBankCategory = normalize(bankCategory);
        String normalizedMappedName = normalize(mappedName);
        int computedPriority = calculatePriority(normalizedNamePattern, normalizedBankCategory, transactionType);

        BankTransactionRule rule = new BankTransactionRule(
                user, account,
                normalizedNamePattern, normalizedBankCategory,
            transactionType, normalizedMappedName, category, computedPriority,
            excludeMatch, normalizedMultiplier);
        ruleDao.save(rule);

        int appliedTransactions = applyToExisting
                ? applyRulesToExistingTransactions(userId, accountId, applyWindowDays)
                : 0;

        return new RuleCreationResult(rule, appliedTransactions);
    }

    public RuleCreationResult createRule(UUID userId, UUID accountId, String namePattern,
                                         String bankCategory, TransactionType transactionType,
                                         String mappedName, UUID mappedCategoryId,
                                         boolean applyToExisting, Integer applyWindowDays)
            throws InstanceNotFoundException {
        return createRule(userId, accountId, namePattern, bankCategory, transactionType,
                mappedName, mappedCategoryId, false, null, applyToExisting, applyWindowDays);
    }

    @Override
    public RuleUpdateResult updateRule(UUID userId, UUID accountId, UUID ruleId, String namePattern,
                                       String bankCategory, TransactionType transactionType,
                                       String mappedName, UUID mappedCategoryId,
                                       Boolean excludeMatch, BigDecimal amountMultiplier,
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
        Category resolvedMappedCategory = mappedCategoryId != null
                ? resolveCategory(mappedCategoryId, userId)
                : rule.getMappedCategory();
        if (resolvedMappedCategory != null && transactionType != null
                && resolvedMappedCategory.getType() != transactionType) {
            throw new IllegalArgumentException("Mapped category type must match rule transaction type");
        }
        if (mappedCategoryId != null) {
            rule.setMappedCategory(resolvedMappedCategory);
        }
        if (excludeMatch != null) {
            rule.setExcludeMatch(excludeMatch);
        }
        if (amountMultiplier != null) {
            rule.setAmountMultiplier(normalizeMultiplier(amountMultiplier));
        }

        validateRulePayload(rule.getNamePattern(), rule.getBankCategory(),
                rule.getMappedName(),
                rule.getMappedCategory() != null ? rule.getMappedCategory().getId() : null,
                rule.isExcludeMatch(), rule.getAmountMultiplier());

        rule.setPriority(calculatePriority(
                rule.getNamePattern(), rule.getBankCategory(), rule.getTransactionType()));

        ruleDao.save(rule);
        int appliedTransactions = applyToExisting
                ? applyRulesToExistingTransactions(userId, accountId, applyWindowDays)
                : 0;

        return new RuleUpdateResult(rule, appliedTransactions);
    }

    public RuleUpdateResult updateRule(UUID userId, UUID accountId, UUID ruleId, String namePattern,
                                       String bankCategory, TransactionType transactionType,
                                       String mappedName, UUID mappedCategoryId,
                                       boolean applyToExisting, Integer applyWindowDays)
            throws InstanceNotFoundException {
        return updateRule(userId, accountId, ruleId, namePattern, bankCategory,
                transactionType, mappedName, mappedCategoryId,
                null, null, applyToExisting, applyWindowDays);
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
    public List<BankTransactionRule> findAllRulesByUserIdAndAccountId(UUID userId, UUID accountId)
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
                                     String mappedName, UUID mappedCategoryId,
                                     boolean excludeMatch, BigDecimal amountMultiplier) {
        if (normalize(namePattern) == null && normalize(bankCategory) == null) {
            throw new IllegalArgumentException("A rule must define a name pattern or bank category");
        }
        boolean adjustsAmount = amountMultiplier != null
                && amountMultiplier.compareTo(BigDecimal.ONE) != 0;
        if (normalize(mappedName) == null && mappedCategoryId == null && !excludeMatch && !adjustsAmount) {
            throw new IllegalArgumentException("A rule must map a name/category, exclude or adjust amount");
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
        Category resolvedCategory = transaction.getCategory();
        if (resolvedCategory != null && resolvedCategory.getType() != transaction.getType()) {
            // Clean up legacy invalid category assignments (EXPENSE category on INCOME tx and vice versa).
            resolvedCategory = null;
        }
        boolean nameResolved = false;
        boolean categoryResolved = false;
        boolean changed = false;

        for (BankTransactionRule rule : rules) {
            if (matchesRule(rule, originalName, transaction.getBankCategory(), transaction.getType())) {
                if (rule.isExcludeMatch()) {
                    if (transaction.isAffectsBalance() && transaction.getAccount() != null) {
                        applyBalance(transaction.getAccount(), transaction.getAmount(), transaction.getType(), true);
                    }
                    transactionDao.delete(transaction);
                    return true;
                }
                if (!nameResolved && normalize(rule.getMappedName()) != null) {
                    resolvedName = rule.getMappedName();
                    nameResolved = true;
                }
                if (!categoryResolved && rule.getMappedCategory() != null
                        && rule.getMappedCategory().getType() == transaction.getType()) {
                    resolvedCategory = rule.getMappedCategory();
                    categoryResolved = true;
                }
                BigDecimal multiplier = normalizeMultiplier(rule.getAmountMultiplier());
                if (multiplier.compareTo(BigDecimal.ONE) != 0) {
                    BigDecimal newAmount = transaction.getAmount()
                            .multiply(multiplier)
                            .setScale(2, RoundingMode.HALF_UP)
                            .abs();
                    if (newAmount.compareTo(BigDecimal.ZERO) > 0
                            && transaction.getAmount().compareTo(newAmount) != 0) {
                        if (transaction.isAffectsBalance() && transaction.getAccount() != null) {
                            applyBalance(transaction.getAccount(), transaction.getAmount(), transaction.getType(), true);
                            transaction.setAmount(newAmount);
                            applyBalance(transaction.getAccount(), transaction.getAmount(), transaction.getType(), false);
                        } else {
                            transaction.setAmount(newAmount);
                        }
                        changed = true;
                    }
                }
                // Keep scanning lower-priority matches to resolve missing fields.
                if (nameResolved && categoryResolved) {
                    break;
                }
            }
        }

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

    private boolean matchesRule(BankTransactionRule rule, String name, String bankCategory,
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

    private BigDecimal normalizeMultiplier(BigDecimal value) {
        if (value == null || value.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ONE;
        }
        return value.setScale(4, RoundingMode.HALF_UP);
    }

    private void applyBalance(Account account, BigDecimal amount, TransactionType type, boolean revert) {
        if (type == TransactionType.INCOME) {
            account.setBalance(revert
                    ? account.getBalance().subtract(amount)
                    : account.getBalance().add(amount));
        } else {
            account.setBalance(revert
                    ? account.getBalance().add(amount)
                    : account.getBalance().subtract(amount));
        }
    }

    private int calculatePriority(String namePattern, String bankCategory, TransactionType transactionType) {
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
