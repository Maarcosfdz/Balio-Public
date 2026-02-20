package Balio.web.model.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, unique = true, length = 255)
    private String token;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private boolean revoked = false;

    protected RefreshToken() {}

    public RefreshToken(String token, User user, Instant expiresAt) {
        this.token = token;
        this.user = user;
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
        this.revoked = false;
    }

    public UUID getId() { return id; }

    public String getToken() { return token; }

    public User getUser() { return user; }

    public Instant getExpiresAt() { return expiresAt; }

    public Instant getCreatedAt() { return createdAt; }

    public boolean isRevoked() { return revoked; }

    public void setRevoked(boolean revoked) { this.revoked = revoked; }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
}
