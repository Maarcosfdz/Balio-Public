package Balio.web.rest.controllers;

import Balio.web.model.entities.ScheduledTransaction;
import Balio.web.model.services.ScheduledTransactionService;
import Balio.web.rest.dtos.ScheduledTransactionConverter;
import Balio.web.rest.dtos.ScheduledTransactionDto;
import Balio.web.rest.dtos.ScheduledTransactionResponseDto;
import Balio.web.rest.dtos.ScheduledTransactionUpdateDto;
import org.springframework.data.domain.Page;
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

import javax.management.InstanceNotFoundException;
import java.net.URI;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/scheduled-transaction")
public class ScheduledTransactionController {

    private final ScheduledTransactionService service;
    private final ScheduledTransactionConverter converter;

    public ScheduledTransactionController(ScheduledTransactionService service,
                                           ScheduledTransactionConverter converter) {
        this.service = service;
        this.converter = converter;
    }

    @GetMapping
    public Page<ScheduledTransactionResponseDto> getAll(
            @RequestAttribute UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.findAllByUserId(userId, page, size)
                .map(converter::toResponseDto);
    }

    @GetMapping("/{id}")
    public ScheduledTransactionResponseDto getById(
            @RequestAttribute UUID userId,
            @PathVariable UUID id) throws InstanceNotFoundException {
        return converter.toResponseDto(service.findById(userId, id));
    }

    @PostMapping
    public ResponseEntity<ScheduledTransactionResponseDto> create(
            @RequestAttribute UUID userId,
            @Validated @RequestBody ScheduledTransactionDto dto) throws InstanceNotFoundException {

        boolean affects = dto.getAffectsBalance() != null ? dto.getAffectsBalance() : true;

        ScheduledTransaction st = service.create(userId, dto.getName(), dto.getAmount(),
                dto.getType(), dto.getAccountId(), dto.getCategoryId(), affects,
                dto.getFreqYears(), dto.getFreqMonths(), dto.getFreqWeeks(), dto.getFreqDays(),
                dto.getStartDate());

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(st.getId()).toUri();

        return ResponseEntity.created(location).body(converter.toResponseDto(st));
    }

    @PutMapping("/{id}")
    public ScheduledTransactionResponseDto update(
            @RequestAttribute UUID userId,
            @PathVariable UUID id,
            @Validated @RequestBody ScheduledTransactionUpdateDto dto)
            throws InstanceNotFoundException {

        ScheduledTransaction st = service.update(userId, id, dto.getName(), dto.getAmount(),
                dto.getType(), dto.getAccountId(), dto.getCategoryId(), dto.getAffectsBalance(),
                dto.getFreqYears(), dto.getFreqMonths(), dto.getFreqWeeks(), dto.getFreqDays(),
                dto.getStartDate(), dto.getActive());

        return converter.toResponseDto(st);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@RequestAttribute UUID userId, @PathVariable UUID id)
            throws InstanceNotFoundException {
        service.delete(userId, id);
    }

    @PostMapping("/fire")
    public Map<String, Integer> firePending(@RequestAttribute UUID userId) {
        int created = service.firePending(userId);
        return Map.of("created", created);
    }
}
