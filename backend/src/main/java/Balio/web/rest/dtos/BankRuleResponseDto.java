package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class BankRuleResponseDto {

    private String id;
    private String accountId;
    private String accountName;
    private String namePattern;
    private String bankCategory;
    private TransactionType transactionType;
    private String mappedName;
    private String mappedCategoryId;
    private String mappedCategoryName;
    private boolean excludeMatch;
    private BigDecimal amountMultiplier;
    private int priority;
    private int appliedTransactions;
}
