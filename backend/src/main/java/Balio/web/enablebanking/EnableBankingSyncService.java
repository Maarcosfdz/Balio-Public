package Balio.web.enablebanking;

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
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;

/**
 * Orchestrates Enable Banking synchronization:
 * <ol>
 *   <li>Fetches transactions from Enable Banking API</li>
 *   <li>Applies bank-transaction mapping rules</li>
 *   <li>Persists new transactions (deduplicating via external_id)</li>
 *   <li>Updates account balance from Enable Banking balances endpoint</li>
 * </ol>
 *
 * Enable Banking follows the PSD2 / Berlin Group format, so transaction and
 * balance structures are very similar to other Open Banking providers.
 */
@Service
public class EnableBankingSyncService {

    private static final Logger log = LoggerFactory.getLogger(EnableBankingSyncService.class);

    private final EnableBankingClient enableBankingClient;
    private final TransactionDao transactionDao;
    private final BankConnectionDao bankConnectionDao;
    private final BankTransactionRuleDao ruleDao;

    public EnableBankingSyncService(EnableBankingClient enableBankingClient,
                                    TransactionDao transactionDao,
                                    BankConnectionDao bankConnectionDao,
                                    BankTransactionRuleDao ruleDao) {
        this.enableBankingClient = enableBankingClient;
        this.transactionDao = transactionDao;
        this.bankConnectionDao = bankConnectionDao;
        this.ruleDao = ruleDao;
    }

    /**
     * Synchronizes transactions and balance for an Enable Banking connection (last 90 days).
     *
     * @return number of new transactions imported
     */
    @Transactional
    public int sync(BankConnection connection) {
        return sync(connection, 90);
    }

    /**
     * Synchronizes transactions and balance for an Enable Banking connection.
     *
     * @param lookBackDays how many days back to fetch transactions
     * @return number of new transactions imported
     */
    @Transactional
    public int sync(BankConnection connection, int lookBackDays) {
        String ebAccountId = connection.getExternalAccountId();
        Account account = connection.getAccount();
        User user = connection.getUser();
        UUID userId = user.getId();

        log.info("Enable Banking sync start: accountId={}, ebAccountId={}, sessionId={}",
                account.getId(), ebAccountId, connection.getSessionId());

        if (ebAccountId == null || ebAccountId.isBlank()) {
            log.warn("No Enable Banking account UID stored for connection (accountId={}). " +
                    "The OAuth callback may not have completed properly.", account.getId());
            return 0;
        }

        List<BankTransactionRule> rules = ruleDao.findAllByUserIdAndAccountIdOrderByPriorityDesc(
            userId, account.getId());

        // ── Fetch and import transactions ────────────────────────────────
        JsonNode txRoot = enableBankingClient.fetchTransactions(ebAccountId, lookBackDays);
        log.info("Enable Banking transactions raw response: {}", txRoot);
        // Enable Banking returns: { transactions: [ ... ] }
        JsonNode transactions = txRoot.path("transactions");

        int imported = 0;
        if (transactions.isArray()) {
            for (JsonNode txNode : transactions) {
                imported += importTransaction(txNode, account, user, rules);
            }
        }

        // ── Fetch and update balance ─────────────────────────────────────
        updateBalance(ebAccountId, account);

        // ── Update last sync timestamp ───────────────────────────────────
        connection.setLastSync(Instant.now());
        bankConnectionDao.save(connection);

        log.info("Enable Banking sync complete: accountId={}, imported={}",
                account.getId(), imported);
        return imported;
    }

    // ── INTERNALS ────────────────────────────────────────────────────────

