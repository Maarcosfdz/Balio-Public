package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
public class ScheduledTransactionUpdateDto {

    @Size(max = 120)
    private String name;

    @Positive
    private BigDecimal amount;

    private TransactionType type;
    private UUID accountId;
    private UUID categoryId;
    private Boolean affectsBalance;
    private Integer freqYears;
    private Integer freqMonths;
    private Integer freqWeeks;
    private Integer freqDays;
    private LocalDate startDate;
    private Boolean active;
}
