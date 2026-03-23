package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;

import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public class ScheduledTransactionUpdateDto {

    @Size(max = 120)
    private String name;

    @Positive
    private BigDecimal amount;

    private TransactionType type;
    private UUID accountId;
    private UUID categoryId;
    private Boolean affectsBalance;
    private Integer freqYears;
    private Integer freqMonths;
    private Integer freqWeeks;
    private Integer freqDays;
    private LocalDate startDate;
    private Boolean active;

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

    public Integer getFreqYears() { return freqYears; }
    public void setFreqYears(Integer freqYears) { this.freqYears = freqYears; }

    public Integer getFreqMonths() { return freqMonths; }
    public void setFreqMonths(Integer freqMonths) { this.freqMonths = freqMonths; }

    public Integer getFreqWeeks() { return freqWeeks; }
    public void setFreqWeeks(Integer freqWeeks) { this.freqWeeks = freqWeeks; }

    public Integer getFreqDays() { return freqDays; }
    public void setFreqDays(Integer freqDays) { this.freqDays = freqDays; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
