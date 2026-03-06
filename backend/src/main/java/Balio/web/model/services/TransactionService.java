package Balio.web.model.services;

import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.AccountInvalidException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Transaction;
import org.springframework.data.domain.Page;

import javax.management.InstanceNotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface TransactionService {

    Transaction addExpense(UUID userId, UUID accountId, UUID categoryId, String name,
                           BigDecimal amount, LocalDate date, Boolean affectsBalance) throws
                                                                                      AccountInvalidException,
                                                                                      UserNotFoundException;

    Transaction addIncome(UUID userId, UUID accountId, UUID categoryId, String name,
                          BigDecimal amount, LocalDate date, Boolean affectsBalance) throws
                                                                                     AccountInvalidException,
                                                                                     UserNotFoundException;

    Transaction updateTransaction(UUID userId, UUID transactionId, UUID accountId,
            UUID categoryId, TransactionType type, String name,
            BigDecimal amount, LocalDate date, Boolean affectsBalance)
            throws InstanceNotFoundException, AccountInvalidException;

    void deleteTransaction(UUID userId, UUID transactionId, boolean revertBalance) throws
                                                                                   InstanceNotFoundException;

    List<Transaction> findAllByUserId(UUID userId);

    Transaction findByIdAndUserId(UUID transactionId, UUID userId) throws InstanceNotFoundException;

    List<Transaction> findFiltered(UUID userId, TransactionType type, UUID accountId,
                                   UUID categoryId, LocalDate startDate, LocalDate endDate);

    /**
     * Returns a paginated page of transactions matching optional filters. Ordered by date desc.
     * @param page  zero-based page index
     * @param size  page size
     */
    Page<Transaction> findPaged(UUID userId, TransactionType type, UUID accountId,
                                UUID categoryId, LocalDate startDate, LocalDate endDate,
                                int page, int size);
}

