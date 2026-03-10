package Balio.web.rest.dtos;

public class BankRuleResponseDto {

    private String id;
    private String namePattern;
    private String bankCategory;
    private String mappedName;
    private String mappedCategoryId;
    private String mappedCategoryName;
    private int priority;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

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

    public String getMappedCategoryName() { return mappedCategoryName; }
    public void setMappedCategoryName(String mappedCategoryName) {
        this.mappedCategoryName = mappedCategoryName;
    }

    public int getPriority() { return priority; }
    public void setPriority(int priority) { this.priority = priority; }
}
