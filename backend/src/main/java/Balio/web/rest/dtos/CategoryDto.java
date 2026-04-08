package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CategoryDto {

    @NotBlank
    @Size(max = 60)
    private String name;

    private TransactionType type; // EXPENSE / INCOME

    @Size(max = 60)
    private String iconName;

    @Size(max = 20)
    private String iconBgColor;
}
