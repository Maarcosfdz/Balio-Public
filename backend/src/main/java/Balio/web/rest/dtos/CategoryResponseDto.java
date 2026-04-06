package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CategoryResponseDto {

    private String id;
    private String name;
    private TransactionType type; // EXPENSE / INCOME
    private String iconName;
    private String iconBgColor;
    private String userId;
}
