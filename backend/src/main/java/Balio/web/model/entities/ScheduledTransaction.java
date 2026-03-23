package Balio.web.model.entities;

import Balio.web.enums.TransactionType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "scheduled_transactions")
public class ScheduledTransaction {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TransactionType type;

    @Column(name = "affects_balance", nullable = false)
    private boolean affectsBalance = true;

    @Column(name = "freq_years", nullable = false)
    private int freqYears = 0;

    @Column(name = "freq_months", nullable = false)
    private int freqMonths = 0;

    @Column(name = "freq_weeks", nullable = false)
    private int freqWeeks = 0;

    @Column(name = "freq_days", nullable = false)
    private int freqDays = 0;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "last_execution")
    private LocalDate lastExecution;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    // -------- RELATIONS --------

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "account_id")
    private Account account;

    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    protected ScheduledTransaction() {
    }

    public ScheduledTransaction(String name, BigDecimal amount, TransactionType type,
                                 int freqYears, int freqMonths, int freqWeeks, int freqDays,
                                 LocalDate startDate, User user) {
        this.name = name;
        this.amount = amount;
        this.type = type;
        this.freqYears = freqYears;
        this.freqMonths = freqMonths;
        this.freqWeeks = freqWeeks;
        this.freqDays = freqDays;
        this.startDate = startDate;
        this.user = user;
    }

    // getters / setters

    public UUID getId() { return id; }

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

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public OffsetDateTime getCreatedAt() { return createdAt; }

    public User getUser() { return user; }

    public Account getAccount() { return account; }
    public void setAccount(Account account) { this.account = account; }

    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
}
