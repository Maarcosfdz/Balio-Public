package Balio.web.rest.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * DTO for creating a filter.
 * The definition is a JSON string with optional keys:
 * type, accountId, categoryId, startDate, endDate.
 */
@Getter
@Setter
public class FilterDto {

    @NotBlank
    @Size(max = 80)
    private String name;

    @NotBlank
    private String definition;
}
