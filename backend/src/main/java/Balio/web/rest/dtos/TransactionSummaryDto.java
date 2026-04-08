package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class TransactionSummaryDto {

    private String id;
    private String name;
    private TransactionType type;
    private BigDecimal amount;
    private LocalDate date;
    private String accountName;
    private String categoryName;
    private String categoryId;

    // ── Currency ──
    private String currency;
    private String originalCurrency;
    private java.math.BigDecimal originalAmount;
}
