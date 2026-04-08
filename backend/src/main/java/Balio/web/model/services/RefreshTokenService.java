package Balio.web.model.services;

import Balio.web.model.entities.RefreshToken;
import Balio.web.model.entities.User;

import java.util.UUID;

/**
 * Service for managing refresh tokens used in JWT authentication.
 */
public interface RefreshTokenService {

    /**
     * Creates a new refresh token for the given user.
     * Revokes all previous active tokens for that user.
     */
    RefreshToken createRefreshToken(User user);

    /**
     * Validates a refresh token and returns a new access token + rotated refresh token.
     *
     * @throws IllegalArgumentException if the token is invalid, expired or revoked
     */
    RefreshToken rotateRefreshToken(String token);

    /**
     * Revokes all refresh tokens for a user (e.g., on password change or logout).
     */
    void revokeAllUserTokens(UUID userId);

    /**
     * Purges expired tokens from the database.
     */
    void purgeExpiredTokens();
}
