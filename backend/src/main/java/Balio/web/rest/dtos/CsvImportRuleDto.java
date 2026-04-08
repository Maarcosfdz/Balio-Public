package Balio.web.rest.dtos;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CsvImportRuleDto {

    private String pattern;
    private String categoryId;
    private String transactionType; // EXPENSE, INCOME, or null (both)
    private String mappedName;
    private Boolean excludeMatch;
    private java.math.BigDecimal amountMultiplier;

    public CsvImportRuleDto() {}
}
