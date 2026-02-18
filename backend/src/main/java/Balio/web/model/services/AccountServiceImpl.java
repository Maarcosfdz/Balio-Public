package Balio.web.model.services;

import Balio.web.enums.AccountType;
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
public class AccountServiceImpl {

    private final UserDao userDao;
    private final AccountDao accountDao;

    public AccountServiceImpl(UserDao userDao, AccountDao accountDao) {
        this.userDao = userDao;
        this.accountDao = accountDao;
    }

    @Override
    public Account createAccount(UUID userId, String name, AccountType type, String currency, Boolean setDefault) { //que me revise se vai bn

        User user = null;

        if ( userId != null ) {
            user = userDao
                    .findById(userId)
                    .orElseThrow(() -> new UserNotFoundException("User not found"));
        }

        if ( name == null ) {
            name = UUID.randomUUID().toString();
        }
        if ( type == null ) {
            type = AccountType.CASH;
        }

        Account account = new Account(name, type, currency, BigDecimal.ZERO, user);
        if ( setDefault ) {
            user.setDefaultAccount(account);
        }
        userDao.save(user);
        accountDao.save(account);

        return account;
    }

    @Override
    public void deleteAccount(UUID userId, UUID accountId) {

    }

    @Override
    public Account modifyAccount(UUID userId, UUID accountId, String name, AccountType type, String currency, Boolean setDefault) {

    }

    @Override
    public Account setDefaultAccount(UUID userId, UUID accountId, Boolean setDefault) {

    }
}
