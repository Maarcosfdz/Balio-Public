package Balio.web.model.services;

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

import java.util.UUID;

@Service
@Transactional
public class BankServiceImpl implements BankService {

    private static final Logger log = LoggerFactory.getLogger(BankServiceImpl.class);

    private final AccountDao accountDao;
    private final BankConnectionDao bankConnectionDao;
    private final TrueLayerClient trueLayerClient;
    private final TrueLayerSyncService syncService;

    public BankServiceImpl(AccountDao accountDao,
                           BankConnectionDao bankConnectionDao,
                           TrueLayerClient trueLayerClient,
                           TrueLayerSyncService syncService) {
        this.accountDao = accountDao;
        this.bankConnectionDao = bankConnectionDao;
        this.trueLayerClient = trueLayerClient;
        this.syncService = syncService;
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

        return connection;
    }

    // ── SYNC ─────────────────────────────────────────────────────────────

    @Override
    public int syncTransactions(UUID userId, UUID accountId) throws InstanceNotFoundException {
        BankConnection connection = bankConnectionDao.findByAccountIdAndUserId(accountId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("BankConnection", accountId));

        return syncService.sync(connection);
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
