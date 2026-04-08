package Balio.web.oauth;

/**
 * Generic OAuth2 client contract.
 * Each provider (TrueLayer, Google, …) implements this interface so the rest of the
 * application can handle authorization flows in a uniform way.
 */
public interface OAuthClient {

    /**
     * Builds the authorization URL the user must visit to grant consent.
     *
     * @param state opaque value to correlate the callback with the original request
     * @return full authorization URL
     */
    String buildAuthorizationUrl(String state);

    /**
     * Exchanges the authorization code received in the callback for tokens.
     */
    OAuthTokenResponse exchangeCode(String code);

    /**
     * Refreshes an expired access token.
     */
    OAuthTokenResponse refreshAccessToken(String refreshToken);
}
