package Balio.web.model.services;

import Balio.web.enums.TransactionType;
import Balio.web.model.entities.ScheduledTransaction;
import org.springframework.data.domain.Page;

import javax.management.InstanceNotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public interface ScheduledTransactionService {

    ScheduledTransaction create(UUID userId, String name, BigDecimal amount, TransactionType type,
                                 UUID accountId, UUID categoryId, boolean affectsBalance,
                                 int freqYears, int freqMonths, int freqWeeks, int freqDays,
                                 LocalDate startDate)
            throws InstanceNotFoundException;

    ScheduledTransaction update(UUID userId, UUID scheduledTxId, String name, BigDecimal amount,
                                 TransactionType type, UUID accountId, UUID categoryId,
                                 Boolean affectsBalance, Integer freqYears, Integer freqMonths,
                                 Integer freqWeeks, Integer freqDays, LocalDate startDate,
                                 Boolean active)
            throws InstanceNotFoundException;

    void delete(UUID userId, UUID scheduledTxId) throws InstanceNotFoundException;

    ScheduledTransaction findById(UUID userId, UUID scheduledTxId) throws InstanceNotFoundException;

    Page<ScheduledTransaction> findAllByUserId(UUID userId, int page, int size);

    /**
     * Fires all pending scheduled transactions for the user.
     * @return the number of transactions created
     */
    int firePending(UUID userId);

    /**
     * Calculate the next execution date for a scheduled transaction.
     */
    LocalDate calculateNextExecution(ScheduledTransaction st);
}
