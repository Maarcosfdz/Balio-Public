package Balio.web.model.services;

import Balio.web.enums.AccountType;
import Balio.web.model.Exceptions.AccountInvalidException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.AccountDao;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@Transactional
public class AccountServiceImpl implements AccountService {

    private static final int MAX_ACCOUNTS_PER_USER = 5;

    private final UserDao userDao;
    private final AccountDao accountDao;

    public AccountServiceImpl(UserDao userDao, AccountDao accountDao) {
        this.userDao = userDao;
        this.accountDao = accountDao;
    }

    @Override
    public Account createAccount(UUID userId, String name, AccountType type, String currency, Boolean setDefault) {

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
        accountDao.save(account);

        if (Boolean.TRUE.equals(setDefault)) {
            user.setDefaultAccount(account);
            userDao.save(user);
        }

        return account;
    }

    @Override
    public void deleteAccount(UUID userId, UUID accountId) throws InstanceNotFoundException {

        Account account = accountDao.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Account", accountId));

        // If this account is the user's default, clear it
        User user = account.getUser();
        if (user.getDefaultAccount() != null
                && user.getDefaultAccount().getId().equals(accountId)) {
            user.setDefaultAccount(null);
            userDao.save(user);
        }

        accountDao.delete(account);
    }

    @Override
    public Account modifyAccount(UUID userId, UUID accountId, String name, AccountType type, String currency)
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
}
