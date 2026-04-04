package Balio.web.model.services;

import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.AccountInvalidException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.AccountDao;
import Balio.web.model.entities.Category;
import Balio.web.model.entities.CategoryDao;
import Balio.web.model.entities.Transaction;
import Balio.web.model.entities.TransactionDao;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.management.InstanceNotFoundException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@Transactional
public class TransactionServiceImpl implements TransactionService {

    private final AccountDao accountDao;
    private final TransactionDao transactionDao;
    private final CategoryDao categoryDao;
    private final UserDao userDao;

    public TransactionServiceImpl(AccountDao accountDao, TransactionDao transactionDao,
                                  CategoryDao categoryDao, UserDao userDao) {
        this.accountDao = accountDao;
        this.transactionDao = transactionDao;
        this.categoryDao = categoryDao;
        this.userDao = userDao;
    }

    @Override
    public Transaction addExpense(UUID userId, UUID accountId, UUID categoryId, String name,
                                  BigDecimal amount, LocalDate date, Boolean affectsBalance) throws
                                                                                             AccountInvalidException,
                                                                                             UserNotFoundException {

        return addTransaction(userId, accountId, categoryId, name, amount, date, affectsBalance,
                              TransactionType.EXPENSE, null, null, null);
    }

    @Override
    public Transaction addExpense(UUID userId, UUID accountId, UUID categoryId, String name,
                                  BigDecimal amount, LocalDate date, Boolean affectsBalance,
                                  BigDecimal originalAmount, String originalCurrency, BigDecimal exchangeRate) throws
                                                                                             AccountInvalidException,
                                                                                             UserNotFoundException {

        return addTransaction(userId, accountId, categoryId, name, amount, date, affectsBalance,
                              TransactionType.EXPENSE, originalAmount, originalCurrency, exchangeRate);
    }

    @Override
    public Transaction addIncome(UUID userId, UUID accountId, UUID categoryId, String name,
                                 BigDecimal amount, LocalDate date, Boolean affectsBalance) throws
                                                                                            AccountInvalidException,
                                                                                            UserNotFoundException {

        return addTransaction(userId, accountId, categoryId, name, amount, date, affectsBalance,
                              TransactionType.INCOME, null, null, null);
    }

    @Override
    public Transaction addIncome(UUID userId, UUID accountId, UUID categoryId, String name,
                                 BigDecimal amount, LocalDate date, Boolean affectsBalance,
                                 BigDecimal originalAmount, String originalCurrency, BigDecimal exchangeRate) throws
                                                                                            AccountInvalidException,
                                                                                            UserNotFoundException {

        return addTransaction(userId, accountId, categoryId, name, amount, date, affectsBalance,
                              TransactionType.INCOME, originalAmount, originalCurrency, exchangeRate);
    }

    @Override
    public Transaction updateTransaction(UUID userId, UUID transactionId, UUID accountId,
            UUID categoryId, TransactionType type, String name,
            BigDecimal amount, LocalDate date, Boolean affectsBalance)
            throws InstanceNotFoundException, AccountInvalidException {

        return updateTransaction(userId, transactionId, accountId, categoryId, type, name,
                amount, date, affectsBalance, null, null, null);
    }

    @Override
    public Transaction updateTransaction(UUID userId, UUID transactionId, UUID accountId,
            UUID categoryId, TransactionType type, String name,
            BigDecimal amount, LocalDate date, Boolean affectsBalance,
            BigDecimal originalAmount, String originalCurrency, BigDecimal exchangeRate)
            throws InstanceNotFoundException, AccountInvalidException {

        if ( name == null || name.isBlank() ) {
            throw new IllegalArgumentException("Name must not be blank");
        }
        if ( amount == null || amount.compareTo(BigDecimal.ZERO) <= 0 ) {
            throw new IllegalArgumentException("Amount must be positive");
        }
        if ( type == null ) {
            throw new IllegalArgumentException("Transaction type must not be null");
        }

        Transaction transaction = transactionDao.findByIdAndUserId(transactionId, userId)
                .orElseThrow(InstanceNotFoundException::new);

        // Revert previous balance effect on old account
        if ( transaction.isAffectsBalance() && transaction.getAccount() != null ) {
            applyBalance(transaction.getAccount(), transaction.getAmount(), transaction.getType(), true);
        }

        // Resolve new account
        Account newAccount = null;
        if ( accountId != null ) {
            newAccount = accountDao.findByIdAndUserId(accountId, userId)
                    .orElseThrow(() -> new AccountInvalidException("Account not linked"));
        }

        // Resolve new category (optional)
        Category newCategory = null;
        if ( categoryId != null ) {
            newCategory = categoryDao.findByIdAndUserId(categoryId, userId)
                    .orElse(null);
        }

        boolean affects = affectsBalance != null ? affectsBalance : true;

        // Currency info
        String acctCurrency = newAccount != null ? newAccount.getCurrency() : "EUR";
        if (originalCurrency != null && !originalCurrency.isBlank() && originalAmount != null
                && exchangeRate != null && exchangeRate.compareTo(BigDecimal.ZERO) > 0) {
            transaction.setOriginalAmount(originalAmount);
            transaction.setOriginalCurrency(originalCurrency);
            transaction.setExchangeRate(exchangeRate);
            amount = originalAmount.multiply(exchangeRate).setScale(2, RoundingMode.HALF_UP);
        } else {
            transaction.setOriginalAmount(amount);
            transaction.setOriginalCurrency(acctCurrency);
            transaction.setExchangeRate(BigDecimal.ONE);
        }

        transaction.setName(name);
        transaction.setAmount(amount);
        transaction.setDate(date != null ? date : LocalDate.now());
        transaction.setType(type);
        transaction.setAffectsBalance(affects);
        transaction.setAccount(newAccount);
        transaction.setCategory(newCategory);

        // Apply new balance effect on new account
        if ( affects && newAccount != null ) {
            applyBalance(newAccount, amount, type, false);
        }

        return transaction;
    }

