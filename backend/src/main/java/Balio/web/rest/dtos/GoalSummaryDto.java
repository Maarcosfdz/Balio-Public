package Balio.web.rest.dtos;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
public class GoalSummaryDto {

    private String id;
    private String name;
    private BigDecimal targetAmount;
    private BigDecimal currentAmount;
    private String iconName;
    private String iconBgColor;
    private List<String> linkedAccountIds;
}
