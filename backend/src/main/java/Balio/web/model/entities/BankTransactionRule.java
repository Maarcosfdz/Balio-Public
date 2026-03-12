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

import java.util.UUID;

@Entity
@Table(name = "bank_transaction_rules")
public class BankTransactionRule {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "account_id")
    private Account account;

    @Column(name = "name_pattern", length = 200)
    private String namePattern;

    @Column(name = "bank_category", length = 100)
    private String bankCategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", length = 10)
    private TransactionType transactionType;

    @Column(name = "mapped_name", length = 120)
    private String mappedName;

    @ManyToOne
    @JoinColumn(name = "mapped_category_id")
    private Category mappedCategory;

    @Column(nullable = false)
    private int priority;

    protected BankTransactionRule() {
    }

    public BankTransactionRule(User user, Account account, String namePattern, String bankCategory,
                               TransactionType transactionType, String mappedName,
                               Category mappedCategory, int priority) {
        this.user = user;
        this.account = account;
        this.namePattern = namePattern;
        this.bankCategory = bankCategory;
        this.transactionType = transactionType;
        this.mappedName = mappedName;
        this.mappedCategory = mappedCategory;
        this.priority = priority;
    }

    // -------- GETTERS / SETTERS --------

    public UUID getId() { return id; }

    public User getUser() { return user; }

    public Account getAccount() { return account; }

    public String getNamePattern() { return namePattern; }
    public void setNamePattern(String namePattern) { this.namePattern = namePattern; }

    public String getBankCategory() { return bankCategory; }
    public void setBankCategory(String bankCategory) { this.bankCategory = bankCategory; }

    public TransactionType getTransactionType() { return transactionType; }
    public void setTransactionType(TransactionType transactionType) { this.transactionType = transactionType; }

    public String getMappedName() { return mappedName; }
    public void setMappedName(String mappedName) { this.mappedName = mappedName; }

    public Category getMappedCategory() { return mappedCategory; }
    public void setMappedCategory(Category mappedCategory) { this.mappedCategory = mappedCategory; }

    public int getPriority() { return priority; }
    public void setPriority(int priority) { this.priority = priority; }
}
