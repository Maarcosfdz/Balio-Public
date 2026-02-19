package Balio.web.rest.controllers;

import java.net.URI;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
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

import Balio.web.model.Exceptions.AccountInvalidException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Transaction;
import Balio.web.model.services.TransactionService;
import Balio.web.rest.dtos.TransactionConverter;
import Balio.web.rest.dtos.TransactionDto;
import Balio.web.rest.dtos.TransactionResponseDto;

import javax.management.InstanceNotFoundException;

@RestController
@RequestMapping("/transaction")
public class TransactionController {

    private final TransactionService transactionService;
    private final TransactionConverter transactionConverter;
    
    public TransactionController(TransactionService transactionService, TransactionConverter transactionConverter) {
            this.transactionService = transactionService;
            this.transactionConverter = transactionConverter;
    }

    @PostMapping("/expense")
    public ResponseEntity<TransactionResponseDto> addExpense(
            @RequestAttribute UUID userId,
            @Validated @RequestBody TransactionDto dto)
            throws AccountInvalidException, UserNotFoundException {

        Transaction transaction = transactionService.addExpense(
                userId, dto.getAccountId(), dto.getCategoryId(),
                dto.getName(), dto.getAmount(), dto.getDate(), dto.getAffectsBalance());

        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest().path("/{id}")
                .buildAndExpand(transaction.getId()).toUri();

        return ResponseEntity.created(location).body(transactionConverter.toResponseDto(transaction));
    }

    @PostMapping("/income")
    public ResponseEntity<TransactionResponseDto> addIncome(
            @RequestAttribute UUID userId,
            @Validated @RequestBody TransactionDto dto)
            throws AccountInvalidException, UserNotFoundException {

        Transaction transaction = transactionService.addIncome(
                userId, dto.getAccountId(), dto.getCategoryId(),
                dto.getName(), dto.getAmount(), dto.getDate(), dto.getAffectsBalance());

        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest().path("/{id}")
                .buildAndExpand(transaction.getId()).toUri();

        return ResponseEntity.created(location).body(transactionConverter.toResponseDto(transaction));
    }

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

    @DeleteMapping("/{transactionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTransaction(
            @RequestAttribute UUID userId,
            @PathVariable UUID transactionId,
            @RequestParam(defaultValue = "true") boolean revertBalance)
            throws InstanceNotFoundException {

        transactionService.deleteTransaction(userId, transactionId, revertBalance);
    }

}
