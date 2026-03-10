package Balio.web.rest.dtos;

import java.time.Instant;

public class BankConnectionDto {

    private String id;
    private String accountId;
    private String provider;
    private Instant lastSync;
    private Instant consentExpires;
    private boolean linked;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getAccountId() { return accountId; }
    public void setAccountId(String accountId) { this.accountId = accountId; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public Instant getLastSync() { return lastSync; }
    public void setLastSync(Instant lastSync) { this.lastSync = lastSync; }

    public Instant getConsentExpires() { return consentExpires; }
    public void setConsentExpires(Instant consentExpires) { this.consentExpires = consentExpires; }

    public boolean isLinked() { return linked; }
    public void setLinked(boolean linked) { this.linked = linked; }
}
