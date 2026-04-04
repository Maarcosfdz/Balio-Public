package Balio.web.model.services;

import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.BankConnection;
import Balio.web.model.entities.BankTransactionRule;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Handles bank-account linking via Enable Banking, transaction synchronization,
 * and bank transaction mapping rules.
 */
public interface BankService {

    // ── Rule result records ───────────────────────────────────────────────

    record RuleCreationResult(BankTransactionRule rule, int appliedTransactions) {}

    record RuleUpdateResult(BankTransactionRule rule, int appliedTransactions) {}

    // ── Enable Banking ───────────────────────────────────────────────────

    /**
     * Starts an Enable Banking authorization for the given ASPSP (bank).
     *
     * @param aspspName    bank name as returned by the Enable Banking /aspsps endpoint
     * @param aspspCountry ISO 3166-1 alpha-2 country code (e.g. "ES")
     * @return the authorization link the user must visit
     */
    String initEnableBankingConnection(UUID userId, UUID accountId,
                                       String aspspName, String aspspCountry)
            throws InstanceNotFoundException;

    /**
     * Completes the Enable Banking flow after the user returns from the bank.
     * Creates a session, picks the first account, and persists the BankConnection.
     *
     * @param state the state value (= accountId) passed when starting the auth
     * @param code  the authorization code received in the callback
     */
    BankConnection completeEnableBankingConnection(String state, String code)
            throws InstanceNotFoundException;

    // ── Common ───────────────────────────────────────────────────────────

    /**
     * Triggers a manual synchronization via Enable Banking: fetches transactions and updates the balance.
     * Defaults to 90 days look-back.
     *
     * @return number of new transactions imported
     */
    int syncTransactions(UUID userId, UUID accountId) throws InstanceNotFoundException;

    /**
     * Triggers a manual synchronization fetching transactions going back {@code lookBackDays} days.
     *
     * @param lookBackDays days to look back (e.g. 90, 365, 730, 1095)
     * @return number of new transactions imported
     */
    int syncTransactions(UUID userId, UUID accountId, int lookBackDays) throws InstanceNotFoundException;

        int syncStaleConnections(UUID userId, int staleMinutes);

        int syncAllConnections(UUID userId);

        List<BankConnection> findLinkedConnections(UUID userId);

    /**
     * Returns the BankConnection for a linked account, or null if not linked.
     */
    BankConnection getConnection(UUID userId, UUID accountId);

    /**
     * Removes the bank link (tokens, connection) but keeps the account and its transactions.
     */
    void unlinkAccount(UUID userId, UUID accountId) throws InstanceNotFoundException;

    // ── Mapping rules ─────────────────────────────────────────────────────

    RuleCreationResult createRule(UUID userId, UUID accountId, String namePattern, String bankCategory,
                                  TransactionType transactionType, String mappedName,
                                                                                                                                        UUID mappedCategoryId, boolean excludeMatch,
                                                                                                                                        BigDecimal amountMultiplier, boolean applyToExisting,
                                  Integer applyWindowDays)
            throws InstanceNotFoundException;

        default RuleCreationResult createRule(UUID userId, UUID accountId, String namePattern,
                                                                                  String bankCategory, TransactionType transactionType,
                                                                                  String mappedName, UUID mappedCategoryId,
                                                                                  boolean applyToExisting, Integer applyWindowDays)
                        throws InstanceNotFoundException {
                return createRule(userId, accountId, namePattern, bankCategory, transactionType,
                                mappedName, mappedCategoryId, false, null, applyToExisting, applyWindowDays);
        }

    RuleUpdateResult updateRule(UUID userId, UUID accountId, UUID ruleId, String namePattern,
                                String bankCategory, TransactionType transactionType,
                                                                                                                                String mappedName, UUID mappedCategoryId,
                                                                                                                                Boolean excludeMatch, BigDecimal amountMultiplier,
                                boolean applyToExisting, Integer applyWindowDays)
            throws InstanceNotFoundException;

        default RuleUpdateResult updateRule(UUID userId, UUID accountId, UUID ruleId,
                                                                                String namePattern, String bankCategory,
                                                                                TransactionType transactionType, String mappedName,
                                                                                UUID mappedCategoryId, boolean applyToExisting,
                                                                                Integer applyWindowDays)
                        throws InstanceNotFoundException {
                return updateRule(userId, accountId, ruleId, namePattern, bankCategory,
                                transactionType, mappedName, mappedCategoryId,
                                null, null, applyToExisting, applyWindowDays);
        }

    void deleteRule(UUID userId, UUID accountId, UUID ruleId) throws InstanceNotFoundException;

    List<BankTransactionRule> findAllRulesByUserIdAndAccountId(UUID userId, UUID accountId)
            throws InstanceNotFoundException;
}
