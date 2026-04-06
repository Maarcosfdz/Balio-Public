package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class ScheduledTransactionResponseDto {

    private String id;
    private String name;
    private BigDecimal amount;
    private TransactionType type;
    private boolean affectsBalance;
    private int freqYears;
    private int freqMonths;
    private int freqWeeks;
    private int freqDays;
    private LocalDate startDate;
    private LocalDate lastExecution;
    private LocalDate nextExecution;
    private boolean active;
    private String accountId;
    private String accountName;
    private String categoryId;
    private String categoryName;
}
