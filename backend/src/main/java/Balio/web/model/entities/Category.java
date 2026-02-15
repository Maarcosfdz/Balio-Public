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
@Table(name = "categories")
public class Category {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, length = 60)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TransactionType type; // EXPENSE / INCOME

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    public Category(String name, TransactionType type, User user) {
        this.name = name;
        this.type = type;
        this.user = user;
    }

    protected Category() {}

    public UUID getId() {return id;}

    ;

    public String getName() {return name;}

    public void setName(String name) {this.name = name;}

    public TransactionType getType() {return type;}

    public void setType(TransactionType type) {this.type = type;}

    public User getUser() {return user;}

    public void setUser(User user) {this.user = user;}

}
