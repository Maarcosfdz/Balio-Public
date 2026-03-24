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
    @Column(name = "category_type", nullable = false, length = 10)
    private TransactionType type; // EXPENSE / INCOME

    @Column(name = "icon_name", length = 60)
    private String iconName;

    @Column(name = "icon_bg_color", length = 20)
    private String iconBgColor;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    public Category(String name, TransactionType type, User user) {
        this(name, type, user, null, null);
    }

    public Category(String name, TransactionType type, User user, String iconName, String iconBgColor) {
        this.name = name;
        this.type = type;
        this.user = user;
        this.iconName = iconName;
        this.iconBgColor = iconBgColor;
    }

    protected Category() {}

    public UUID getId() {return id;}

    ;

    public String getName() {return name;}

    public void setName(String name) {this.name = name;}

    public TransactionType getType() {return type;}

    public void setType(TransactionType type) {this.type = type;}

    public String getIconName() { return iconName; }

    public void setIconName(String iconName) { this.iconName = iconName; }

    public String getIconBgColor() { return iconBgColor; }

    public void setIconBgColor(String iconBgColor) { this.iconBgColor = iconBgColor; }

    public User getUser() {return user;}

    public void setUser(User user) {this.user = user;}

}
