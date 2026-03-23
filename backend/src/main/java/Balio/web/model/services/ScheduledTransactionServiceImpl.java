package Balio.web.model.services;

import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.ScheduledTransactionInvalidException;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.AccountDao;
import Balio.web.model.entities.Category;
import Balio.web.model.entities.CategoryDao;
import Balio.web.model.entities.ScheduledTransaction;
import Balio.web.model.entities.ScheduledTransactionDao;
import Balio.web.model.entities.Transaction;
import Balio.web.model.entities.TransactionDao;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.management.InstanceNotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ScheduledTransactionServiceImpl implements ScheduledTransactionService {

    private static final int MAX_SCHEDULED = 50;

    private final UserDao userDao;
    private final AccountDao accountDao;
    private final CategoryDao categoryDao;
    private final ScheduledTransactionDao scheduledTxDao;
    private final TransactionDao transactionDao;

    public ScheduledTransactionServiceImpl(UserDao userDao, AccountDao accountDao,
                                            CategoryDao categoryDao,
                                            ScheduledTransactionDao scheduledTxDao,
                                            TransactionDao transactionDao) {
        this.userDao = userDao;
        this.accountDao = accountDao;
        this.categoryDao = categoryDao;
        this.scheduledTxDao = scheduledTxDao;
        this.transactionDao = transactionDao;
    }

    @Override
    public ScheduledTransaction create(UUID userId, String name, BigDecimal amount,
                                        TransactionType type, UUID accountId, UUID categoryId,
                                        boolean affectsBalance, int freqYears, int freqMonths,
                                        int freqWeeks, int freqDays, LocalDate startDate)
            throws InstanceNotFoundException {

        if (name == null || name.isBlank()) {
            throw new ScheduledTransactionInvalidException("Name is required");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ScheduledTransactionInvalidException("Amount must be positive");
        }
        if (type == null) {
            throw new ScheduledTransactionInvalidException("Transaction type is required");
        }
        if (freqYears < 0 || freqMonths < 0 || freqWeeks < 0 || freqDays < 0) {
            throw new ScheduledTransactionInvalidException("Frequency values must not be negative");
        }
        if (freqYears + freqMonths + freqWeeks + freqDays == 0) {
            throw new ScheduledTransactionInvalidException("At least one frequency component must be > 0");
        }
        if (startDate == null) {
            throw new ScheduledTransactionInvalidException("Start date is required");
        }

        if (scheduledTxDao.countByUserId(userId) >= MAX_SCHEDULED) {
            throw new ScheduledTransactionInvalidException(
                    "Maximum of " + MAX_SCHEDULED + " scheduled transactions reached");
        }

        User user = userDao.findById(userId)
                .orElseThrow(InstanceNotFoundException::new);

        Account account = null;
        if (accountId != null) {
            account = accountDao.findByIdAndUserId(accountId, userId).orElse(null);
        }

        Category category = null;
        if (categoryId != null) {
            category = categoryDao.findByIdAndUserId(categoryId, userId).orElse(null);
        }

        ScheduledTransaction st = new ScheduledTransaction(
                name.trim(), amount, type, freqYears, freqMonths, freqWeeks, freqDays, startDate, user);
        st.setAccount(account);
        st.setCategory(category);
        st.setAffectsBalance(affectsBalance);

        scheduledTxDao.save(st);
        return st;
    }

    @Override
    public ScheduledTransaction update(UUID userId, UUID scheduledTxId, String name,
                                        BigDecimal amount, TransactionType type,
                                        UUID accountId, UUID categoryId, Boolean affectsBalance,
                                        Integer freqYears, Integer freqMonths,
                                        Integer freqWeeks, Integer freqDays,
                                        LocalDate startDate, Boolean active)
            throws InstanceNotFoundException {

        ScheduledTransaction st = scheduledTxDao.findByIdAndUserId(scheduledTxId, userId)
                .orElseThrow(InstanceNotFoundException::new);

        if (name != null) {
            if (name.isBlank()) {
                throw new ScheduledTransactionInvalidException("Name must not be blank");
            }
            st.setName(name.trim());
        }
        if (amount != null) {
            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new ScheduledTransactionInvalidException("Amount must be positive");
            }
            st.setAmount(amount);
        }
        if (type != null) { st.setType(type); }
        if (freqYears != null) { st.setFreqYears(freqYears); }
        if (freqMonths != null) { st.setFreqMonths(freqMonths); }
        if (freqWeeks != null) { st.setFreqWeeks(freqWeeks); }
        if (freqDays != null) { st.setFreqDays(freqDays); }

        // Validate total frequency > 0 after partial updates
        if (st.getFreqYears() + st.getFreqMonths() + st.getFreqWeeks() + st.getFreqDays() == 0) {
            throw new ScheduledTransactionInvalidException("At least one frequency component must be > 0");
        }

        if (startDate != null) { st.setStartDate(startDate); }
        if (affectsBalance != null) { st.setAffectsBalance(affectsBalance); }
        if (active != null) { st.setActive(active); }

        if (accountId != null) {
            st.setAccount(accountDao.findByIdAndUserId(accountId, userId).orElse(null));
        }
        if (categoryId != null) {
            st.setCategory(categoryDao.findByIdAndUserId(categoryId, userId).orElse(null));
        }

        return st;
    }

    @Override
    public void delete(UUID userId, UUID scheduledTxId) throws InstanceNotFoundException {
        ScheduledTransaction st = scheduledTxDao.findByIdAndUserId(scheduledTxId, userId)
                .orElseThrow(InstanceNotFoundException::new);
        scheduledTxDao.delete(st);
    }

    @Override
    @Transactional(readOnly = true)
    public ScheduledTransaction findById(UUID userId, UUID scheduledTxId)
            throws InstanceNotFoundException {
        return scheduledTxDao.findByIdAndUserId(scheduledTxId, userId)
                .orElseThrow(InstanceNotFoundException::new);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ScheduledTransaction> findAllByUserId(UUID userId, int page, int size) {
        return scheduledTxDao.findAllByUserIdOrderByNameAsc(userId,
                PageRequest.of(page, size, Sort.by("name").ascending()));
    }

    @Override
    public int firePending(UUID userId) {
        List<ScheduledTransaction> activeRules = scheduledTxDao.findAllByUserIdAndActiveTrue(userId);
        LocalDate today = LocalDate.now();
        int totalCreated = 0;

        for (ScheduledTransaction st : activeRules) {
            List<LocalDate> pendingDates = calculatePendingDates(st, today);
            for (LocalDate execDate : pendingDates) {
                createTransactionFromSchedule(st, execDate);
                totalCreated++;
            }
            if (!pendingDates.isEmpty()) {
                st.setLastExecution(pendingDates.get(pendingDates.size() - 1));
            }
        }

        return totalCreated;
    }

    @Override
    @Transactional(readOnly = true)
    public LocalDate calculateNextExecution(ScheduledTransaction st) {
        if (st.getLastExecution() == null) {
            return st.getStartDate();
        }
        return advanceDate(st.getLastExecution(), st);
    }

    // ── Private helpers ──────────────────────────────────────────────────

    private List<LocalDate> calculatePendingDates(ScheduledTransaction st, LocalDate today) {
        List<LocalDate> dates = new ArrayList<>();
        LocalDate next;

        if (st.getLastExecution() == null) {
            next = st.getStartDate();
        } else {
            next = advanceDate(st.getLastExecution(), st);
        }

        int limit = 100;
        while (!next.isAfter(today) && dates.size() < limit) {
            dates.add(next);
            next = advanceDate(next, st);
        }

        return dates;
    }

    private LocalDate advanceDate(LocalDate date, ScheduledTransaction st) {
        return date
                .plusYears(st.getFreqYears())
                .plusMonths(st.getFreqMonths())
                .plusWeeks(st.getFreqWeeks())
                .plusDays(st.getFreqDays());
    }

    private void createTransactionFromSchedule(ScheduledTransaction st, LocalDate date) {
        Transaction tx = new Transaction(st.getName(), st.getAmount(), date, st.getType(), st.getUser());
        tx.setAccount(st.getAccount());
        tx.setCategory(st.getCategory());
        tx.setAffectsBalance(st.isAffectsBalance());
        transactionDao.save(tx);

        if (st.isAffectsBalance() && st.getAccount() != null) {
            Account account = st.getAccount();
            if (st.getType() == TransactionType.INCOME) {
                account.setBalance(account.getBalance().add(st.getAmount()));
            } else {
                account.setBalance(account.getBalance().subtract(st.getAmount()));
            }
        }
    }
}
