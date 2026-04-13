package Balio.web.model.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "budget_categories")
public class BudgetCategory {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(name = "max_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal maxAmount;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "icon_name", length = 120)
    private String iconName;

    @Column(name = "icon_bg_color", length = 20)
    private String iconBgColor;

    @ManyToOne(optional = false)
    @JoinColumn(name = "budget_id")
    private Budget budget;

    @ManyToMany
    @JoinTable(
        name = "budget_category_linked_categories",
        joinColumns = @JoinColumn(name = "budget_category_id"),
        inverseJoinColumns = @JoinColumn(name = "category_id")
    )
    private Set<Category> linkedCategories = new HashSet<>();

    @ManyToMany
    @JoinTable(
        name = "budget_category_transactions",
        joinColumns = @JoinColumn(name = "budget_category_id"),
        inverseJoinColumns = @JoinColumn(name = "transaction_id")
    )
    private Set<Transaction> manualTransactions = new HashSet<>();

    @ManyToMany
    @JoinTable(
        name = "budget_category_excluded_transactions",
        joinColumns = @JoinColumn(name = "budget_category_id"),
        inverseJoinColumns = @JoinColumn(name = "transaction_id")
    )
    private Set<Transaction> excludedTransactions = new HashSet<>();

    protected BudgetCategory() {}

    public BudgetCategory(String name, BigDecimal maxAmount, int displayOrder, Budget budget) {
        this(name, maxAmount, displayOrder, budget, null, null);
    }

    public BudgetCategory(String name, BigDecimal maxAmount, int displayOrder, Budget budget,
                          String iconName, String iconBgColor) {
        this.name = name;
        this.maxAmount = maxAmount;
        this.displayOrder = displayOrder;
        this.budget = budget;
        this.iconName = iconName;
        this.iconBgColor = iconBgColor;
    }

    public UUID getId() { return id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BigDecimal getMaxAmount() { return maxAmount; }
    public void setMaxAmount(BigDecimal maxAmount) { this.maxAmount = maxAmount; }

    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }

    public String getIconName() { return iconName; }
    public void setIconName(String iconName) { this.iconName = iconName; }

    public String getIconBgColor() { return iconBgColor; }
    public void setIconBgColor(String iconBgColor) { this.iconBgColor = iconBgColor; }

    public Budget getBudget() { return budget; }

    public Set<Category> getLinkedCategories() { return linkedCategories; }

    public Set<Transaction> getManualTransactions() { return manualTransactions; }

    public Set<Transaction> getExcludedTransactions() { return excludedTransactions; }
}
