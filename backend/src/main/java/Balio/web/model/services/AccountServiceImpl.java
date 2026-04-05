package Balio.web.model.services;

import Balio.web.enums.AccountType;
import Balio.web.model.Exceptions.AccountInvalidException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.AccountDao;
import Balio.web.model.entities.BankConnectionDao;
import Balio.web.model.entities.BankTransactionRule;
import Balio.web.model.entities.BankTransactionRuleDao;
import Balio.web.model.entities.ScheduledTransaction;
import Balio.web.model.entities.ScheduledTransactionDao;
import Balio.web.model.entities.Transaction;
import Balio.web.model.entities.TransactionDao;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AccountServiceImpl implements AccountService {

    private static final int MAX_ACCOUNTS_PER_USER = 5;

    private final UserDao userDao;
    private final AccountDao accountDao;
    private final TransactionDao transactionDao;
    private final BankConnectionDao bankConnectionDao;
    private final BankTransactionRuleDao bankTransactionRuleDao;
    private final ScheduledTransactionDao scheduledTransactionDao;

    public AccountServiceImpl(UserDao userDao, AccountDao accountDao, TransactionDao transactionDao,
                              BankConnectionDao bankConnectionDao, BankTransactionRuleDao bankTransactionRuleDao,
                              ScheduledTransactionDao scheduledTransactionDao) {
        this.userDao = userDao;
        this.accountDao = accountDao;
        this.transactionDao = transactionDao;
        this.bankConnectionDao = bankConnectionDao;
        this.bankTransactionRuleDao = bankTransactionRuleDao;
        this.scheduledTransactionDao = scheduledTransactionDao;
    }

    @Override
    public Account createAccount(UUID userId, String name, AccountType type,
                                 String currency, Boolean setDefault,
                                 Boolean syncDeletedTransactions) {

        User user = userDao.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        // Enforce maximum number of accounts per user
        long currentCount = accountDao.countByUserId(userId);
        if (currentCount >= MAX_ACCOUNTS_PER_USER) {
            throw new AccountInvalidException(
                    "Maximum number of accounts (" + MAX_ACCOUNTS_PER_USER + ") reached");
        }

        if (name == null || name.isBlank()) {
            name = "Account " + (currentCount + 1);
        }
        if (type == null) {
            type = AccountType.CASH;
        }
        if (currency == null || currency.isBlank()) {
            currency = "EUR";
        }

        Account account = new Account(name, type, currency, BigDecimal.ZERO, user);
        if (type == AccountType.BANK && Boolean.TRUE.equals(syncDeletedTransactions)) {
            account.setSyncDeletedTransactions(true);
        }
        accountDao.save(account);

        if (Boolean.TRUE.equals(setDefault)) {
            user.setDefaultAccount(account);
            userDao.save(user);
        }

        return account;
    }

    @Override
    public void deleteAccount(UUID userId, UUID accountId) throws InstanceNotFoundException {
        deleteAccount(userId, accountId, false);
    }

    @Override
    public void deleteAccount(UUID userId, UUID accountId, boolean deleteTransactions)
            throws InstanceNotFoundException {

        Account account = accountDao.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Account", accountId));

        // If this account is the user's default, clear it
        User user = account.getUser();
        if (user.getDefaultAccount() != null
                && user.getDefaultAccount().getId().equals(accountId)) {
            user.setDefaultAccount(null);
            userDao.save(user);
        }

        List<BankTransactionRule> rules = bankTransactionRuleDao
                .findAllByUserIdAndAccountIdOrderByPriorityDesc(userId, accountId);
        if (!rules.isEmpty()) {
            bankTransactionRuleDao.deleteAll(rules);
        }

        bankConnectionDao.findByAccountIdAndUserId(accountId, userId)
                .ifPresent(bankConnectionDao::delete);

        List<Transaction> transactions = transactionDao
            .findAllByUserIdAndAccountIdOrderByDateDesc(userId, accountId);
        if (!transactions.isEmpty()) {
            if (deleteTransactions) {
                transactionDao.deleteAll(transactions);
            } else {
                transactions.forEach(transaction -> transaction.setAccount(null));
                transactionDao.saveAll(transactions);
            }
        }

        // Keep scheduled rules even if the account is removed.
        // This avoids FK issues in environments where ON DELETE SET NULL
        // is missing or inconsistent.
        List<ScheduledTransaction> scheduledTransactions = scheduledTransactionDao
                .findAllByUserIdAndAccountIdOrderByStartDateAsc(userId, accountId);
        if (!scheduledTransactions.isEmpty()) {
            scheduledTransactions.forEach(st -> st.setAccount(null));
            scheduledTransactionDao.saveAll(scheduledTransactions);
        }

        accountDao.delete(account);
    }

    @Override
    public Account modifyAccount(UUID userId, UUID accountId, String name,
                                 AccountType type, String currency,
                                 Boolean syncDeletedTransactions)
            throws InstanceNotFoundException {

        Account account = accountDao.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Account", accountId));

        if (name != null) {
            if (name.isBlank()) {
                throw new AccountInvalidException("Account name cannot be blank");
            }
            account.setName(name);
        }
        if (type != null) {
            account.setType(type);
        }
        if (currency != null) {
            if (currency.isBlank()) {
                throw new AccountInvalidException("Currency cannot be blank");
            }
            account.setCurrency(currency);
        }
        if (syncDeletedTransactions != null && account.getType() == AccountType.BANK) {
            account.setSyncDeletedTransactions(syncDeletedTransactions);
        }

        accountDao.save(account);
        return account;
    }

    @Override
    public User setDefaultAccount(UUID userId, UUID accountId) throws InstanceNotFoundException {

        User user = userDao.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        Account account = accountDao.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Account", accountId));

        user.setDefaultAccount(account);
        userDao.save(user);

        return user;
    }

    @Override
    public User clearDefaultAccount(UUID userId) {

        User user = userDao.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        user.setDefaultAccount(null);
        userDao.save(user);

        return user;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Account> findAllByUserId(UUID userId) {
        return accountDao.findAllByUserIdOrderByNameAsc(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public Account findByIdAndUserId(UUID accountId, UUID userId) throws InstanceNotFoundException {
        return accountDao.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Account", accountId));
    }

    @Override
    public Account adjustBalance(UUID userId, UUID accountId, BigDecimal newBalance) throws InstanceNotFoundException {
        Account account = accountDao.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Account", accountId));

        if (account.getType() == AccountType.BANK) {
            throw new AccountInvalidException("Balance of BANK accounts is managed automatically via bank sync");
        }
        if (newBalance == null) {
            throw new AccountInvalidException("New balance must not be null");
        }

        account.setBalance(newBalance);
        accountDao.save(account);
        return account;
    }

    @Override
    @Transactional(readOnly = true)
    public UUID getDefaultAccountId(UUID userId) {
        return userDao.findById(userId)
                .map(u -> u.getDefaultAccount() != null ? u.getDefaultAccount().getId() : null)
                .orElse(null);
    }
}
