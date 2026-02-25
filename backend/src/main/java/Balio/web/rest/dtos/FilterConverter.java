package Balio.web.rest.dtos;

import Balio.web.model.entities.Filter;

import org.springframework.stereotype.Component;

@Component
public class FilterConverter {

    public FilterResponseDto toResponseDto(Filter filter) {
        FilterResponseDto dto = new FilterResponseDto();
        dto.setId(filter.getId().toString());
        dto.setName(filter.getName());
        dto.setDefinition(filter.getDefinition());
        return dto;
    }

    public FilterSummaryDto toSummaryDto(Filter filter) {
        FilterSummaryDto dto = new FilterSummaryDto();
        dto.setId(filter.getId().toString());
        dto.setName(filter.getName());
        return dto;
    }
}
