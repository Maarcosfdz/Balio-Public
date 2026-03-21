package Balio.web.rest.controllers;

import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.Budget;
import Balio.web.model.entities.BudgetCategory;
import Balio.web.model.services.BudgetService;
import Balio.web.rest.dtos.BudgetCategoryDto;
import Balio.web.rest.dtos.BudgetCategoryUpdateDto;
import Balio.web.rest.dtos.BudgetConverter;
import Balio.web.rest.dtos.BudgetDto;
import Balio.web.rest.dtos.BudgetResponseDto;
import Balio.web.rest.dtos.BudgetSummaryDto;
import Balio.web.rest.dtos.BudgetUpdateDto;
import Balio.web.rest.dtos.TransactionLinkDto;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/budget")
public class BudgetController {

    private static final Logger log = LoggerFactory.getLogger(BudgetController.class);

    private final BudgetService budgetService;
    private final BudgetConverter budgetConverter;

    public BudgetController(BudgetService budgetService, BudgetConverter budgetConverter) {
        this.budgetService = budgetService;
        this.budgetConverter = budgetConverter;
    }

    // ── LIST ─────────────────────────────────────────────────────────────

    @GetMapping
    public List<BudgetSummaryDto> getAllBudgets(@RequestAttribute UUID userId) {
        return budgetService.findAllByUserId(userId).stream()
                .map(budgetConverter::toSummaryDto)
                .toList();
    }

    // ── DETAIL ───────────────────────────────────────────────────────────

    @GetMapping("/{budgetId}")
    public BudgetResponseDto getBudget(@RequestAttribute UUID userId,
                                       @PathVariable UUID budgetId)
            throws InstanceNotFoundException {
        Budget budget = budgetService.findByIdAndUserId(budgetId, userId);
        return budgetConverter.toResponseDto(budget);
    }

    // ── CREATE ───────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<BudgetResponseDto> createBudget(@RequestAttribute UUID userId,
                                                           @Validated @RequestBody BudgetDto dto) {
        Budget budget = budgetService.createBudget(
                userId, dto.getName(), dto.getPeriodicity(), dto.getStartDate());

        log.info("Budget created: budgetId={}, userId={}", budget.getId(), userId);

        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest().path("/{id}")
                .buildAndExpand(budget.getId()).toUri();

        return ResponseEntity.created(location).body(budgetConverter.toResponseDto(budget));
    }

    // ── UPDATE ───────────────────────────────────────────────────────────

    @PutMapping("/{budgetId}")
    public BudgetResponseDto updateBudget(@RequestAttribute UUID userId,
                                           @PathVariable UUID budgetId,
                                           @Validated @RequestBody BudgetUpdateDto dto)
            throws InstanceNotFoundException {
        Budget budget = budgetService.modifyBudget(
                userId, budgetId, dto.getName(), dto.getPeriodicity(), dto.getStartDate());
        return budgetConverter.toResponseDto(budget);
    }

    // ── DELETE ────────────────────────────────────────────────────────────

    @DeleteMapping("/{budgetId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBudget(@RequestAttribute UUID userId,
                              @PathVariable UUID budgetId) throws InstanceNotFoundException {
        budgetService.deleteBudget(userId, budgetId);
        log.info("Budget deleted: budgetId={}, userId={}", budgetId, userId);
    }

    // ── BUDGET CATEGORIES ────────────────────────────────────────────────

    @PostMapping("/{budgetId}/category")
    public ResponseEntity<BudgetResponseDto> createCategory(
            @RequestAttribute UUID userId,
            @PathVariable UUID budgetId,
            @Validated @RequestBody BudgetCategoryDto dto) throws InstanceNotFoundException {

        budgetService.createBudgetCategory(
                userId, budgetId, dto.getName(), dto.getMaxAmount(), dto.getLinkedCategoryIds());

        Budget budget = budgetService.findByIdAndUserId(budgetId, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(budgetConverter.toResponseDto(budget));
    }

    @PutMapping("/{budgetId}/category/{categoryId}")
    public BudgetResponseDto updateCategory(
            @RequestAttribute UUID userId,
            @PathVariable UUID budgetId,
            @PathVariable UUID categoryId,
            @Validated @RequestBody BudgetCategoryUpdateDto dto) throws InstanceNotFoundException {

        budgetService.modifyBudgetCategory(
                userId, budgetId, categoryId,
                dto.getName(), dto.getMaxAmount(), dto.getLinkedCategoryIds());

        Budget budget = budgetService.findByIdAndUserId(budgetId, userId);
        return budgetConverter.toResponseDto(budget);
    }

    @DeleteMapping("/{budgetId}/category/{categoryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@RequestAttribute UUID userId,
                                @PathVariable UUID budgetId,
                                @PathVariable UUID categoryId) throws InstanceNotFoundException {
        budgetService.deleteBudgetCategory(userId, budgetId, categoryId);
    }

    // ── TRANSACTION LINKING ──────────────────────────────────────────────

    @PostMapping("/{budgetId}/category/{categoryId}/link")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void linkTransaction(@RequestAttribute UUID userId,
                                 @PathVariable UUID budgetId,
                                 @PathVariable UUID categoryId,
                                 @Validated @RequestBody TransactionLinkDto dto)
            throws InstanceNotFoundException {
        budgetService.linkTransaction(userId, budgetId, categoryId, dto.getTransactionId());
    }

    @DeleteMapping("/{budgetId}/category/{categoryId}/link/{transactionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unlinkTransaction(@RequestAttribute UUID userId,
                                   @PathVariable UUID budgetId,
                                   @PathVariable UUID categoryId,
                                   @PathVariable UUID transactionId)
            throws InstanceNotFoundException {
        budgetService.unlinkTransaction(userId, budgetId, categoryId, transactionId);
    }
}
