package Balio.web.rest.controllers;

import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.Filter;
import Balio.web.model.entities.Transaction;
import Balio.web.model.services.FilterService;
import Balio.web.rest.dtos.FilterConverter;
import Balio.web.rest.dtos.FilterDto;
import Balio.web.rest.dtos.FilterResponseDto;
import Balio.web.rest.dtos.FilterSummaryDto;
import Balio.web.rest.dtos.FilterUpdateDto;
import Balio.web.rest.dtos.TransactionConverter;
import Balio.web.rest.dtos.TransactionSummaryDto;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/filter")
public class FilterController {

    private static final Logger log = LoggerFactory.getLogger(FilterController.class);

    private final FilterService filterService;
    private final FilterConverter filterConverter;
    private final TransactionConverter transactionConverter;

    public FilterController(FilterService filterService, FilterConverter filterConverter,
                            TransactionConverter transactionConverter) {
        this.filterService = filterService;
        this.filterConverter = filterConverter;
        this.transactionConverter = transactionConverter;
    }

    // ── LIST (summary) ───────────────────────────────────────────────────

    @GetMapping
    public List<FilterSummaryDto> getAllFilters(@RequestAttribute UUID userId) {
        return filterService.findAllByUserId(userId).stream()
                .map(filterConverter::toSummaryDto)
                .toList();
    }

    // ── LIST paged (summary) ──────────────────────────────────────

    @GetMapping("/paged")
    public Page<FilterSummaryDto> getPagedFilters(
            @RequestAttribute UUID userId,
            @PageableDefault(size = 20, sort = "name") Pageable pageable) {
        return filterService.findPagedByUserId(userId, pageable)
                .map(filterConverter::toSummaryDto);
    }

    // ── DETAIL ───────────────────────────────────────────────────────────

    @GetMapping("/{filterId}")
    public FilterResponseDto getFilter(@RequestAttribute UUID userId,
                                       @PathVariable UUID filterId) throws InstanceNotFoundException {
        Filter filter = filterService.findByIdAndUserId(filterId, userId);
        return filterConverter.toResponseDto(filter);
    }

    // ── CREATE ───────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<FilterResponseDto> createFilter(@RequestAttribute UUID userId,
                                                          @Validated @RequestBody FilterDto dto) {

        Filter filter = filterService.createFilter(userId, dto.getName(), dto.getDefinition());

        log.info("Filter created: filterId={}, userId={}", filter.getId(), userId);

        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest().path("/{id}")
                .buildAndExpand(filter.getId()).toUri();

        return ResponseEntity.created(location).body(filterConverter.toResponseDto(filter));
    }

    // ── UPDATE ───────────────────────────────────────────────────────────

    @PutMapping("/{filterId}")
    public FilterResponseDto updateFilter(@RequestAttribute UUID userId,
                                          @PathVariable UUID filterId,
                                          @Validated @RequestBody FilterUpdateDto dto)
            throws InstanceNotFoundException {

        Filter filter = filterService.modifyFilter(userId, filterId, dto.getName(), dto.getDefinition());
        return filterConverter.toResponseDto(filter);
    }

    // ── DELETE ────────────────────────────────────────────────────────────

    @DeleteMapping("/{filterId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFilter(@RequestAttribute UUID userId,
                             @PathVariable UUID filterId) throws InstanceNotFoundException {
        filterService.deleteFilter(userId, filterId);
        log.info("Filter deleted: filterId={}, userId={}", filterId, userId);
    }

    // ── APPLY FILTER ─────────────────────────────────────────────────────

    @PostMapping("/{filterId}/apply")
    public List<TransactionSummaryDto> applyFilter(@RequestAttribute UUID userId,
                                                   @PathVariable UUID filterId)
            throws InstanceNotFoundException {

        List<Transaction> transactions = filterService.applyFilter(userId, filterId);

        return transactions.stream()
                .map(transactionConverter::toSummaryDto)
                .toList();
    }
}
