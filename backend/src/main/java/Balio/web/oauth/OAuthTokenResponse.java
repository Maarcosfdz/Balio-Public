package Balio.web.oauth;

import java.time.Instant;

/**
 * Provider-agnostic token response returned after an OAuth2 code exchange or refresh.
 * Reusable for TrueLayer, Google, or any other OAuth2 provider.
 */
public class OAuthTokenResponse {

    private final String accessToken;
    private final String refreshToken;
    private final Instant expiresAt;

    public OAuthTokenResponse(String accessToken, String refreshToken, Instant expiresAt) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.expiresAt = expiresAt;
    }

    public String getAccessToken() { return accessToken; }
    public String getRefreshToken() { return refreshToken; }
    public Instant getExpiresAt() { return expiresAt; }
}
