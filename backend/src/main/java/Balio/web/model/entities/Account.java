package Balio.web.model.entities;

import java.math.BigDecimal;
import java.util.UUID;

import Balio.web.enums.AccountType;
import jakarta.persistence.*;

@Entity
@Table(name = "accounts")
public class Account {
    
    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, length = 80)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private AccountType type; // CASH / BANK / OTHER

    @Column(nullable = false, length = 3)
    private String currency = "EUR";

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal balance;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    public Account(String name, AccountType type, String currency, BigDecimal balance, User user) {
        this.name = name;
        this.type = type;
        this.currency = currency;
        this.balance = balance;
        this.user = user;
    } 
        
    protected Account() {
    }

    public UUID getId() { return id; }

    public String getName() {
        return name;
    }
    public void setName(String name) {
        this.name = name;
    }

    public AccountType getType() { return type; }
    public void setType(AccountType type) { this.type = type; } 
    
    public String getCurrency() { return currency; } 
    public void setCurrency(String currency) { this.currency = currency; }

    public BigDecimal getBalance() {
        return balance;
    }
    public void setBalance(BigDecimal balance) {
        this.balance = balance;
    }
}