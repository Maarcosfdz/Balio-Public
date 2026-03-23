package Balio.web.model.entities;

import Balio.web.enums.BudgetPeriodicity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "budgets")
public class Budget {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, length = 80)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BudgetPeriodicity periodicity;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @OneToMany(mappedBy = "budget", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC, name ASC")
    private List<BudgetCategory> categories = new ArrayList<>();

    protected Budget() {}

    public Budget(String name, BudgetPeriodicity periodicity, LocalDate startDate, User user) {
        this.name = name;
        this.periodicity = periodicity;
        this.startDate = startDate;
        this.user = user;
    }

    public UUID getId() { return id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BudgetPeriodicity getPeriodicity() { return periodicity; }
    public void setPeriodicity(BudgetPeriodicity periodicity) { this.periodicity = periodicity; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public OffsetDateTime getCreatedAt() { return createdAt; }

    public User getUser() { return user; }

    public List<BudgetCategory> getCategories() { return categories; }
}
