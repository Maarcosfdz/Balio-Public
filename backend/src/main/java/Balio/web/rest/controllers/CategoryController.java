package Balio.web.rest.controllers;

import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.Category;
import Balio.web.model.services.CategoryService;
import Balio.web.rest.dtos.CategoryConverter;
import Balio.web.rest.dtos.CategoryDto;
import Balio.web.rest.dtos.CategoryResponseDto;
import Balio.web.rest.dtos.CategorySummaryDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import Balio.web.enums.TransactionType;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/category")
public class CategoryController {

    private final CategoryService categoryService;
    private final CategoryConverter categoryConverter;

    public CategoryController(CategoryService categoryService, CategoryConverter categoryConverter) {
        this.categoryService = categoryService;
        this.categoryConverter = categoryConverter;
    }

    // ── LIST (summary: id + name) ────────────────────────────────────────

    @GetMapping
    public List<CategorySummaryDto> getAllCategories(@RequestAttribute UUID userId) {
        return categoryService.findAllByUserId(userId).stream()
                .map(categoryConverter::toSummaryDto)
                .toList();
    }

    // ── LIST paged (summary) ──────────────────────────────────────

    @GetMapping("/paged")
    public Page<CategorySummaryDto> getPagedCategories(
            @RequestAttribute UUID userId,
            @RequestParam(required = false) TransactionType type,
            @PageableDefault(size = 20, sort = "name") Pageable pageable) {
        return categoryService.findPagedByUserId(userId, type, pageable)
                .map(categoryConverter::toSummaryDto);
    }

    // ── DETAIL (all fields) ──────────────────────────────────────────────

    @GetMapping("/{categoryId}")
    public CategoryResponseDto getCategory(@RequestAttribute UUID userId,
                                           @PathVariable UUID categoryId) throws InstanceNotFoundException {
        Category category = categoryService.findByIdAndUserId(categoryId, userId);
        return categoryConverter.toResponseDto(category);
    }

    // ── CREATE ───────────────────────────────────────────────────────────

    @PostMapping("/create")
    public ResponseEntity<CategoryResponseDto> createCategory(@RequestAttribute UUID userId,
                                                              @Validated @RequestBody CategoryDto dto) {

        Category category = categoryService.createCategory(userId, dto.getName(), dto.getType());

        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest().path("/{id}")
                .buildAndExpand(category.getId()).toUri();

        return ResponseEntity.created(location).body(categoryConverter.toResponseDto(category));
    }

    // ── UPDATE ───────────────────────────────────────────────────────────

    @PutMapping("/{categoryId}")
    public CategoryResponseDto updateCategory(@RequestAttribute UUID userId,
                                              @PathVariable UUID categoryId,
                                              @Validated @RequestBody CategoryDto dto) throws
                                                                                       InstanceNotFoundException {

        Category category = categoryService.modifyCategory(userId, categoryId, dto.getName(), dto.getType());

        return categoryConverter.toResponseDto(category);
    }

    // ── DELETE ────────────────────────────────────────────────────────────

    @DeleteMapping("/{categoryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@RequestAttribute UUID userId, @PathVariable UUID categoryId) throws
                                                                                             InstanceNotFoundException {
        categoryService.deleteCategory(userId, categoryId);
    }
}