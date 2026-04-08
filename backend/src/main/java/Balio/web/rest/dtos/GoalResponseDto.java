package Balio.web.rest.dtos;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class GoalResponseDto {

    private String id;
    private String name;
    private BigDecimal targetAmount;
    private BigDecimal currentAmount;
    private String iconName;
    private String iconBgColor;
}
