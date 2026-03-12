package Balio.web.model.services;

import Balio.web.enablebanking.EnableBankingClient;
import Balio.web.enablebanking.EnableBankingSyncService;
import Balio.web.enums.AccountType;
import Balio.web.model.Exceptions.AccountInvalidException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.AccountDao;
import Balio.web.model.entities.BankConnection;
import Balio.web.model.entities.BankConnectionDao;
import Balio.web.oauth.OAuthTokenResponse;
import Balio.web.truelayer.TrueLayerClient;
import Balio.web.truelayer.TrueLayerSyncService;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class BankServiceImpl implements BankService {

    private static final Logger log = LoggerFactory.getLogger(BankServiceImpl.class);
    private static final String PROVIDER_ENABLE_BANKING = "ENABLE_BANKING";

    private final AccountDao accountDao;
    private final BankConnectionDao bankConnectionDao;
    private final TrueLayerClient trueLayerClient;
    private final TrueLayerSyncService syncService;
    private final EnableBankingClient enableBankingClient;
    private final EnableBankingSyncService enableBankingSyncService;

    public BankServiceImpl(AccountDao accountDao,
                           BankConnectionDao bankConnectionDao,
                           TrueLayerClient trueLayerClient,
                           TrueLayerSyncService syncService,
                           EnableBankingClient enableBankingClient,
                           EnableBankingSyncService enableBankingSyncService) {
        this.accountDao = accountDao;
        this.bankConnectionDao = bankConnectionDao;
        this.trueLayerClient = trueLayerClient;
        this.syncService = syncService;
        this.enableBankingClient = enableBankingClient;
        this.enableBankingSyncService = enableBankingSyncService;
    }

    // ── INIT CONNECTION ──────────────────────────────────────────────────

    @Override
    public String initConnection(UUID userId, UUID accountId) throws InstanceNotFoundException {
        Account account = accountDao.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Account", accountId));

        if (account.getType() != AccountType.BANK) {
            throw new AccountInvalidException("Only BANK accounts can be linked");
        }
        if (bankConnectionDao.existsByAccountId(accountId)) {
            throw new AccountInvalidException("Account is already linked to a bank");
        }

        // Use accountId as the OAuth state to correlate the callback
        return trueLayerClient.buildAuthorizationUrl(accountId.toString());
    }

    // ── COMPLETE CONNECTION (OAuth callback) ─────────────────────────────

    @Override
    public BankConnection completeConnection(String state, String code) throws InstanceNotFoundException {
        UUID accountId;
        try {
            accountId = UUID.fromString(state);
        } catch (IllegalArgumentException e) {
            throw new AccountInvalidException("Invalid OAuth state");
        }

        Account account = accountDao.findById(accountId)
                .orElseThrow(() -> new InstanceNotFoundException("Account", accountId));

        if (bankConnectionDao.existsByAccountId(accountId)) {
            throw new AccountInvalidException("Account is already linked");
        }

        // Exchange code for tokens
        OAuthTokenResponse tokens = trueLayerClient.exchangeCode(code);

        // Pick the first TrueLayer account available
        JsonNode accounts = trueLayerClient.fetchAccounts(tokens.getAccessToken());
        String tlAccountId = null;
        String provider = null;
        if (accounts.isArray() && !accounts.isEmpty()) {
            JsonNode first = accounts.get(0);
            tlAccountId = first.path("account_id").asText(null);
            provider = first.path("provider").path("display_name").asText(null);
        }

        BankConnection connection = new BankConnection(
                account, account.getUser(),
                tokens.getAccessToken(), tokens.getRefreshToken(), tokens.getExpiresAt());
        connection.setTruelayerAccountId(tlAccountId);
        connection.setProvider(provider);

        bankConnectionDao.save(connection);
        log.info("Bank connection established: accountId={}, provider={}", accountId, provider);

        syncWithProvider(connection);

        return connection;
    }

    // ── SYNC ─────────────────────────────────────────────────────────────

    @Override
    public int syncTransactions(UUID userId, UUID accountId) throws InstanceNotFoundException {
        BankConnection connection = bankConnectionDao.findByAccountIdAndUserId(accountId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("BankConnection", accountId));

        return syncWithProvider(connection);
    }

    @Override
    public int syncStaleConnections(UUID userId, int staleMinutes) {
        Instant threshold = Instant.now().minus(staleMinutes, ChronoUnit.MINUTES);
        int imported = 0;
        for (BankConnection connection : bankConnectionDao.findAllByUserId(userId)) {
            if (connection.getLastSync() == null || connection.getLastSync().isBefore(threshold)) {
                imported += syncWithProvider(connection);
            }
        }
        return imported;
    }

    @Override
    public int syncAllConnections(UUID userId) {
        int imported = 0;
        for (BankConnection connection : bankConnectionDao.findAllByUserId(userId)) {
            imported += syncWithProvider(connection);
        }
        return imported;
    }

    @Override
    @Transactional(readOnly = true)
    public List<BankConnection> findLinkedConnections(UUID userId) {
        return bankConnectionDao.findAllByUserId(userId);
    }

    private int syncWithProvider(BankConnection connection) {
        if (PROVIDER_ENABLE_BANKING.equalsIgnoreCase(connection.getProvider())) {
            return enableBankingSyncService.sync(connection);
        }
        return syncService.sync(connection);
    }

    // ── ENABLE BANKING: INIT ─────────────────────────────────────────────

    @Override
    public String initEnableBankingConnection(UUID userId, UUID accountId,
                                              String aspspName, String aspspCountry)
            throws InstanceNotFoundException {
        Account account = accountDao.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Account", accountId));

        if (account.getType() != AccountType.BANK) {
            throw new AccountInvalidException("Only BANK accounts can be linked");
        }
        if (bankConnectionDao.existsByAccountId(accountId)) {
            throw new AccountInvalidException("Account is already linked to a bank");
        }

        JsonNode authResponse = enableBankingClient.startAuth(
                aspspName, aspspCountry, accountId.toString());
        return authResponse.path("url").asText();
    }

    // ── ENABLE BANKING: COMPLETE ─────────────────────────────────────────

    @Override
    public BankConnection completeEnableBankingConnection(String state, String code)
            throws InstanceNotFoundException {
        UUID accountId;
        try {
            accountId = UUID.fromString(state);
        } catch (IllegalArgumentException e) {
            throw new AccountInvalidException("Invalid Enable Banking state");
        }

        Account account = accountDao.findById(accountId)
                .orElseThrow(() -> new InstanceNotFoundException("Account", accountId));

        if (bankConnectionDao.existsByAccountId(accountId)) {
            throw new AccountInvalidException("Account is already linked");
        }

        // Complete auth → creates a session with accounts
        JsonNode session = enableBankingClient.createSession(code);
        log.info("Enable Banking createSession raw response: {}", session);
        String sessionId = session.path("session_id").asText(null);

        // Pick the first account
        JsonNode accounts = session.path("accounts");
        log.info("Enable Banking accounts node (isArray={}, size={}): {}",
                accounts.isArray(), accounts.size(), accounts);
        String ebAccountId = null;
        if (accounts.isArray() && !accounts.isEmpty()) {
            JsonNode first = accounts.get(0);
            log.info("Enable Banking first account node: {}", first);
            ebAccountId = first.path("uid").asText(
                    first.path("account_id").asText(null));
        }
        log.info("Enable Banking extracted: sessionId={}, ebAccountId={}", sessionId, ebAccountId);

        BankConnection connection = new BankConnection(
                account, account.getUser(), null, null, null);
        connection.setProvider(PROVIDER_ENABLE_BANKING);
        connection.setTruelayerAccountId(ebAccountId);
        connection.setSessionId(sessionId);

        bankConnectionDao.save(connection);
        log.info("Enable Banking connection established: accountId={}, sessionId={}",
                accountId, sessionId);
        syncWithProvider(connection);
        return connection;
    }

    // ── STATUS ───────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public BankConnection getConnection(UUID userId, UUID accountId) {
        return bankConnectionDao.findByAccountIdAndUserId(accountId, userId).orElse(null);
    }

    // ── UNLINK ───────────────────────────────────────────────────────────

    @Override
    public void unlinkAccount(UUID userId, UUID accountId) throws InstanceNotFoundException {
        BankConnection connection = bankConnectionDao.findByAccountIdAndUserId(accountId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("BankConnection", accountId));

        bankConnectionDao.delete(connection);
        log.info("Bank connection removed: accountId={}", accountId);
    }
}
