package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;

public class ScheduledTransactionResponseDto {

    private String id;
    private String name;
    private BigDecimal amount;
    private TransactionType type;
    private boolean affectsBalance;
    private int freqYears;
    private int freqMonths;
    private int freqWeeks;
    private int freqDays;
    private LocalDate startDate;
    private LocalDate lastExecution;
    private LocalDate nextExecution;
    private boolean active;
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

    public TransactionType getType() { return type; }
    public void setType(TransactionType type) { this.type = type; }

    public boolean isAffectsBalance() { return affectsBalance; }
    public void setAffectsBalance(boolean affectsBalance) { this.affectsBalance = affectsBalance; }

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

    public LocalDate getLastExecution() { return lastExecution; }
    public void setLastExecution(LocalDate lastExecution) { this.lastExecution = lastExecution; }

    public LocalDate getNextExecution() { return nextExecution; }
    public void setNextExecution(LocalDate nextExecution) { this.nextExecution = nextExecution; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public String getAccountId() { return accountId; }
    public void setAccountId(String accountId) { this.accountId = accountId; }

    public String getAccountName() { return accountName; }
    public void setAccountName(String accountName) { this.accountName = accountName; }

    public String getCategoryId() { return categoryId; }
    public void setCategoryId(String categoryId) { this.categoryId = categoryId; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
}
