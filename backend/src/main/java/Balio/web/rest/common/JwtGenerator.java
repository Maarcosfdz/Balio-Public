package Balio.web.rest.common;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtGenerator {

    @Value("${project.jwt.signKey}")
    private String signKey;

    @Value("${project.jwt.accessExpirationMinutes}")
    private long accessExpirationMinutes;

    private SecretKey getSigningKey() {
        byte[] keyBytes = signKey.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateAccessToken(UUID userId) {
        long now = System.currentTimeMillis();
        long expirationMs = accessExpirationMinutes * 60 * 1000;

        return Jwts.builder()
                .subject(userId.toString())
                .claim("type", "access")
                .issuedAt(new Date(now))
                .expiration(new Date(now + expirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    public UUID extractUserId(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return UUID.fromString(claims.getSubject());
    }

    public String extractTokenType(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return (String) claims.get("type");
    }
}
