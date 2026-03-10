package Balio.web.truelayer;

import Balio.web.model.entities.BankConnection;
import Balio.web.model.entities.BankConnectionDao;
import Balio.web.oauth.OAuthTokenResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Manages TrueLayer OAuth tokens: persisting, refreshing when expired,
 * and providing a valid access-token on demand.
 */
@Service
public class TrueLayerTokenService {

    private static final Logger log = LoggerFactory.getLogger(TrueLayerTokenService.class);
    private static final long EXPIRY_MARGIN_SECONDS = 60;

    private final TrueLayerClient trueLayerClient;
    private final BankConnectionDao bankConnectionDao;

    public TrueLayerTokenService(TrueLayerClient trueLayerClient, BankConnectionDao bankConnectionDao) {
        this.trueLayerClient = trueLayerClient;
        this.bankConnectionDao = bankConnectionDao;
    }

    /**
     * Returns a valid access token for the given bank connection,
     * refreshing it transparently if it is expired or about to expire.
     */
    @Transactional
    public String getValidAccessToken(BankConnection connection) {
        if (isExpired(connection)) {
            log.info("Access token expired for connection={}, refreshing...", connection.getId());
            OAuthTokenResponse response = trueLayerClient.refreshAccessToken(connection.getRefreshToken());
            connection.setAccessToken(response.getAccessToken());
            connection.setRefreshToken(response.getRefreshToken());
            connection.setTokenExpiry(response.getExpiresAt());
            bankConnectionDao.save(connection);
        }
        return connection.getAccessToken();
    }

    private boolean isExpired(BankConnection connection) {
        return connection.getTokenExpiry()
                .isBefore(Instant.now().plusSeconds(EXPIRY_MARGIN_SECONDS));
    }
}
