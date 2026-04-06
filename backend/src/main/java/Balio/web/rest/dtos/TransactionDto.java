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
public class TransactionDto {

    @NotBlank
    @Size(max = 120)
    private String name;

    @NotNull
    @Positive
    private BigDecimal amount;

    private LocalDate date;

    private UUID accountId;

    private UUID categoryId;

    private Boolean affectsBalance;

    private TransactionType type; // usado en update

    // ── Currency (optional, for cross-currency transactions) ──
    private BigDecimal originalAmount;
    private String originalCurrency;
    private BigDecimal exchangeRate;
}
