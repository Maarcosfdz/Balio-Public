package Balio.web.rest.common;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DisplayName("JwtGenerator unit tests")
class JwtGeneratorTest {

    // 48-byte Base64 key (>= 256 bits) required by HMAC-SHA256
    private static final String SIGN_KEY =
            "TestSecretKeyForJwtThatIsLongEnoughForHmacSha256AlgoOK!";
    private static final long EXPIRATION_MINUTES = 30L;

    private JwtGenerator jwtGenerator;

    @BeforeEach
    void setUp() throws Exception {
        jwtGenerator = new JwtGenerator();
        setField(jwtGenerator, "signKey", SIGN_KEY);
        setField(jwtGenerator, "accessExpirationMinutes", EXPIRATION_MINUTES);
    }

    @Test
    @DisplayName("generateAccessToken returns a non-null, non-blank JWT string")
    void generateAccessToken_returnsNonBlankToken() {
        UUID userId = UUID.randomUUID();

        String token = jwtGenerator.generateAccessToken(userId);

        assertNotNull(token);
        assertEquals(3, token.split("\\.").length, "JWT should have 3 dot-separated parts");
    }

    @Test
    @DisplayName("extractUserId returns the same userId that was encoded")
    void extractUserId_roundtrip() {
        UUID userId = UUID.randomUUID();
        String token = jwtGenerator.generateAccessToken(userId);

        UUID extracted = jwtGenerator.extractUserId(token);

        assertEquals(userId, extracted);
    }

    @Test
    @DisplayName("extractTokenType returns 'access' for an access token")
    void extractTokenType_returnsAccess() {
        String token = jwtGenerator.generateAccessToken(UUID.randomUUID());

        String type = jwtGenerator.extractTokenType(token);

        assertEquals("access", type);
    }

    @Test
    @DisplayName("extractUserId throws for a tampered / invalid token")
    void extractUserId_throwsForInvalidToken() {
        assertThrows(Exception.class,
                () -> jwtGenerator.extractUserId("this.is.not.a.valid.jwt"));
    }

    @Test
    @DisplayName("extractTokenType throws for a tampered / invalid token")
    void extractTokenType_throwsForInvalidToken() {
        assertThrows(Exception.class,
                () -> jwtGenerator.extractTokenType("bad.token.value"));
    }

    @Test
    @DisplayName("two tokens for different users are distinct")
    void generateAccessToken_differentUsersProduceDifferentTokens() {
        String t1 = jwtGenerator.generateAccessToken(UUID.randomUUID());
        String t2 = jwtGenerator.generateAccessToken(UUID.randomUUID());

        org.junit.jupiter.api.Assertions.assertNotEquals(t1, t2);
    }

    // ── helper ────────────────────────────────────────────────────────────────

    private static void setField(Object target, String name, Object value) throws Exception {
        Field f = target.getClass().getDeclaredField(name);
        f.setAccessible(true);
        f.set(target, value);
    }
}
