package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public class ScheduledTransactionDto {

    @NotBlank
    @Size(max = 120)
    private String name;

    @NotNull
    @Positive
    private BigDecimal amount;

    @NotNull
    private TransactionType type;

    private UUID accountId;
    private UUID categoryId;
    private Boolean affectsBalance;

    private int freqYears;
    private int freqMonths;
    private int freqWeeks;
    private int freqDays;

    @NotNull
    private LocalDate startDate;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public TransactionType getType() { return type; }
    public void setType(TransactionType type) { this.type = type; }

    public UUID getAccountId() { return accountId; }
    public void setAccountId(UUID accountId) { this.accountId = accountId; }

    public UUID getCategoryId() { return categoryId; }
    public void setCategoryId(UUID categoryId) { this.categoryId = categoryId; }

    public Boolean getAffectsBalance() { return affectsBalance; }
    public void setAffectsBalance(Boolean affectsBalance) { this.affectsBalance = affectsBalance; }

    public int getFreqYears() { return freqYears; }
    public void setFreqYears(int freqYears) { this.freqYears = freqYears; }

    public int getFreqMonths() { return freqMonths; }
    public void setFreqMonths(int freqMonths) { this.freqMonths = freqMonths; }

    public int getFreqWeeks() { return freqWeeks; }
    public void setFreqWeeks(int freqWeeks) { this.freqWeeks = freqWeeks; }

    public int getFreqDays() { return freqDays; }
    public void setFreqDays(int freqDays) { this.freqDays = freqDays; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
}
