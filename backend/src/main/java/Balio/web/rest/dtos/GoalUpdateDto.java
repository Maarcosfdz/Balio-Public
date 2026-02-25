package Balio.web.rest.dtos;

import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * DTO for partial update of a goal.
 * All fields are optional; only non-null values are applied.
 */
public class GoalUpdateDto {

    @Size(max = 80)
    private String name;

    private BigDecimal targetAmount;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BigDecimal getTargetAmount() { return targetAmount; }
    public void setTargetAmount(BigDecimal targetAmount) { this.targetAmount = targetAmount; }
}
