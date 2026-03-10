package Balio.web.truelayer;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Maps the truelayer.* properties from application.yaml.
 */
@Configuration
@ConfigurationProperties(prefix = "truelayer")
public class TrueLayerProperties {

    private String clientId;
    private String clientSecret;
    private String redirectUri;
    private String authBaseUrl = "https://auth.truelayer-sandbox.com";
    private String apiBaseUrl = "https://api.truelayer-sandbox.com";

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getClientSecret() { return clientSecret; }
    public void setClientSecret(String clientSecret) { this.clientSecret = clientSecret; }

    public String getRedirectUri() { return redirectUri; }
    public void setRedirectUri(String redirectUri) { this.redirectUri = redirectUri; }

    public String getAuthBaseUrl() { return authBaseUrl; }
    public void setAuthBaseUrl(String authBaseUrl) { this.authBaseUrl = authBaseUrl; }

    public String getApiBaseUrl() { return apiBaseUrl; }
    public void setApiBaseUrl(String apiBaseUrl) { this.apiBaseUrl = apiBaseUrl; }
}
