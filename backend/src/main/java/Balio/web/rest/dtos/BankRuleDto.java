package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

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

    public String getNamePattern() { return namePattern; }
    public void setNamePattern(String namePattern) { this.namePattern = namePattern; }

    public String getBankCategory() { return bankCategory; }
    public void setBankCategory(String bankCategory) { this.bankCategory = bankCategory; }

    public String getMappedName() { return mappedName; }
    public void setMappedName(String mappedName) { this.mappedName = mappedName; }

    public String getMappedCategoryId() { return mappedCategoryId; }
    public void setMappedCategoryId(String mappedCategoryId) {
        this.mappedCategoryId = mappedCategoryId;
    }

    public Integer getPriority() { return priority; }
    public void setPriority(Integer priority) { this.priority = priority; }

    public Boolean getApplyToExisting() { return applyToExisting; }
    public void setApplyToExisting(Boolean applyToExisting) { this.applyToExisting = applyToExisting; }

    public Integer getApplyWindowDays() { return applyWindowDays; }
    public void setApplyWindowDays(Integer applyWindowDays) { this.applyWindowDays = applyWindowDays; }

    public TransactionType getTransactionType() { return transactionType; }
    public void setTransactionType(TransactionType transactionType) { this.transactionType = transactionType; }

    public Boolean getExcludeMatch() { return excludeMatch; }
    public void setExcludeMatch(Boolean excludeMatch) { this.excludeMatch = excludeMatch; }

    public BigDecimal getAmountMultiplier() { return amountMultiplier; }
    public void setAmountMultiplier(BigDecimal amountMultiplier) { this.amountMultiplier = amountMultiplier; }
}
