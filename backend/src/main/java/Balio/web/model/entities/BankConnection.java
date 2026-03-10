package Balio.web.model.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "bank_connections")
public class BankConnection {

    @Id
    @GeneratedValue
    private UUID id;

    @OneToOne(optional = false)
    @JoinColumn(name = "account_id", unique = true)
    private Account account;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(length = 100)
    private String provider;

    @Column(name = "truelayer_account_id", length = 100)
    private String truelayerAccountId;

    @Column(name = "access_token", nullable = false, columnDefinition = "TEXT")
    private String accessToken;

    @Column(name = "refresh_token", nullable = false, columnDefinition = "TEXT")
    private String refreshToken;

    @Column(name = "token_expiry", nullable = false)
    private Instant tokenExpiry;

    @Column(name = "consent_expires")
    private Instant consentExpires;

    @Column(name = "last_sync")
    private Instant lastSync;

    protected BankConnection() {
    }

    public BankConnection(Account account, User user, String accessToken,
                          String refreshToken, Instant tokenExpiry) {
        this.account = account;
        this.user = user;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenExpiry = tokenExpiry;
    }

    // -------- GETTERS / SETTERS --------

    public UUID getId() { return id; }

    public Account getAccount() { return account; }

    public User getUser() { return user; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getTruelayerAccountId() { return truelayerAccountId; }
    public void setTruelayerAccountId(String truelayerAccountId) {
        this.truelayerAccountId = truelayerAccountId;
    }

    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }

    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }

    public Instant getTokenExpiry() { return tokenExpiry; }
    public void setTokenExpiry(Instant tokenExpiry) { this.tokenExpiry = tokenExpiry; }

    public Instant getConsentExpires() { return consentExpires; }
    public void setConsentExpires(Instant consentExpires) { this.consentExpires = consentExpires; }

    public Instant getLastSync() { return lastSync; }
    public void setLastSync(Instant lastSync) { this.lastSync = lastSync; }
}
