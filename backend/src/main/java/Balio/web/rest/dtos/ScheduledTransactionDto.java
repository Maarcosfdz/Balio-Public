package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
public class ScheduledTransactionDto {

    @NotBlank
    @Size(max = 120)
    private String name;

    @NotNull
    @Positive
    private BigDecimal amount;

    @NotNull
    private TransactionType type;

    private UUID accountId;
    private UUID categoryId;
    private Boolean affectsBalance;

    private int freqYears;
    private int freqMonths;
    private int freqWeeks;
    private int freqDays;

    @NotNull
    private LocalDate startDate;
}
