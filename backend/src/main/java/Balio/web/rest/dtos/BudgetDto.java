package Balio.web.rest.dtos;

import Balio.web.enums.BudgetPeriodicity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class BudgetDto {

    @NotBlank
    @Size(max = 80)
    private String name;

    @NotNull
    private BudgetPeriodicity periodicity;

    @NotNull
    private LocalDate startDate;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BudgetPeriodicity getPeriodicity() { return periodicity; }
    public void setPeriodicity(BudgetPeriodicity periodicity) { this.periodicity = periodicity; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
}
