package Balio.web.model.services;

import Balio.web.model.Exceptions.DuplicateInstanceException;
import Balio.web.model.Exceptions.IncorrectLoginException;
import Balio.web.model.Exceptions.IncorrectPasswordException;
import Balio.web.model.entities.AccountDao;
import Balio.web.model.entities.BankConnectionDao;
import Balio.web.model.entities.BankTransactionRuleDao;
import Balio.web.model.entities.BudgetCategoryDao;
import Balio.web.model.entities.BudgetDao;
import Balio.web.model.entities.CategoryDao;
import Balio.web.model.entities.ChartWidgetDao;
import Balio.web.model.entities.FilterDao;
import Balio.web.model.entities.GoalDao;
import Balio.web.model.entities.RefreshTokenDao;
import Balio.web.model.entities.ScheduledTransactionDao;
import Balio.web.model.entities.TransactionDao;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.management.InstanceNotFoundException;
import java.util.UUID;

@Service
@Transactional
public class UserServiceImpl implements UserService {

    private final PasswordEncoder passwordEncoder;
    private final UserDao userDao;
    private final AccountDao accountDao;
    private final TransactionDao transactionDao;
    private final CategoryDao categoryDao;
    private final GoalDao goalDao;
    private final FilterDao filterDao;
    private final BudgetDao budgetDao;
    private final BudgetCategoryDao budgetCategoryDao;
    private final ScheduledTransactionDao scheduledTransactionDao;
    private final ChartWidgetDao chartWidgetDao;
    private final BankConnectionDao bankConnectionDao;
    private final BankTransactionRuleDao bankTransactionRuleDao;
    private final RefreshTokenDao refreshTokenDao;

    public UserServiceImpl(PasswordEncoder passwordEncoder,
                           UserDao userDao,
                           AccountDao accountDao,
                           TransactionDao transactionDao,
                           CategoryDao categoryDao,
                           GoalDao goalDao,
                           FilterDao filterDao,
                           BudgetDao budgetDao,
                           BudgetCategoryDao budgetCategoryDao,
                           ScheduledTransactionDao scheduledTransactionDao,
                           ChartWidgetDao chartWidgetDao,
                           BankConnectionDao bankConnectionDao,
                           BankTransactionRuleDao bankTransactionRuleDao,
                           RefreshTokenDao refreshTokenDao) {
        this.passwordEncoder = passwordEncoder;
        this.userDao = userDao;
        this.accountDao = accountDao;
        this.transactionDao = transactionDao;
        this.categoryDao = categoryDao;
        this.goalDao = goalDao;
        this.filterDao = filterDao;
        this.budgetDao = budgetDao;
        this.budgetCategoryDao = budgetCategoryDao;
        this.scheduledTransactionDao = scheduledTransactionDao;
        this.chartWidgetDao = chartWidgetDao;
        this.bankConnectionDao = bankConnectionDao;
        this.bankTransactionRuleDao = bankTransactionRuleDao;
        this.refreshTokenDao = refreshTokenDao;
    }

    @Override
    public void signUp(String nickname, String email, String rawPassword)
            throws DuplicateInstanceException {

        if ( userDao.existsByEmail(email) ) {
            throw new DuplicateInstanceException("project.entities.user", email);
        }

        String passwordHash = passwordEncoder.encode(rawPassword);

        User user = new User(nickname, email, passwordHash);
        userDao.save(user);
    }

    @Override
    @Transactional(readOnly = true)
    public User login(String email, String rawPassword) throws IncorrectLoginException {

        User user = userDao.findByEmail(email)
                .orElseThrow(() -> new IncorrectLoginException(email));

        if ( !passwordEncoder.matches(rawPassword, user.getPassword()) ) {
            throw new IncorrectLoginException(email);
        }

        return user;
    }

    @Override
    @Transactional(readOnly = true)
    public User getUserById(UUID id) throws InstanceNotFoundException {
        return userDao.findById(id)
                .orElseThrow(InstanceNotFoundException::new);
    }

    @Override
    public User updateProfile(UUID id, String nickname, String email) throws InstanceNotFoundException,
                                                                             DuplicateInstanceException {

        User user = userDao.findById(id)
                .orElseThrow(InstanceNotFoundException::new);

        // Check if the email exist if it changed
        if ( !user.getEmail().equals(email) && userDao.existsByEmail(email) ) {
            throw new DuplicateInstanceException("User", email);
        }

        user.setNickname(nickname);
        user.setEmail(email);

        return user; // User is automatically updated in the database at the end of the transaction
    }

    @Override
    public void changePassword(UUID authUserId, String oldRawPassword, String newRawPassword)
            throws InstanceNotFoundException, IncorrectPasswordException {

        User user = userDao.findById(authUserId)
                .orElseThrow(() -> new InstanceNotFoundException());

        // 1) Check de old
        if ( !passwordEncoder.matches(oldRawPassword, user.getPassword()) ) {
            throw new IncorrectPasswordException();
        }

        // 2) Avoid that the old passoword is equals than the new
        if ( passwordEncoder.matches(newRawPassword, user.getPassword()) ) {
            throw new IncorrectPasswordException();
        }

        user.setPassword(passwordEncoder.encode(newRawPassword));
    }

    @Override
    public User updatePreferredCurrency(UUID id, String currency) throws InstanceNotFoundException {
        if (currency == null || !currency.matches("^[A-Z]{3}$")) {
            throw new IllegalArgumentException("Currency must be a valid 3-letter ISO code");
        }
        User user = userDao.findById(id)
                .orElseThrow(InstanceNotFoundException::new);
        user.setPreferredCurrency(currency);
        return user;
    }

    @Override
    public void deleteAccount(UUID id) throws InstanceNotFoundException {
        User user = userDao.findById(id).orElseThrow(InstanceNotFoundException::new);

        // Break the circular FK: User.defaultAccount → Account → User
        user.setDefaultAccount(null);
        userDao.saveAndFlush(user);

        // Delete ManyToMany join tables for BudgetCategory before bulk-deleting rows
        // (JPQL bulk DELETE bypasses the JPA lifecycle and would leave orphaned join rows)
        budgetCategoryDao.deleteTransactionLinksByUserId(id);
        budgetCategoryDao.deleteLinkedCategoryLinksByUserId(id);
        budgetCategoryDao.deleteAllByBudgetUserId(id);

        // Delete remaining user data in FK-safe order
        bankTransactionRuleDao.deleteAllByUserId(id);
        bankConnectionDao.deleteAllByUserId(id);
        transactionDao.deleteAllByUserId(id);
        scheduledTransactionDao.deleteAllByUserId(id);
        chartWidgetDao.deleteAllByUserId(id);
        budgetDao.deleteAllByUserId(id);
        filterDao.deleteAllByUserId(id);
        goalDao.deleteAllByUserId(id);
        accountDao.deleteAllByUserId(id);
        categoryDao.deleteAllByUserId(id);
        refreshTokenDao.deleteAllByUserId(id);

        userDao.deleteById(id);
    }

}
