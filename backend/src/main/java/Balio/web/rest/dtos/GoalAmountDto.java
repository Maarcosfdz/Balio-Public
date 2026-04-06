package Balio.web.rest.dtos;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * DTO for add / withdraw money operations on a goal.
 */
@Getter
@Setter
public class GoalAmountDto {

    @NotNull
    @Positive
    private BigDecimal amount;
}
