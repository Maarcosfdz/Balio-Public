package Balio.web.rest.dtos;

import jakarta.validation.constraints.Size;

/**
 * DTO for partial update of a filter.
 * All fields are optional; only non-null values are applied.
 */
public class FilterUpdateDto {

    @Size(max = 80)
    private String name;

    private String definition;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDefinition() { return definition; }
    public void setDefinition(String definition) { this.definition = definition; }
}
