package Balio.web.rest.dtos;

import jakarta.validation.constraints.Size;

public class BankRuleDto {

    @Size(max = 200)
    private String namePattern;

    @Size(max = 100)
    private String bankCategory;

    @Size(max = 120)
    private String mappedName;

    private String mappedCategoryId;

    private Integer priority;

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
}
