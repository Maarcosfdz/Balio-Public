package Balio.web.model.services;

import Balio.web.model.entities.RefreshToken;
import Balio.web.model.entities.RefreshTokenDao;
import Balio.web.model.entities.User;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;

@Service
@Transactional
public class RefreshTokenServiceImpl implements RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenServiceImpl.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Value("${project.jwt.refreshExpirationDays}")
    private long refreshExpirationDays;

    private final RefreshTokenDao refreshTokenDao;

    public RefreshTokenServiceImpl(RefreshTokenDao refreshTokenDao) {
        this.refreshTokenDao = refreshTokenDao;
    }

    @Override
    public RefreshToken createRefreshToken(User user) {
        // Revoke all existing tokens for this user
        refreshTokenDao.revokeAllByUserId(user.getId());

        String token = generateSecureToken();
        Instant expiresAt = Instant.now().plus(refreshExpirationDays, ChronoUnit.DAYS);

        RefreshToken refreshToken = new RefreshToken(token, user, expiresAt);
        refreshTokenDao.save(refreshToken);

        log.info("Refresh token created for user={}", user.getId());
        return refreshToken;
    }

    @Override
    public RefreshToken rotateRefreshToken(String token) {
        RefreshToken existing = refreshTokenDao.findByToken(token)
                .orElseThrow(() -> {
                    log.warn("Refresh token not found (possible reuse attack)");
                    return new IllegalArgumentException("Invalid refresh token");
                });

        if (existing.isRevoked()) {
            // Possible token reuse attack — revoke ALL tokens for this user
            log.warn("Revoked refresh token reuse detected for user={}, revoking all tokens",
                    existing.getUser().getId());
            refreshTokenDao.revokeAllByUserId(existing.getUser().getId());
            throw new IllegalArgumentException("Refresh token has been revoked");
        }

        if (existing.isExpired()) {
            existing.setRevoked(true);
            log.info("Expired refresh token used by user={}", existing.getUser().getId());
            throw new IllegalArgumentException("Refresh token has expired");
        }

        // Revoke current token (rotation)
        existing.setRevoked(true);

        // Create a new refresh token
        return createRefreshTokenDirectly(existing.getUser());
    }

    @Override
    public void revokeAllUserTokens(UUID userId) {
        refreshTokenDao.revokeAllByUserId(userId);
        log.info("All refresh tokens revoked for user={}", userId);
    }

    @Override
    public void purgeExpiredTokens() {
        refreshTokenDao.deleteAllExpired();
        log.debug("Expired refresh tokens purged");
    }

    /**
     * Creates a new refresh token without revoking existing ones
     * (used internally during rotation, where we already revoked the old one).
     */
    private RefreshToken createRefreshTokenDirectly(User user) {
        String token = generateSecureToken();
        Instant expiresAt = Instant.now().plus(refreshExpirationDays, ChronoUnit.DAYS);

        RefreshToken refreshToken = new RefreshToken(token, user, expiresAt);
        refreshTokenDao.save(refreshToken);

        log.info("Refresh token rotated for user={}", user.getId());
        return refreshToken;
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[64];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
