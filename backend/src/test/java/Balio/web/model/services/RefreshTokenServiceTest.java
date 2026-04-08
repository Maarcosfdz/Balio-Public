package Balio.web.model.services;

import Balio.web.model.entities.RefreshToken;
import Balio.web.model.entities.RefreshTokenDao;
import Balio.web.model.entities.User;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link RefreshTokenServiceImpl}.
 * <p>
 * Uses Mockito (no Spring context) to test token creation, rotation,
 * revocation, expiration detection, and reuse-attack protection.
 */
@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    /* ───── shared constants ───── */
    private static final UUID USER_ID = UUID.randomUUID();
    private static final String EXISTING_TOKEN_VALUE = "existing-refresh-token-value";

    @Mock
    private RefreshTokenDao refreshTokenDao;

    @InjectMocks
    private RefreshTokenServiceImpl refreshTokenService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User("Nick", "nick@example.com", "encodedPwd");
        setFieldViaReflection(user, "id", USER_ID);

        // Set refreshExpirationDays via reflection (normally injected by @Value)
        setFieldViaReflection(refreshTokenService, "refreshExpirationDays", 7L);
    }

    /* ═══════════════════════════════════════════════════════════
     *  createRefreshToken
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("createRefreshToken")
    class CreateRefreshTokenTests {

        @Test
        @DisplayName("should create a new refresh token for the user")
        void shouldCreateRefreshToken_whenUserProvided() {
            RefreshToken result = refreshTokenService.createRefreshToken(user);

            assertNotNull(result);
            assertNotNull(result.getToken());
            assertFalse(result.getToken().isEmpty());
            assertEquals(user, result.getUser());
            assertFalse(result.isRevoked());
            assertTrue(result.getExpiresAt().isAfter(Instant.now()));

            verify(refreshTokenDao).revokeAllByUserId(USER_ID);
            verify(refreshTokenDao).save(any(RefreshToken.class));
        }

        @Test
        @DisplayName("should revoke all existing tokens before creating new one")
        void shouldRevokeExistingTokens_beforeCreatingNew() {
            refreshTokenService.createRefreshToken(user);

            // Verify revocation happens before save (order matters)
            var inOrder = org.mockito.Mockito.inOrder(refreshTokenDao);
            inOrder.verify(refreshTokenDao).revokeAllByUserId(USER_ID);
            inOrder.verify(refreshTokenDao).save(any(RefreshToken.class));
        }

        @Test
        @DisplayName("should set expiration to configured days in the future")
        void shouldSetCorrectExpiration() {
            RefreshToken result = refreshTokenService.createRefreshToken(user);

            Instant expectedMin = Instant.now().plus(6, ChronoUnit.DAYS);
            Instant expectedMax = Instant.now().plus(8, ChronoUnit.DAYS);

            assertTrue(result.getExpiresAt().isAfter(expectedMin),
                    "Expiration should be at least 6 days from now");
            assertTrue(result.getExpiresAt().isBefore(expectedMax),
                    "Expiration should be at most 8 days from now");
        }

        @Test
        @DisplayName("should generate unique tokens on successive calls")
        void shouldGenerateUniqueTokens() {
            RefreshToken token1 = refreshTokenService.createRefreshToken(user);
            RefreshToken token2 = refreshTokenService.createRefreshToken(user);

            assertNotEquals(token1.getToken(), token2.getToken());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  rotateRefreshToken
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("rotateRefreshToken")
    class RotateRefreshTokenTests {

        @Test
        @DisplayName("should rotate valid token: revoke old, create new")
        void shouldRotateToken_whenValidAndNotExpired() {
            RefreshToken existing = new RefreshToken(
                    EXISTING_TOKEN_VALUE, user,
                    Instant.now().plus(7, ChronoUnit.DAYS));
            setFieldViaReflection(existing, "id", UUID.randomUUID());

            when(refreshTokenDao.findByToken(EXISTING_TOKEN_VALUE))
                    .thenReturn(Optional.of(existing));

            RefreshToken result = refreshTokenService.rotateRefreshToken(EXISTING_TOKEN_VALUE);

            // Old token should be revoked
            assertTrue(existing.isRevoked());

            // New token should be different and valid
            assertNotNull(result);
            assertNotEquals(EXISTING_TOKEN_VALUE, result.getToken());
            assertEquals(user, result.getUser());
            assertFalse(result.isRevoked());

            // Should save the new token
            verify(refreshTokenDao).save(any(RefreshToken.class));
        }

        @Test
        @DisplayName("should throw IllegalArgumentException when token not found")
        void shouldThrowIllegalArgument_whenTokenNotFound() {
            when(refreshTokenDao.findByToken("unknown-token"))
                    .thenReturn(Optional.empty());

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> refreshTokenService.rotateRefreshToken("unknown-token"));

            assertEquals("Invalid refresh token", ex.getMessage());
        }

        @Test
        @DisplayName("should throw IllegalArgumentException and revoke all user tokens when revoked token is reused")
        void shouldThrowAndRevokeAll_whenRevokedTokenReused() {
            RefreshToken revokedToken = new RefreshToken(
                    EXISTING_TOKEN_VALUE, user,
                    Instant.now().plus(7, ChronoUnit.DAYS));
            revokedToken.setRevoked(true);

            when(refreshTokenDao.findByToken(EXISTING_TOKEN_VALUE))
                    .thenReturn(Optional.of(revokedToken));

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> refreshTokenService.rotateRefreshToken(EXISTING_TOKEN_VALUE));

            assertEquals("Refresh token has been revoked", ex.getMessage());

            // Security: all user tokens should be revoked on reuse detection
            verify(refreshTokenDao).revokeAllByUserId(USER_ID);
        }

        @Test
        @DisplayName("should throw IllegalArgumentException when token is expired")
        void shouldThrowIllegalArgument_whenTokenExpired() {
            RefreshToken expiredToken = new RefreshToken(
                    EXISTING_TOKEN_VALUE, user,
                    Instant.now().minus(1, ChronoUnit.DAYS)); // expired yesterday

            when(refreshTokenDao.findByToken(EXISTING_TOKEN_VALUE))
                    .thenReturn(Optional.of(expiredToken));

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> refreshTokenService.rotateRefreshToken(EXISTING_TOKEN_VALUE));

            assertEquals("Refresh token has expired", ex.getMessage());

            // Expired token should be marked as revoked
            assertTrue(expiredToken.isRevoked());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  revokeAllUserTokens
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("revokeAllUserTokens")
    class RevokeAllUserTokensTests {

        @Test
        @DisplayName("should delegate to DAO to revoke all tokens for user")
        void shouldRevokeAllTokens() {
            refreshTokenService.revokeAllUserTokens(USER_ID);

            verify(refreshTokenDao).revokeAllByUserId(USER_ID);
        }

        @Test
        @DisplayName("should work even if user has no tokens")
        void shouldNotThrow_whenNoTokensExist() {
            // revokeAllByUserId is a @Modifying query → no exception if 0 rows updated
            refreshTokenService.revokeAllUserTokens(USER_ID);

            verify(refreshTokenDao).revokeAllByUserId(USER_ID);
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  purgeExpiredTokens
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("purgeExpiredTokens")
    class PurgeExpiredTokensTests {

        @Test
        @DisplayName("should delegate to DAO to delete all expired tokens")
        void shouldPurgeExpiredTokens() {
            refreshTokenService.purgeExpiredTokens();

            verify(refreshTokenDao).deleteAllExpired();
        }
    }

    /* ───── helper ───── */

    private static void setFieldViaReflection(Object target, String fieldName, Object value) {
        try {
            java.lang.reflect.Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException("Cannot set field " + fieldName, e);
        }
    }
}
