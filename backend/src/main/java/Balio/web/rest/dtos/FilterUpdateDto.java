package Balio.web.rest.dtos;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * DTO for partial update of a filter.
 * All fields are optional; only non-null values are applied.
 */
@Getter
@Setter
public class FilterUpdateDto {

    @Size(max = 80)
    private String name;

    private String definition;
}
