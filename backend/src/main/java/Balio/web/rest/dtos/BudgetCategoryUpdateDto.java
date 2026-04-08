package Balio.web.rest.dtos;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class BudgetCategoryUpdateDto {

    @Size(max = 80)
    private String name;

    private BigDecimal maxAmount;

    private String iconName;

    private String iconBgColor;

    private List<UUID> linkedCategoryIds;
}
