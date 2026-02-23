package Balio.web.rest.dtos;

import Balio.web.model.entities.Category;

import org.springframework.stereotype.Component;

@Component
public class CategoryConverter {

    public CategoryResponseDto toResponseDto(Category category) {
        CategoryResponseDto dto = new CategoryResponseDto();
        dto.setId(category.getId().toString());
        dto.setName(category.getName());
        dto.setType(category.getType());
        dto.setUserId(category.getUser().getId().toString());
        return dto;
    }

    public CategorySummaryDto toSummaryDto(Category category) {
        CategorySummaryDto dto = new CategorySummaryDto();
        dto.setId(category.getId().toString());
        dto.setName(category.getName());
        return dto;
    }
}