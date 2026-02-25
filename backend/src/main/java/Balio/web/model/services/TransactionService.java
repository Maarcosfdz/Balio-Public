package Balio.web.model.services;

import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.AccountInvalidException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Transaction;

import javax.management.InstanceNotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/*
 * Defines the contract for transaction-related operations in the application.
 * This interface includes methods for adding expenses and incomes, updating transactions, and deleting transactions.
 * Each method requires the user ID to ensure that users can only modify their own transactions.
 */
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

    /**
     * Returns all transactions belonging to the user, ordered by date descending.
     */
    List<Transaction> findAllByUserId(UUID userId);

    /**
     * Returns a single transaction belonging to the user.
     *
     * @throws InstanceNotFoundException if the transaction does not exist or does not belong to the user
     */
    Transaction findByIdAndUserId(UUID transactionId, UUID userId) throws InstanceNotFoundException;

    /**
     * Returns transactions matching optional filters. All filter parameters are optional.
     */
    List<Transaction> findFiltered(UUID userId, TransactionType type, UUID accountId,
                                   UUID categoryId, LocalDate startDate, LocalDate endDate);

}
