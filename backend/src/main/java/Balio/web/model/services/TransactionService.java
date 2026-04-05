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

    Transaction addExpense(UUID userId, UUID accountId, UUID categoryId, String name,
                           BigDecimal amount, LocalDate date, Boolean affectsBalance,
                           BigDecimal originalAmount, String originalCurrency, BigDecimal exchangeRate) throws
                                                                                      AccountInvalidException,
                                                                                      UserNotFoundException;

    Transaction addIncome(UUID userId, UUID accountId, UUID categoryId, String name,
                          BigDecimal amount, LocalDate date, Boolean affectsBalance) throws
                                                                                     AccountInvalidException,
                                                                                     UserNotFoundException;

    Transaction addIncome(UUID userId, UUID accountId, UUID categoryId, String name,
                          BigDecimal amount, LocalDate date, Boolean affectsBalance,
                          BigDecimal originalAmount, String originalCurrency, BigDecimal exchangeRate) throws
                                                                                     AccountInvalidException,
                                                                                     UserNotFoundException;

    Transaction updateTransaction(UUID userId, UUID transactionId, UUID accountId,
            UUID categoryId, TransactionType type, String name,
            BigDecimal amount, LocalDate date, Boolean affectsBalance)
            throws InstanceNotFoundException, AccountInvalidException;

    Transaction updateTransaction(UUID userId, UUID transactionId, UUID accountId,
            UUID categoryId, TransactionType type, String name,
            BigDecimal amount, LocalDate date, Boolean affectsBalance,
            BigDecimal originalAmount, String originalCurrency, BigDecimal exchangeRate)
            throws InstanceNotFoundException, AccountInvalidException;

    void deleteTransaction(UUID userId, UUID transactionId, boolean revertBalance) throws
                                                                                   InstanceNotFoundException;

    List<Transaction> findAllByUserId(UUID userId);

    Transaction findByIdAndUserId(UUID transactionId, UUID userId) throws InstanceNotFoundException;

    List<Transaction> findFiltered(UUID userId, TransactionType type, UUID accountId,
                                   UUID categoryId, LocalDate startDate, LocalDate endDate);

    /**
        * Returns a paginated page of transactions matching optional filters and sort options.
     * @param page  zero-based page index
     * @param size  page size
     */
    Page<Transaction> findPaged(UUID userId, TransactionType type, UUID accountId,
                                UUID categoryId, LocalDate startDate, LocalDate endDate,
                                String sortBy, String sortDir, int page, int size);

        default Page<Transaction> findPaged(UUID userId, TransactionType type,
                                                                                UUID accountId, UUID categoryId,
                                                                                LocalDate startDate, LocalDate endDate,
                                                                                int page, int size) {
                return findPaged(userId, type, accountId, categoryId, startDate, endDate,
                                "date", "desc", page, size);
        }

    /**
     * Applies a batch rule: finds transactions matching the filters and updates name/category.
     * Fire-and-forget — the rule itself is not persisted.
     * @return number of transactions updated
     */
    int applyBatchRule(UUID userId, TransactionType type, List<UUID> categoryIds,
                       String nameContains, LocalDate startDate, LocalDate endDate,
                       String newName, UUID newCategoryId,
                       Boolean excludeMatch, BigDecimal amountMultiplier);

        default int applyBatchRule(UUID userId, TransactionType type,
                                                           List<UUID> categoryIds, String nameContains,
                                                           LocalDate startDate, LocalDate endDate,
                                                           String newName, UUID newCategoryId) {
                return applyBatchRule(userId, type, categoryIds, nameContains,
                                startDate, endDate, newName, newCategoryId, null, null);
        }
}

