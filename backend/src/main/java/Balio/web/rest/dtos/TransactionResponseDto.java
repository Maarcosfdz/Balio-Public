package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class TransactionResponseDto {

    private String id;
    private String name;
    private BigDecimal amount;
    private LocalDate date;
    private TransactionType type;
    private boolean affectsBalance;
    private String accountId;
    private String accountName;
    private String categoryId;
    private String categoryName;
    private String bankCategory;

    // ── Currency ──
    private BigDecimal originalAmount;
    private String originalCurrency;
    private BigDecimal exchangeRate;
    private String accountCurrency;
}
