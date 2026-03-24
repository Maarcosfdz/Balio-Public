package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;

public class TransactionSummaryDto {

    private String id;
    private String name;
    private TransactionType type;
    private BigDecimal amount;
    private LocalDate date;
    private String accountName;
    private String categoryName;
    private String categoryId;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public TransactionType getType() { return type; }
    public void setType(TransactionType type) { this.type = type; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getAccountName() { return accountName; }
    public void setAccountName(String accountName) { this.accountName = accountName; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public String getCategoryId() { return categoryId; }
    public void setCategoryId(String categoryId) { this.categoryId = categoryId; }

    // ── Currency ──
    private String currency;
    private String originalCurrency;
    private java.math.BigDecimal originalAmount;

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getOriginalCurrency() { return originalCurrency; }
    public void setOriginalCurrency(String originalCurrency) { this.originalCurrency = originalCurrency; }

    public java.math.BigDecimal getOriginalAmount() { return originalAmount; }
    public void setOriginalAmount(java.math.BigDecimal originalAmount) { this.originalAmount = originalAmount; }
}
