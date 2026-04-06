package Balio.web.rest.dtos;

import Balio.web.enums.BudgetPeriodicity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class BudgetDto {

    @NotBlank
    @Size(max = 80)
    private String name;

    @NotNull
    private BudgetPeriodicity periodicity;

    @NotNull
    private LocalDate startDate;

    @Size(max = 60)
    private String iconName;

    @Size(max = 20)
    private String iconBgColor;
}
