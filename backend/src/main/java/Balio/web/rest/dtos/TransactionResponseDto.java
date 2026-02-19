package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;

public class TransactionResponseDto {

    private String id;
    private String name;
    private BigDecimal amount;
    private LocalDate date;
    private TransactionType type;
    private boolean affectsBalance;
    private String accountId;
    private String accountName;
    private String categoryId;
    private String categoryName;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public TransactionType getType() { return type; }
    public void setType(TransactionType type) { this.type = type; }

    public boolean isAffectsBalance() { return affectsBalance; }
    public void setAffectsBalance(boolean affectsBalance) { this.affectsBalance = affectsBalance; }

    public String getAccountId() { return accountId; }
    public void setAccountId(String accountId) { this.accountId = accountId; }

    public String getAccountName() { return accountName; }
    public void setAccountName(String accountName) { this.accountName = accountName; }

    public String getCategoryId() { return categoryId; }
    public void setCategoryId(String categoryId) { this.categoryId = categoryId; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
}
