package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CategoryDto {

    @NotBlank
    @Size(max = 60)
    private String name;

    private TransactionType type; // EXPENSE / INCOME

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public TransactionType getType() { return type; }
    public void setType(TransactionType type) { this.type = type; }
}