package Balio.web.enablebanking;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Map;

/**
 * Low-level HTTP client for the Enable Banking API.
 *
 * <p>Authentication uses RS256 JWT:
 * <ul>
 *   <li>Header: {@code { "alg": "RS256", "kid": "<applicationId>" }}</li>
 *   <li>Payload: {@code { "iss": "<applicationId>", "aud": "enablebanking.com",
 *       "iat": <now>, "exp": <now+3600> }}</li>
 * </ul>
 * The private key is read once from the .pem file on first use and the JWT is
 * cached for 55 minutes to avoid rebuilding it on every single request.
 */
@Component
public class EnableBankingClient {

    private static final Logger log = LoggerFactory.getLogger(EnableBankingClient.class);

    private final EnableBankingProperties props;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    /** Cached JWT and the time it was generated. */
    private volatile String cachedJwt;
    private volatile Instant jwtGeneratedAt;

    /** Lazily loaded private key. */
    private volatile PrivateKey privateKey;

    public EnableBankingClient(EnableBankingProperties props, ObjectMapper objectMapper) {
        this.props = props;
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = objectMapper;
    }

    // ── ASPSPs (banks) ───────────────────────────────────────────────────

    /** Lists available ASPSPs (banks) for a given country code (e.g. "ES"). */
    public JsonNode listAspsps(String countryCode) {
        HttpRequest request = authGet("/aspsps?country=" + countryCode);
        return sendRequest(request);
    }

    // ── AUTHORIZATION ────────────────────────────────────────────────────

    /**
     * Starts an authorization session. The user must visit the returned URL
     * to authenticate at their bank.
     */
    public JsonNode startAuth(String aspspName, String aspspCountry, String state) {
        String validUntil = Instant.now().plus(90, ChronoUnit.DAYS).toString();
        Map<String, Object> body = Map.of(
                "access", Map.of("valid_until", validUntil),
                "aspsp", Map.of("name", aspspName, "country", aspspCountry),
                "state", state,
                "redirect_url", props.getRedirectUri(),
                "psu_type", "personal"
        );
        HttpRequest request = authPost("/auth", body);
        return sendRequest(request);
    }

    /** Completes the authorization after the user returns from the bank. */
    public JsonNode createSession(String code) {
        Map<String, Object> body = Map.of("code", code);
        HttpRequest request = authPost("/sessions", body);
        return sendRequest(request);
    }

    /** Retrieves session details (status and accounts). */
    public JsonNode getSession(String sessionId) {
        HttpRequest request = authGet("/sessions/" + sessionId);
        return sendRequest(request);
    }

    // ── ACCOUNT DATA ─────────────────────────────────────────────────────

    /** Fetches balances for a connected account. */
    public JsonNode fetchBalances(String accountId) {
        HttpRequest request = authGet("/accounts/" + accountId + "/balances");
        return sendRequest(request);
    }

    /** Fetches transactions for a connected account (last 90 days). */
    public JsonNode fetchTransactions(String accountId) {
        return fetchTransactions(accountId, 90);
    }

    /** Fetches transactions for a connected account going back {@code lookBackDays} days. */
    public JsonNode fetchTransactions(String accountId, int lookBackDays) {
        String dateFrom = Instant.now().minus(lookBackDays, ChronoUnit.DAYS)
                .toString().substring(0, 10);
        HttpRequest request = authGet(
                "/accounts/" + accountId + "/transactions?date_from=" + dateFrom);
        return sendRequest(request);
    }

    // ── JWT ──────────────────────────────────────────────────────────────

    /**
     * Returns a valid Bearer JWT, re-generating it if it is older than 55 minutes.
     */
    private String bearerToken() {
        if (cachedJwt == null || jwtGeneratedAt == null
                || Instant.now().isAfter(jwtGeneratedAt.plusSeconds(55 * 60))) {
            cachedJwt = buildJwt();
            jwtGeneratedAt = Instant.now();
        }
        return cachedJwt;
    }

