package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CategorySummaryDto {

    private String id;
    private String name;
    private TransactionType type;
    private String iconName;
    private String iconBgColor;
}
