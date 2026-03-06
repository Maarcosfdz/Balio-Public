package Balio.web.rest.controllers;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.AccountInvalidException;
import javax.management.InstanceNotFoundException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Transaction;
import Balio.web.model.services.TransactionService;
import Balio.web.rest.dtos.TransactionConverter;
import Balio.web.rest.dtos.TransactionDto;
import Balio.web.rest.dtos.TransactionResponseDto;
import Balio.web.rest.dtos.TransactionSummaryDto;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/transaction")
public class TransactionController {

    private static final Logger log = LoggerFactory.getLogger(TransactionController.class);

    private final TransactionService transactionService;
    private final TransactionConverter transactionConverter;

    public TransactionController(TransactionService transactionService, TransactionConverter transactionConverter) {
        this.transactionService = transactionService;
        this.transactionConverter = transactionConverter;
    }

    // ── LIST (summary, optional filters) ─────────────────────────────────

    @GetMapping
    public Page<TransactionSummaryDto> getAllTransactions(
            @RequestAttribute UUID userId,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) UUID accountId,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return transactionService
                .findPaged(userId, type, accountId, categoryId, startDate, endDate, page, size)
                .map(transactionConverter::toSummaryDto);
    }

    // ── DETAIL (all fields) ──────────────────────────────────────────────

    @GetMapping("/{transactionId}")
    public TransactionResponseDto getTransaction(@RequestAttribute UUID userId,
                                                 @PathVariable UUID transactionId) throws InstanceNotFoundException {
        Transaction transaction = transactionService.findByIdAndUserId(transactionId, userId);
        return transactionConverter.toResponseDto(transaction);
    }

    // ── CREATE EXPENSE ───────────────────────────────────────────────────

    @PostMapping("/expense")
    public ResponseEntity<TransactionResponseDto> addExpense(
            @RequestAttribute UUID userId,
            @Validated @RequestBody TransactionDto dto)
            throws AccountInvalidException, UserNotFoundException {

        Transaction transaction = transactionService.addExpense(
                userId, dto.getAccountId(), dto.getCategoryId(),
                dto.getName(), dto.getAmount(), dto.getDate(), dto.getAffectsBalance());

        log.info("Expense created: txId={}, userId={}, amount={}, accountId={}",
                transaction.getId(), userId, dto.getAmount(), dto.getAccountId());

        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest().path("/{id}")
                .buildAndExpand(transaction.getId()).toUri();

        return ResponseEntity.created(location).body(transactionConverter.toResponseDto(transaction));
    }

    // ── CREATE INCOME ────────────────────────────────────────────────────

    @PostMapping("/income")
    public ResponseEntity<TransactionResponseDto> addIncome(
            @RequestAttribute UUID userId,
            @Validated @RequestBody TransactionDto dto)
            throws AccountInvalidException, UserNotFoundException {

        Transaction transaction = transactionService.addIncome(
                userId, dto.getAccountId(), dto.getCategoryId(),
                dto.getName(), dto.getAmount(), dto.getDate(), dto.getAffectsBalance());

        log.info("Income created: txId={}, userId={}, amount={}, accountId={}",
                transaction.getId(), userId, dto.getAmount(), dto.getAccountId());

        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest().path("/{id}")
                .buildAndExpand(transaction.getId()).toUri();

        return ResponseEntity.created(location).body(transactionConverter.toResponseDto(transaction));
    }

    // ── UPDATE ───────────────────────────────────────────────────────────

    @PutMapping("/{transactionId}")
    public TransactionResponseDto updateTransaction(
            @RequestAttribute UUID userId,
            @PathVariable UUID transactionId,
            @Validated @RequestBody TransactionDto dto)
            throws InstanceNotFoundException, AccountInvalidException {

        Transaction transaction = transactionService.updateTransaction(
                userId, transactionId, dto.getAccountId(), dto.getCategoryId(),
                dto.getType(), dto.getName(), dto.getAmount(), dto.getDate(), dto.getAffectsBalance());

        return transactionConverter.toResponseDto(transaction);
    }

    // ── DELETE ────────────────────────────────────────────────────────────

    @DeleteMapping("/{transactionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTransaction(
            @RequestAttribute UUID userId,
            @PathVariable UUID transactionId,
            @RequestParam(defaultValue = "true") boolean revertBalance)
            throws InstanceNotFoundException {

        transactionService.deleteTransaction(userId, transactionId, revertBalance);
        log.info("Transaction deleted: txId={}, userId={}, revertBalance={}", transactionId, userId, revertBalance);
    }
}
