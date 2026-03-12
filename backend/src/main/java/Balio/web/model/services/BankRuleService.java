package Balio.web.model.services;

import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.BankTransactionRule;

import java.util.List;
import java.util.UUID;

/**
 * CRUD operations for bank-transaction mapping rules.
 */
public interface BankRuleService {

    record RuleCreationResult(BankTransactionRule rule, int appliedTransactions) {}

        record RuleUpdateResult(BankTransactionRule rule, int appliedTransactions) {}

    RuleCreationResult createRule(UUID userId, UUID accountId, String namePattern, String bankCategory,
                                  TransactionType transactionType, String mappedName,
                                  UUID mappedCategoryId, boolean applyToExisting,
                                  Integer applyWindowDays)
            throws InstanceNotFoundException;

        RuleUpdateResult updateRule(UUID userId, UUID accountId, UUID ruleId, String namePattern,
                                                                String bankCategory, TransactionType transactionType,
                                                                String mappedName, UUID mappedCategoryId,
                                                                boolean applyToExisting, Integer applyWindowDays)
            throws InstanceNotFoundException;

    void deleteRule(UUID userId, UUID accountId, UUID ruleId) throws InstanceNotFoundException;

    List<BankTransactionRule> findAllByUserIdAndAccountId(UUID userId, UUID accountId)
            throws InstanceNotFoundException;
}
