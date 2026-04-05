package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;

import java.math.BigDecimal;

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

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getAccountId() { return accountId; }
    public void setAccountId(String accountId) { this.accountId = accountId; }

    public String getAccountName() { return accountName; }
    public void setAccountName(String accountName) { this.accountName = accountName; }

    public String getNamePattern() { return namePattern; }
    public void setNamePattern(String namePattern) { this.namePattern = namePattern; }

    public String getBankCategory() { return bankCategory; }
    public void setBankCategory(String bankCategory) { this.bankCategory = bankCategory; }

    public TransactionType getTransactionType() { return transactionType; }
    public void setTransactionType(TransactionType transactionType) { this.transactionType = transactionType; }

    public String getMappedName() { return mappedName; }
    public void setMappedName(String mappedName) { this.mappedName = mappedName; }

    public String getMappedCategoryId() { return mappedCategoryId; }
    public void setMappedCategoryId(String mappedCategoryId) {
        this.mappedCategoryId = mappedCategoryId;
    }

    public String getMappedCategoryName() { return mappedCategoryName; }
    public void setMappedCategoryName(String mappedCategoryName) {
        this.mappedCategoryName = mappedCategoryName;
    }

    public boolean isExcludeMatch() { return excludeMatch; }
    public void setExcludeMatch(boolean excludeMatch) { this.excludeMatch = excludeMatch; }

    public BigDecimal getAmountMultiplier() { return amountMultiplier; }
    public void setAmountMultiplier(BigDecimal amountMultiplier) { this.amountMultiplier = amountMultiplier; }

    public int getPriority() { return priority; }
    public void setPriority(int priority) { this.priority = priority; }

    public int getAppliedTransactions() { return appliedTransactions; }
    public void setAppliedTransactions(int appliedTransactions) { this.appliedTransactions = appliedTransactions; }
}
