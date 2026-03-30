package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public class TransactionDto {

    @NotBlank
    @Size(max = 120)
    private String name;

    @NotNull
    @Positive
    private BigDecimal amount;

    private LocalDate date;

    private UUID accountId;

    private UUID categoryId;

    private Boolean affectsBalance;

    private TransactionType type; // usado en update

    // ── Currency (optional, for cross-currency transactions) ──
    private BigDecimal originalAmount;
    private String originalCurrency;
    private BigDecimal exchangeRate;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public UUID getAccountId() { return accountId; }
    public void setAccountId(UUID accountId) { this.accountId = accountId; }

    public UUID getCategoryId() { return categoryId; }
    public void setCategoryId(UUID categoryId) { this.categoryId = categoryId; }

    public Boolean getAffectsBalance() { return affectsBalance; }
    public void setAffectsBalance(Boolean affectsBalance) { this.affectsBalance = affectsBalance; }

    public TransactionType getType() { return type; }
    public void setType(TransactionType type) { this.type = type; }

    public BigDecimal getOriginalAmount() { return originalAmount; }
    public void setOriginalAmount(BigDecimal originalAmount) { this.originalAmount = originalAmount; }

    public String getOriginalCurrency() { return originalCurrency; }
    public void setOriginalCurrency(String originalCurrency) { this.originalCurrency = originalCurrency; }

    public BigDecimal getExchangeRate() { return exchangeRate; }
    public void setExchangeRate(BigDecimal exchangeRate) { this.exchangeRate = exchangeRate; }
}
