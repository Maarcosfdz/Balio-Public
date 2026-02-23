package Balio.web.rest.dtos;

import Balio.web.enums.AccountType;

public class AccountSummaryDto {

    private String id;
    private String name;
    private AccountType type;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public AccountType getType() { return type; }
    public void setType(AccountType type) { this.type = type; }
}
