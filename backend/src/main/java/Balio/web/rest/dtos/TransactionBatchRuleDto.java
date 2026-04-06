package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class TransactionBatchRuleDto {

    // ── Filters ──────────────────────────────────────────────────────────
    private String nameContains;
    private List<UUID> categoryIds;
    private TransactionType type;
    private LocalDate startDate;
    private LocalDate endDate;

    // ── Actions ──────────────────────────────────────────────────────────
    private String newName;
    private UUID newCategoryId;
    private Boolean excludeMatch;
    private BigDecimal amountMultiplier;

    public TransactionBatchRuleDto() {}
}
