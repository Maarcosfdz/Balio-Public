package Balio.web.rest.dtos;

import Balio.web.enums.AccountType;

import jakarta.validation.constraints.Size;

public class AccountDto {

    @Size(max = 80)
    private String name;

    private AccountType type; // CASH / BANK / OTHER

    @Size(max = 3)
    private String currency;

    private Boolean setDefault;

    private Boolean syncDeletedTransactions;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public AccountType getType() { return type; }
    public void setType(AccountType type) { this.type = type; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public Boolean getSetDefault() { return setDefault; }
    public void setSetDefault(Boolean setDefault) { this.setDefault = setDefault; }

    public Boolean getSyncDeletedTransactions() { return syncDeletedTransactions; }
    public void setSyncDeletedTransactions(Boolean syncDeletedTransactions) {
        this.syncDeletedTransactions = syncDeletedTransactions;
    }
}
