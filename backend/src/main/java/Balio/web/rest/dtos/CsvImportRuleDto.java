package Balio.web.rest.dtos;

public class CsvImportRuleDto {

    private String pattern;
    private String categoryId;
    private String transactionType; // EXPENSE, INCOME, or null (both)
    private String mappedName;

    public CsvImportRuleDto() {}

    public String getPattern() { return pattern; }
    public void setPattern(String pattern) { this.pattern = pattern; }

    public String getCategoryId() { return categoryId; }
    public void setCategoryId(String categoryId) { this.categoryId = categoryId; }

    public String getTransactionType() { return transactionType; }
    public void setTransactionType(String transactionType) { this.transactionType = transactionType; }

    public String getMappedName() { return mappedName; }
    public void setMappedName(String mappedName) { this.mappedName = mappedName; }
}
