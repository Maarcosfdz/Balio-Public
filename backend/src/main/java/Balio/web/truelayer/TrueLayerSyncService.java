package Balio.web.truelayer;

import Balio.web.enums.TransactionType;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.BankConnection;
import Balio.web.model.entities.BankConnectionDao;
import Balio.web.model.entities.BankTransactionRule;
import Balio.web.model.entities.BankTransactionRuleDao;
import Balio.web.model.entities.Category;
import Balio.web.model.entities.Transaction;
import Balio.web.model.entities.TransactionDao;
import Balio.web.model.entities.User;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;

/**
 * Orchestrates the synchronization process:
 *   1. Obtains a valid access token (refreshing if needed)
 *   2. Fetches transactions from TrueLayer
 *   3. Applies user-defined mapping rules
 *   4. Persists new transactions (deduplicating via external_id)
 *   5. Updates the account balance from TrueLayer
 */
@Service
public class TrueLayerSyncService {

    private static final Logger log = LoggerFactory.getLogger(TrueLayerSyncService.class);

    private final TrueLayerClient trueLayerClient;
    private final TrueLayerTokenService tokenService;
    private final TransactionDao transactionDao;
    private final BankConnectionDao bankConnectionDao;
    private final BankTransactionRuleDao ruleDao;

    public TrueLayerSyncService(TrueLayerClient trueLayerClient,
                                TrueLayerTokenService tokenService,
                                TransactionDao transactionDao,
                                BankConnectionDao bankConnectionDao,
                                BankTransactionRuleDao ruleDao) {
        this.trueLayerClient = trueLayerClient;
        this.tokenService = tokenService;
        this.transactionDao = transactionDao;
        this.bankConnectionDao = bankConnectionDao;
        this.ruleDao = ruleDao;
    }

    /**
     * Synchronizes transactions and balance for the given bank connection.
     *
     * @return number of new transactions imported
     */
    @Transactional
    public int sync(BankConnection connection) {
        String accessToken = tokenService.getValidAccessToken(connection);
        String tlAccountId = connection.getTruelayerAccountId();
        Account account = connection.getAccount();
        User user = connection.getUser();
        UUID userId = user.getId();

        // ── Fetch and import transactions ────────────────────────────────
        List<BankTransactionRule> rules = ruleDao.findAllByUserIdOrderByPriorityDesc(userId);
        JsonNode txNodes = trueLayerClient.fetchTransactions(accessToken, tlAccountId);

        int imported = 0;
        for (JsonNode txNode : txNodes) {
            String externalId = txNode.path("transaction_id").asText(null);
            if (externalId == null) {
                continue;
            }

            // Deduplicate
            if (transactionDao.existsByAccountIdAndExternalId(account.getId(), externalId)) {
                continue;
            }

            imported += importTransaction(txNode, externalId, account, user, rules);
        }

        // ── Fetch and update balance ─────────────────────────────────────
        updateBalance(accessToken, tlAccountId, account);

        // ── Update last sync timestamp ───────────────────────────────────
        connection.setLastSync(Instant.now());
        bankConnectionDao.save(connection);

        log.info("Bank sync complete: accountId={}, imported={}", account.getId(), imported);
        return imported;
    }

    // ── INTERNALS ────────────────────────────────────────────────────────

    private int importTransaction(JsonNode txNode, String externalId,
                                  Account account, User user,
                                  List<BankTransactionRule> rules) {

        BigDecimal rawAmount = new BigDecimal(txNode.path("amount").asText("0"));
        TransactionType type = rawAmount.compareTo(BigDecimal.ZERO) < 0
                ? TransactionType.EXPENSE
                : TransactionType.INCOME;
        BigDecimal amount = rawAmount.abs();

        // amount == 0 → treat as expense
        if (amount.compareTo(BigDecimal.ZERO) == 0) {
            type = TransactionType.EXPENSE;
        }

        String merchantName = txNode.path("merchant_name").asText(
                txNode.path("description").asText("Unknown"));
        String bankCategory = txNode.path("transaction_category").asText(null);
        LocalDate date = parseDate(txNode.path("timestamp").asText(null));

        // Apply mapping rules (first match wins, ordered by priority desc)
        String resolvedName = merchantName;
        Category resolvedCategory = null;

        for (BankTransactionRule rule : rules) {
            if (matches(rule, merchantName, bankCategory)) {
                if (rule.getMappedName() != null && !rule.getMappedName().isBlank()) {
                    resolvedName = rule.getMappedName();
                }
                resolvedCategory = rule.getMappedCategory(); // may be null
                break;
            }
        }

        Transaction transaction = new Transaction(resolvedName, amount, date, type, user);
        transaction.setAccount(account);
        transaction.setCategory(resolvedCategory);
        transaction.setAffectsBalance(false);
        transaction.setBankCategory(bankCategory);
        transaction.setExternalId(externalId);

        transactionDao.save(transaction);
        return 1;
    }

    private boolean matches(BankTransactionRule rule, String name, String bankCategory) {
        boolean nameMatch = rule.getNamePattern() == null
                || rule.getNamePattern().isBlank()
                || (name != null && name.toLowerCase().contains(rule.getNamePattern().toLowerCase()));

        boolean categoryMatch = rule.getBankCategory() == null
                || rule.getBankCategory().isBlank()
                || (bankCategory != null
                    && bankCategory.equalsIgnoreCase(rule.getBankCategory()));

        // At least one criterion must be specified for the rule to be meaningful
        boolean hasAnyCriterion = (rule.getNamePattern() != null && !rule.getNamePattern().isBlank())
                || (rule.getBankCategory() != null && !rule.getBankCategory().isBlank());

        return hasAnyCriterion && nameMatch && categoryMatch;
    }

    private void updateBalance(String accessToken, String tlAccountId, Account account) {
        try {
            JsonNode balanceNodes = trueLayerClient.fetchBalance(accessToken, tlAccountId);
            if (balanceNodes.isArray() && !balanceNodes.isEmpty()) {
                BigDecimal available = new BigDecimal(
                        balanceNodes.get(0).path("available").asText(
                                balanceNodes.get(0).path("current").asText("0")));
                account.setBalance(available);
            }
        } catch (TrueLayerException e) {
            log.warn("Could not fetch balance for TL account {}: {}", tlAccountId, e.getMessage());
        }
    }

    private LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) {
            return LocalDate.now();
        }
        try {
            // TrueLayer returns ISO-8601 timestamps e.g. "2026-03-10T14:22:00Z"
            return LocalDate.parse(raw.substring(0, 10), DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (DateTimeParseException | StringIndexOutOfBoundsException e) {
            return LocalDate.now();
        }
    }
}
