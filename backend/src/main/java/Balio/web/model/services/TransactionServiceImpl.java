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
import java.time.LocalDate;
import java.util.List;
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
                              TransactionType.EXPENSE);
    }

    @Override
    public Transaction addIncome(UUID userId, UUID accountId, UUID categoryId, String name,
                                 BigDecimal amount, LocalDate date, Boolean affectsBalance) throws
                                                                                            AccountInvalidException,
                                                                                            UserNotFoundException {

        return addTransaction(userId, accountId, categoryId, name, amount, date, affectsBalance,
                              TransactionType.INCOME);
    }

    @Override
    public Transaction updateTransaction(UUID userId, UUID transactionId, UUID accountId,
            UUID categoryId, TransactionType type, String name,
            BigDecimal amount, LocalDate date, Boolean affectsBalance)
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
            BigDecimal amount, LocalDate date, Boolean affectsBalance, TransactionType type)
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
        } else {
            throw new AccountInvalidException("Account not found");
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

        Transaction transaction = new Transaction(name, amount, date, type, user);
        transaction.setAccount(account);
        transaction.setCategory(category);
        transaction.setAffectsBalance(affects);

        transactionDao.save(transaction);

        // Update account balance
        if ( affects ) {
            applyBalance(account, amount, type, false);
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
}
