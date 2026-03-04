package Balio.web.rest.dtos;

import Balio.web.enums.AccountType;

import java.math.BigDecimal;

public class AccountSummaryDto {

    private String id;
    private String name;
    private AccountType type;
    private String currency;
    private BigDecimal balance;
    private boolean isDefault;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public AccountType getType() { return type; }
    public void setType(AccountType type) { this.type = type; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }

    public boolean isDefault() { return isDefault; }
    public void setDefault(boolean isDefault) { this.isDefault = isDefault; }
}
