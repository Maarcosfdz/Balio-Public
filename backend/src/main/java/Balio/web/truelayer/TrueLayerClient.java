package Balio.web.truelayer;

import Balio.web.oauth.OAuthClient;
import Balio.web.oauth.OAuthTokenResponse;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Low-level HTTP client for the TrueLayer API.
 * Implements the generic OAuthClient so the rest of the app only depends on the interface.
 */
@Component
public class TrueLayerClient implements OAuthClient {

    private static final Logger log = LoggerFactory.getLogger(TrueLayerClient.class);
    private static final String SCOPES =
            "info accounts balance cards transactions direct_debits standing_orders offline_access";
    private static final String PROVIDERS = "uk-cs-mock uk-ob-all uk-oauth-all";

    private final TrueLayerProperties props;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public TrueLayerClient(TrueLayerProperties props, ObjectMapper objectMapper) {
        this.props = props;
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = objectMapper;
    }

    // ── OAuthClient ──────────────────────────────────────────────────────

    @Override
    public String buildAuthorizationUrl(String state) {
        return props.getAuthBaseUrl() + "/"
               + "?response_type=code"
               + "&client_id=" + encode(props.getClientId())
               + "&scope=" + encode(SCOPES)
               + "&redirect_uri=" + encode(props.getRedirectUri())
               + "&state=" + encode(state)
               + "&providers=" + encode(PROVIDERS);
    }

    @Override
    public OAuthTokenResponse exchangeCode(String code) {
        Map<String, String> params = Map.of(
                "grant_type", "authorization_code",
                "client_id", props.getClientId(),
                "client_secret", props.getClientSecret(),
                "redirect_uri", props.getRedirectUri(),
                "code", code
        );
        return postToken(params);
    }

    @Override
    public OAuthTokenResponse refreshAccessToken(String refreshToken) {
        Map<String, String> params = Map.of(
                "grant_type", "refresh_token",
                "client_id", props.getClientId(),
                "client_secret", props.getClientSecret(),
                "refresh_token", refreshToken
        );
        return postToken(params);
    }

    // ── DATA API ─────────────────────────────────────────────────────────

    /**
     * Lists accounts available in the TrueLayer connection.
     * Returns the raw JSON array node under "results".
     */
    public JsonNode fetchAccounts(String accessToken) {
        return getDataApi("/data/v1/accounts", accessToken);
    }

    /**
     * Fetches the balance of a specific TrueLayer account.
     */
    public JsonNode fetchBalance(String accessToken, String truelayerAccountId) {
        return getDataApi("/data/v1/accounts/" + truelayerAccountId + "/balance", accessToken);
    }

    /**
     * Fetches transactions for a specific TrueLayer account.
     */
    public JsonNode fetchTransactions(String accessToken, String truelayerAccountId) {
        return getDataApi("/data/v1/accounts/" + truelayerAccountId + "/transactions", accessToken);
    }

    // ── INTERNALS ────────────────────────────────────────────────────────

    private OAuthTokenResponse postToken(Map<String, String> params) {
        String body = params.entrySet().stream()
                .map(e -> encode(e.getKey()) + "=" + encode(e.getValue()))
                .collect(Collectors.joining("&"));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(props.getAuthBaseUrl() + "/connect/token"))
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_FORM_URLENCODED_VALUE)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.error("TrueLayer token request failed: status={}, body={}", response.statusCode(), response.body());
                throw new TrueLayerException("Token exchange failed: HTTP " + response.statusCode());
            }
            JsonNode json = objectMapper.readTree(response.body());
            long expiresIn = json.path("expires_in").asLong(3600);
            return new OAuthTokenResponse(
                    json.path("access_token").asText(),
                    json.path("refresh_token").asText(),
                    Instant.now().plusSeconds(expiresIn)
            );
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new TrueLayerException("Failed to contact TrueLayer", e);
        }
    }

    private JsonNode getDataApi(String path, String accessToken) {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(props.getApiBaseUrl() + path))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .GET()
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.error("TrueLayer data API error: status={}, path={}", response.statusCode(), path);
                throw new TrueLayerException("Data API failed: HTTP " + response.statusCode());
            }
            return objectMapper.readTree(response.body()).path("results");
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new TrueLayerException("Failed to contact TrueLayer data API", e);
        }
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
