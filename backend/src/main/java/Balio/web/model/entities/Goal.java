package Balio.web.model.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "goals")
public class Goal {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(name = "target_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal targetAmount;

    @Column(name = "current_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal currentAmount = BigDecimal.ZERO;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    protected Goal() {}

    public Goal(String name, BigDecimal targetAmount, User user) {
        this.name = name;
        this.targetAmount = targetAmount;
        this.user = user;
        this.currentAmount = BigDecimal.ZERO;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public BigDecimal getTargetAmount() {
        return targetAmount;
    }

    public BigDecimal getCurrentAmount() {
        return currentAmount;
    }

    public User getUser() {
        return user;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setTargetAmount(BigDecimal targetAmount) {
        this.targetAmount = targetAmount;
    }

    public void setCurrentAmount(BigDecimal currentAmount) {
        this.currentAmount = currentAmount;
    }
}
