package Balio.web.model.services;

import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.AccountInvalidException;
import Balio.web.model.entities.Transaction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/*
 * Defines the contract for transaction-related operations in the application.
 * This interface includes methods for adding expenses and incomes, updating transactions, and deleting transactions.
 * Each method requires the user ID to ensure that users can only modify their own transactions.
 */
public interface TransactionService {

    Transaction addExpense(UUID userId, UUID accountId, UUID categoryId, String name,
                           BigDecimal amount, LocalDate date, Boolean affectsBalance) throws
                                                                                      AccountInvalidException;

    Transaction addIncome(UUID userId, UUID accountId, UUID categoryId, String name,
                          BigDecimal amount, LocalDate date, Boolean affectsBalance) throws
                                                                                     AccountInvalidException;

    Transaction updateTransaction(UUID userId, UUID transactionId, UUID accountId, UUID categoryId, TransactionType type, String name,
                                  BigDecimal amount, LocalDate date, Boolean affectsBalance);

    void deleteTransaction(UUID userId, UUID transactionId);

}
