package Balio.web.rest.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public class BudgetCategoryDto {

    @NotBlank
    @Size(max = 80)
    private String name;

    @NotNull
    @Positive
    private BigDecimal maxAmount;

    private String iconName;

    private String iconBgColor;

    private List<UUID> linkedCategoryIds;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BigDecimal getMaxAmount() { return maxAmount; }
    public void setMaxAmount(BigDecimal maxAmount) { this.maxAmount = maxAmount; }

    public String getIconName() { return iconName; }
    public void setIconName(String iconName) { this.iconName = iconName; }

    public String getIconBgColor() { return iconBgColor; }
    public void setIconBgColor(String iconBgColor) { this.iconBgColor = iconBgColor; }

    public List<UUID> getLinkedCategoryIds() { return linkedCategoryIds; }
    public void setLinkedCategoryIds(List<UUID> linkedCategoryIds) { this.linkedCategoryIds = linkedCategoryIds; }
}
