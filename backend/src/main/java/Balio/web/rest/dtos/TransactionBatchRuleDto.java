package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

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

    public String getNameContains() { return nameContains; }
    public void setNameContains(String nameContains) { this.nameContains = nameContains; }

    public List<UUID> getCategoryIds() { return categoryIds; }
    public void setCategoryIds(List<UUID> categoryIds) { this.categoryIds = categoryIds; }

    public TransactionType getType() { return type; }
    public void setType(TransactionType type) { this.type = type; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public String getNewName() { return newName; }
    public void setNewName(String newName) { this.newName = newName; }

    public UUID getNewCategoryId() { return newCategoryId; }
    public void setNewCategoryId(UUID newCategoryId) { this.newCategoryId = newCategoryId; }

    public Boolean getExcludeMatch() { return excludeMatch; }
    public void setExcludeMatch(Boolean excludeMatch) { this.excludeMatch = excludeMatch; }

    public BigDecimal getAmountMultiplier() { return amountMultiplier; }
    public void setAmountMultiplier(BigDecimal amountMultiplier) { this.amountMultiplier = amountMultiplier; }
}
