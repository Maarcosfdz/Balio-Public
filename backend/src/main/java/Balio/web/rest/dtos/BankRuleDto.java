package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class BankRuleDto {

    @Size(max = 200)
    private String namePattern;

    @Size(max = 100)
    private String bankCategory;

    @Size(max = 120)
    private String mappedName;

    private String mappedCategoryId;

    private Integer priority;

    private Boolean applyToExisting;

    private Integer applyWindowDays;

    private TransactionType transactionType;

    private Boolean excludeMatch;

    private BigDecimal amountMultiplier;
}
