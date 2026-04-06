package Balio.web.rest.dtos;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * DTO for partial update of a goal.
 * All fields are optional; only non-null values are applied.
 */
@Getter
@Setter
public class GoalUpdateDto {

    @Size(max = 80)
    private String name;

    private BigDecimal targetAmount;

    @Size(max = 60)
    private String iconName;

    @Size(max = 20)
    private String iconBgColor;
}