    private int importTransaction(JsonNode txNode, Account account, User user,
                                  List<BankTransactionRule> rules) {

        // Enable Banking uses "transaction_id" or "entry_reference" as unique ID.
        // Use hasNonNull to skip the field when it is explicitly null in the JSON.
        String externalId = txNode.hasNonNull("transaction_id")
                ? txNode.path("transaction_id").asText(null)
                : txNode.path("entry_reference").asText(null);

        if (externalId == null || externalId.isBlank()) {
            return 0;
        }

        // Deduplicate
        if (transactionDao.existsByAccountIdAndExternalId(account.getId(), externalId)) {
            return 0;
        }

        // Amount: transaction_amount.amount (always positive in Berlin Group format).
        // The direction is given by credit_debit_indicator: DBIT=expense, CRDT=income.
        JsonNode amountNode = txNode.path("transaction_amount");
        BigDecimal amount = new BigDecimal(amountNode.path("amount").asText("0")).abs();
        String indicator = txNode.path("credit_debit_indicator").asText("CRDT");
        TransactionType type = "DBIT".equalsIgnoreCase(indicator)
                ? TransactionType.EXPENSE
                : TransactionType.INCOME;

        // Name: Berlin Group uses nested creditor/debtor objects, not flat fields.
        // For outgoing (DBIT) use debtor.name; for incoming (CRDT) use creditor.name.
        // Fall back to first remittance_information entry.
        String name;
        if (txNode.path("creditor").hasNonNull("name")) {
            name = txNode.path("creditor").path("name").asText("Unknown");
        } else if (txNode.path("debtor").hasNonNull("name")) {
            name = txNode.path("debtor").path("name").asText("Unknown");
        } else {
            JsonNode remit = txNode.path("remittance_information");
            name = (remit.isArray() && !remit.isEmpty())
                    ? remit.get(0).asText("Unknown")
                    : "Unknown";
        }

        String bankCategory = txNode.path("proprietary_bank_transaction_code").asText(null);
        LocalDate date = parseDate(txNode.path("booking_date").asText(null));

        // Apply mapping rules (ordered by priority desc). Name and category can be
        // resolved by different rules to avoid dropping category mappings.
        String resolvedName = name;
        Category resolvedCategory = null;
        boolean nameResolved = false;
        boolean categoryResolved = false;
        BigDecimal resolvedAmount = amount;
        for (BankTransactionRule rule : rules) {
            if (matches(rule, name, bankCategory, type)) {
                if (rule.isExcludeMatch()) {
                    return 0;
                }
                if (!nameResolved && rule.getMappedName() != null && !rule.getMappedName().isBlank()) {
                    resolvedName = rule.getMappedName();
                    nameResolved = true;
                }
                if (!categoryResolved
                        && rule.getMappedCategory() != null
                        && rule.getMappedCategory().getType() == type) {
                    resolvedCategory = rule.getMappedCategory();
                    categoryResolved = true;
                }
                if (rule.getAmountMultiplier() != null
                        && rule.getAmountMultiplier().compareTo(BigDecimal.ZERO) > 0
                        && rule.getAmountMultiplier().compareTo(BigDecimal.ONE) != 0) {
                    resolvedAmount = resolvedAmount
                            .multiply(rule.getAmountMultiplier())
                            .setScale(2, RoundingMode.HALF_UP)
                            .abs();
                }
                if (nameResolved && categoryResolved) {
                    break;
                }
            }
        }

        if (resolvedAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return 0;
        }

        Transaction transaction = new Transaction(resolvedName, resolvedAmount, date, type, user);
        transaction.setAccount(account);
        transaction.setCategory(resolvedCategory);
        transaction.setAffectsBalance(false);
        transaction.setBankCategory(bankCategory);
        transaction.setExternalId(externalId);

        transactionDao.save(transaction);
        return 1;
    }

    private boolean matches(BankTransactionRule rule, String name, String bankCategory,
                            TransactionType type) {
        boolean nameMatch = rule.getNamePattern() == null
                || rule.getNamePattern().isBlank()
                || (name != null && name.toLowerCase().contains(rule.getNamePattern().toLowerCase()));

        boolean categoryMatch = rule.getBankCategory() == null
                || rule.getBankCategory().isBlank()
                || (bankCategory != null
                    && bankCategory.equalsIgnoreCase(rule.getBankCategory()));

        boolean hasAnyCriterion = (rule.getNamePattern() != null && !rule.getNamePattern().isBlank())
            || (rule.getBankCategory() != null && !rule.getBankCategory().isBlank())
            || rule.getTransactionType() != null;

        boolean typeMatch = rule.getTransactionType() == null
            || rule.getTransactionType() == type;

        return hasAnyCriterion && nameMatch && categoryMatch && typeMatch;
    }

    private void updateBalance(String ebAccountId, Account account) {
        try {
            JsonNode balanceRoot = enableBankingClient.fetchBalances(ebAccountId);
            // Enable Banking returns: { balances: [ { balance_amount: { amount, currency }, balance_type } ] }
            JsonNode balances = balanceRoot.path("balances");
            if (balances.isArray() && !balances.isEmpty()) {
                // Prefer "interimAvailable" or "expected", fall back to first
                JsonNode chosen = balances.get(0);
                for (JsonNode b : balances) {
                    String bType = b.path("balance_type").asText("");
                    if ("interimAvailable".equals(bType) || "expected".equals(bType)) {
                        chosen = b;
                        break;
                    }
                }
                BigDecimal bal = new BigDecimal(
                        chosen.path("balance_amount").path("amount").asText("0"));
                account.setBalance(bal);
                // Auto-update currency from the bank (imported, not typed manually).
                String balCurrency = chosen.path("balance_amount").path("currency").asText(null);
                if (balCurrency != null && balCurrency.matches("[A-Z]{3}")) {
                    account.setCurrency(balCurrency);
                }
            }
        } catch (EnableBankingException e) {
            log.warn("Could not fetch balance for EB account {}: {}",
                    ebAccountId, e.getMessage());
        }
    }

    private LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) {
            return LocalDate.now();
        }
        try {
            return LocalDate.parse(raw, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (DateTimeParseException e) {
            return LocalDate.now();
        }
    }
}
