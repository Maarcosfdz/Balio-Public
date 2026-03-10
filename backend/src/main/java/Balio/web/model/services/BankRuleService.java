package Balio.web.model.services;

import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.BankTransactionRule;

import java.util.List;
import java.util.UUID;

/**
 * CRUD operations for bank-transaction mapping rules.
 */
public interface BankRuleService {

    BankTransactionRule createRule(UUID userId, String namePattern, String bankCategory,
                                  String mappedName, UUID mappedCategoryId, int priority);

    BankTransactionRule updateRule(UUID userId, UUID ruleId, String namePattern,
                                  String bankCategory, String mappedName,
                                  UUID mappedCategoryId, Integer priority)
            throws InstanceNotFoundException;

    void deleteRule(UUID userId, UUID ruleId) throws InstanceNotFoundException;

    List<BankTransactionRule> findAllByUserId(UUID userId);
}