    @Override
    public void deleteTransaction(UUID userId, UUID transactionId, boolean revertBalance) throws
                                                                                          InstanceNotFoundException {

        Transaction transaction = transactionDao.findByIdAndUserId(transactionId, userId)
                .orElseThrow(InstanceNotFoundException::new);

        // Revert balance if requested and the transaction was affecting the account
        if ( revertBalance && transaction.isAffectsBalance() && transaction.getAccount() != null ) {
            applyBalance(transaction.getAccount(), transaction.getAmount(), transaction.getType(), true);
        }

        transactionDao.delete(transaction);
    }

    private Transaction addTransaction(UUID userId, UUID accountId, UUID categoryId, String name,
            BigDecimal amount, LocalDate date, Boolean affectsBalance, TransactionType type,
            BigDecimal originalAmount, String originalCurrency, BigDecimal exchangeRate)
            throws AccountInvalidException, UserNotFoundException {

        if ( name == null || name.isBlank() ) {
            throw new IllegalArgumentException("Name must not be blank");
        }
        if ( amount == null || amount.compareTo(BigDecimal.ZERO) <= 0 ) {
            throw new IllegalArgumentException("Amount must be positive");
        }

        Account account = null;
        if ( accountId != null ) {
            account = accountDao
                    .findByIdAndUserId(accountId, userId)
                    .orElseThrow(() -> new AccountInvalidException("Account not linked"));
        }

        if ( date == null ) {
            date = LocalDate.now();
        }

        User user = userDao.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        // Category is optional
        Category category = null;
        if ( categoryId != null ) {
            category = categoryDao.findByIdAndUserId(categoryId, userId)
                    .orElse(null);
        }

        boolean affects = affectsBalance != null ? affectsBalance : true;

        // Currency handling
        String acctCurrency = account != null ? account.getCurrency() : "EUR";
        BigDecimal finalAmount = amount;
        BigDecimal finalOriginalAmount;
        String finalOriginalCurrency;
        BigDecimal finalExchangeRate;

        if (originalCurrency != null && !originalCurrency.isBlank() && originalAmount != null
                && exchangeRate != null && exchangeRate.compareTo(BigDecimal.ZERO) > 0) {
            finalOriginalAmount = originalAmount;
            finalOriginalCurrency = originalCurrency;
            finalExchangeRate = exchangeRate;
            finalAmount = originalAmount.multiply(exchangeRate).setScale(2, RoundingMode.HALF_UP);
        } else {
            finalOriginalAmount = amount;
            finalOriginalCurrency = acctCurrency;
            finalExchangeRate = BigDecimal.ONE;
        }

        Transaction transaction = new Transaction(name, finalAmount, date, type, user);
        transaction.setOriginalAmount(finalOriginalAmount);
        transaction.setOriginalCurrency(finalOriginalCurrency);
        transaction.setExchangeRate(finalExchangeRate);
        transaction.setAccount(account);
        transaction.setCategory(category);
        transaction.setAffectsBalance(affects);

        transactionDao.save(transaction);

        // Update account balance (always uses account-currency amount)
        if ( affects && account != null ) {
            applyBalance(account, finalAmount, type, false);
        }

        return transaction;
    }

