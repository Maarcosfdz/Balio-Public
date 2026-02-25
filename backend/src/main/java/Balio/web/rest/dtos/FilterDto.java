package Balio.web.rest.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO for creating a filter.
 * The definition is a JSON string with optional keys:
 * type, accountId, categoryId, startDate, endDate.
 */
public class FilterDto {

    @NotBlank
    @Size(max = 80)
    private String name;

    @NotBlank
    private String definition;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDefinition() { return definition; }
    public void setDefinition(String definition) { this.definition = definition; }
}