    /**
     * Builds the RS256 JWT manually to guarantee exact claim serialization.
     * JJWT 0.12.x routes `.claim("aud", ...)` through its audience builder which
     * may serialize to a JSON array; Enable Banking requires a plain string value.
     */
    private String buildJwt() {
        PrivateKey key = resolvePrivateKey();
        Instant now = Instant.now();
        try {
            Base64.Encoder b64 = Base64.getUrlEncoder().withoutPadding();

            // Header — {"typ":"JWT","alg":"RS256","kid":"<applicationId>"}
            String headerJson = objectMapper.writeValueAsString(Map.of(
                    "typ", "JWT",
                    "alg", "RS256",
                    "kid", props.getApplicationId()
            ));
            String headerPart = b64.encodeToString(
                    headerJson.getBytes(StandardCharsets.UTF_8));

            // Payload — per Enable Banking docs:
            //   iss = "enablebanking.com" (constant, NOT the app ID)
            //   aud = "api.enablebanking.com"
            String payloadJson = objectMapper.writeValueAsString(Map.of(
                    "iss", "enablebanking.com",
                    "aud", "api.enablebanking.com",
                    "iat", now.getEpochSecond(),
                    "exp", now.plusSeconds(3600).getEpochSecond()
            ));
            String payloadPart = b64.encodeToString(
                    payloadJson.getBytes(StandardCharsets.UTF_8));

            // Signature
            String signingInput = headerPart + "." + payloadPart;
            Signature signer = Signature.getInstance("SHA256withRSA");
            signer.initSign(key);
            signer.update(signingInput.getBytes(StandardCharsets.UTF_8));
            String signaturePart = b64.encodeToString(signer.sign());

            String jwt = signingInput + "." + signaturePart;
            log.info("Generated JWT (decode at jwt.io to verify): {}", jwt);
            return jwt;
        } catch (Exception e) {
            throw new EnableBankingException("Failed to build Enable Banking JWT", e);
        }
    }

    /**
     * Loads the RSA private key from the configured .pem file (PKCS#8 format,
     * which is what the Enable Banking Control Panel generates via the browser).
     */
    private PrivateKey resolvePrivateKey() {
        if (privateKey != null) {
            return privateKey;
        }
        String path = props.getPrivateKeyPath();
        if (path == null || path.isBlank()) {
            throw new EnableBankingException(
                    "enable-banking.private-key-path is not configured. " +
                    "Set it to the path of the .pem file downloaded when registering your app.");
        }
        try {
            String pem = Files.readString(Path.of(path.replace("~",
                    System.getProperty("user.home"))));
            // Strip PEM headers and whitespace (supports PKCS#8 and PKCS#1 headers)
            String base64 = pem
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replace("-----BEGIN RSA PRIVATE KEY-----", "")
                    .replace("-----END RSA PRIVATE KEY-----", "")
                    .replaceAll("\\s+", "");
            byte[] der = Base64.getDecoder().decode(base64);
            PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(der);
            privateKey = KeyFactory.getInstance("RSA").generatePrivate(spec);
            log.info("Enable Banking private key loaded from: {}", path);
            return privateKey;
        } catch (Exception e) {
            throw new EnableBankingException(
                    "Failed to load Enable Banking private key from: " + path, e);
        }
    }

    // ── HTTP HELPERS ─────────────────────────────────────────────────────

    private HttpRequest authGet(String path) {
        return HttpRequest.newBuilder()
                .uri(URI.create(props.getApiBaseUrl() + path))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken())
                .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .GET()
                .build();
    }

    private HttpRequest authPost(String path, Map<String, Object> body) {
        String json;
        try {
            json = objectMapper.writeValueAsString(body);
        } catch (IOException e) {
            throw new EnableBankingException("Failed to serialize request body", e);
        }
        return HttpRequest.newBuilder()
                .uri(URI.create(props.getApiBaseUrl() + path))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken())
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
    }

    private JsonNode sendRequest(HttpRequest request) {
        try {
            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.error("Enable Banking API error: status={}, uri={}, body={}",
                        response.statusCode(), request.uri(), response.body());
                throw new EnableBankingException(
                        "Enable Banking API failed: HTTP " + response.statusCode()
                        + " — " + response.body());
            }
            return objectMapper.readTree(response.body());
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new EnableBankingException("Failed to contact Enable Banking API", e);
        }
    }
}