    /**
     * Adjusts the account balance based on transaction type.
     *
     * @param revert if true, reverses the effect (used for deletes and updates)
     */
    private void applyBalance(Account account, BigDecimal amount, TransactionType type, boolean revert) {

        if ( type == TransactionType.INCOME ) {
            account.setBalance(revert
                                       ? account.getBalance().subtract(amount)
                                       : account.getBalance().add(amount));
        } else {
            account.setBalance(revert
                                       ? account.getBalance().add(amount)
                                       : account.getBalance().subtract(amount));
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<Transaction> findAllByUserId(UUID userId) {
        return transactionDao.findAllByUserIdOrderByDateDesc(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public Transaction findByIdAndUserId(UUID transactionId, UUID userId) throws InstanceNotFoundException {
        return transactionDao.findByIdAndUserId(transactionId, userId)
                .orElseThrow(InstanceNotFoundException::new);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Transaction> findFiltered(UUID userId, TransactionType type, UUID accountId,
                                          UUID categoryId, LocalDate startDate, LocalDate endDate) {
        return transactionDao.findFiltered(userId, type, accountId, categoryId, startDate, endDate);
    }

    @Override
    public int applyBatchRule(UUID userId, TransactionType type, List<UUID> categoryIds,
                              String nameContains, LocalDate startDate, LocalDate endDate,
                              String newName, UUID newCategoryId,
                              Boolean excludeMatch, BigDecimal amountMultiplier) {

        // Resolve target category once
        Category targetCategory = null;
        if (newCategoryId != null) {
            targetCategory = categoryDao.findByIdAndUserId(newCategoryId, userId).orElse(null);
        }

        // Build LIKE pattern: null if no filter, otherwise %term%
        String nameLike = (nameContains != null && !nameContains.isBlank())
                ? "%" + nameContains.toLowerCase() + "%" : null;

        // Collect matching transactions
        java.util.Set<UUID> seen = new java.util.HashSet<>();
        List<Transaction> matches = new java.util.ArrayList<>();

        if (categoryIds != null && !categoryIds.isEmpty()) {
            for (UUID catId : categoryIds) {
                for (Transaction tx : transactionDao.findForBatchRule(userId, type, catId,
                        nameLike, startDate, endDate)) {
                    if (seen.add(tx.getId())) { matches.add(tx); }
                }
            }
        } else {
            matches = transactionDao.findForBatchRule(userId, type, null,
                    nameLike, startDate, endDate);
        }

        int updated = 0;
        for (Transaction tx : matches) {
            if (Boolean.TRUE.equals(excludeMatch)) {
                if (tx.isAffectsBalance() && tx.getAccount() != null) {
                    applyBalance(tx.getAccount(), tx.getAmount(), tx.getType(), true);
                }
                transactionDao.delete(tx);
                updated++;
                continue;
            }

            boolean changed = false;
            if (newName != null && !newName.isBlank() && !newName.equals(tx.getName())) {
                tx.setName(newName.trim());
                changed = true;
            }
            if (targetCategory != null
                    && targetCategory.getType() == tx.getType()
                    && (tx.getCategory() == null
                    || !targetCategory.getId().equals(tx.getCategory().getId()))) {
                tx.setCategory(targetCategory);
                changed = true;
            }

            if (amountMultiplier != null && amountMultiplier.compareTo(BigDecimal.ZERO) > 0
                    && amountMultiplier.compareTo(BigDecimal.ONE) != 0) {
                BigDecimal adjusted = tx.getAmount()
                        .multiply(amountMultiplier)
                        .setScale(2, RoundingMode.HALF_UP)
                        .abs();
                if (adjusted.compareTo(BigDecimal.ZERO) > 0
                        && adjusted.compareTo(tx.getAmount()) != 0) {
                    if (tx.isAffectsBalance() && tx.getAccount() != null) {
                        applyBalance(tx.getAccount(), tx.getAmount(), tx.getType(), true);
                        tx.setAmount(adjusted);
                        applyBalance(tx.getAccount(), tx.getAmount(), tx.getType(), false);
                    } else {
                        tx.setAmount(adjusted);
                    }
                    changed = true;
                }
            }

            if (changed) { updated++; }
        }

        return updated;
    }

    public int applyBatchRule(UUID userId, TransactionType type, List<UUID> categoryIds,
                              String nameContains, LocalDate startDate, LocalDate endDate,
                              String newName, UUID newCategoryId) {
        return applyBatchRule(userId, type, categoryIds, nameContains, startDate, endDate,
                newName, newCategoryId, null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<Transaction> findPaged(
            UUID userId, TransactionType type, UUID accountId, UUID categoryId,
            LocalDate startDate, LocalDate endDate, String sortBy, String sortDir, int page, int size) {
        org.springframework.data.domain.Sort.Direction direction = resolveSortDirection(sortDir);
        String sortProperty = resolveSortProperty(sortBy);
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                page, size,
                org.springframework.data.domain.Sort.by(direction, sortProperty)
                        .and(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC,
                                "date"))
                        .and(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC,
                                "id")));
        return transactionDao.findFilteredPaged(userId, type, accountId, categoryId, startDate, endDate, pageable);
    }

    public org.springframework.data.domain.Page<Transaction> findPaged(
            UUID userId, TransactionType type, UUID accountId, UUID categoryId,
            LocalDate startDate, LocalDate endDate, int page, int size) {
        return findPaged(userId, type, accountId, categoryId, startDate, endDate,
                "date", "desc", page, size);
    }

    private org.springframework.data.domain.Sort.Direction resolveSortDirection(String sortDir) {
        if (sortDir == null) {
            return org.springframework.data.domain.Sort.Direction.DESC;
        }
        return "asc".equalsIgnoreCase(sortDir)
                ? org.springframework.data.domain.Sort.Direction.ASC
                : org.springframework.data.domain.Sort.Direction.DESC;
    }

    private String resolveSortProperty(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) {
            return "date";
        }

        return switch (sortBy.toLowerCase(Locale.ROOT)) {
            case "amount", "price" -> "amount";
            case "name" -> "name";
            default -> "date";
        };
    }
}
