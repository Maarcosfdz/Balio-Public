package Balio.web.enablebanking;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Maps the enable-banking.* properties from application.yaml.
 * Credentials come from your Enable Banking dashboard.
 *
 * <p>Authentication uses RS256 JWT:
 * <ul>
 *   <li>{@code application-id} — UUID shown in the Control Panel (also the {@code kid} header)</li>
 *   <li>{@code private-key-path} — path to the .pem file downloaded when the app was registered</li>
 * </ul>
 */
@Configuration
@ConfigurationProperties(prefix = "enable-banking")
public class EnableBankingProperties {

    /**
     * Application UUID from the Enable Banking Control Panel.
     * Used as the {@code kid} header and {@code iss} claim in the JWT.
     */
    private String applicationId;

    /**
     * Absolute (or home-relative) path to the RSA private key .pem file
     * downloaded when registering the application.
     * Example: C:/Users/you/Downloads/9b6d5e63-03cd-4732-8b7a-75f298dc43fc.pem
     */
    private String privateKeyPath;

    /** Where the bank redirects after user login. */
    private String redirectUri;

    /** API base URL — defaults to production. */
    private String apiBaseUrl = "https://api.enablebanking.com";

    public String getApplicationId() { return applicationId; }
    public void setApplicationId(String applicationId) { this.applicationId = applicationId; }

    public String getPrivateKeyPath() { return privateKeyPath; }
    public void setPrivateKeyPath(String privateKeyPath) { this.privateKeyPath = privateKeyPath; }

    public String getRedirectUri() { return redirectUri; }
    public void setRedirectUri(String redirectUri) { this.redirectUri = redirectUri; }

    public String getApiBaseUrl() { return apiBaseUrl; }
    public void setApiBaseUrl(String apiBaseUrl) { this.apiBaseUrl = apiBaseUrl; }
}
