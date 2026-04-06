package Balio.web.rest.controllers;

import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.util.StringUtils;
import Balio.web.model.entities.Account;
import Balio.web.model.services.AccountService;
import Balio.web.rest.dtos.AccountConverter;
import Balio.web.rest.dtos.AccountDto;
import Balio.web.rest.dtos.AccountResponseDto;
import Balio.web.rest.dtos.AccountSummaryDto;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.math.BigDecimal;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/account")
public class AccountController {

    private static final Logger log = LoggerFactory.getLogger(AccountController.class);

    private final AccountService accountService;
    private final AccountConverter accountConverter;

    public AccountController(AccountService accountService, AccountConverter accountConverter) {
        this.accountService = accountService;
        this.accountConverter = accountConverter;
    }

    // ── LIST (summary: name + type) ──────────────────────────────────────

    @GetMapping
    public List<AccountSummaryDto> getAllAccounts(@RequestAttribute UUID userId) {
        List<Account> accounts = accountService.findAllByUserId(userId);
        UUID defaultAccountId = accountService.getDefaultAccountId(userId);
        return accounts.stream()
                .map(a -> accountConverter.toSummaryDto(a, defaultAccountId))
                .toList();
    }

    // ── DETAIL (all fields) ──────────────────────────────────────────────

    @GetMapping("/{accountId}")
    public AccountResponseDto getAccount(@RequestAttribute UUID userId,
                                         @PathVariable UUID accountId) throws InstanceNotFoundException {
        Account account = accountService.findByIdAndUserId(accountId, userId);
        return accountConverter.toResponseDto(account);
    }

    // ── CREATE ───────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<AccountResponseDto> createAccount(@RequestAttribute UUID userId,
                                                            @Validated @RequestBody AccountDto dto) {

        Account account = accountService.createAccount(
            userId,
            dto.getName(),
            dto.getType(),
            dto.getCurrency(),
            dto.getSetDefault(),
            dto.getSyncDeletedTransactions());

        log.info("Account created: accountId={}, userId={}, type={}",
                account.getId(), userId,
                dto.getType() != null ? dto.getType().name() : null);

        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest().path("/{id}")
                .buildAndExpand(account.getId()).toUri();

        return ResponseEntity.created(location).body(accountConverter.toResponseDto(account));
    }

    // ── UPDATE ───────────────────────────────────────────────────────────

    @PutMapping("/{accountId}")
    public AccountResponseDto updateAccount(@RequestAttribute UUID userId,
                                            @PathVariable UUID accountId,
                                            @Validated @RequestBody AccountDto dto) throws InstanceNotFoundException {

        Account account = accountService.modifyAccount(
                userId, accountId, dto.getName(), dto.getType(), dto.getCurrency(), dto.getSyncDeletedTransactions());

        return accountConverter.toResponseDto(account);
    }

    // ── DELETE ────────────────────────────────────────────────────────────

    @DeleteMapping("/{accountId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(@RequestAttribute UUID userId,
                              @PathVariable UUID accountId,
                              @RequestParam(name = "deleteTransactions", defaultValue = "false")
                              boolean deleteTransactions) throws InstanceNotFoundException {
        if (deleteTransactions) {
            accountService.deleteAccount(userId, accountId, true);
        } else {
            accountService.deleteAccount(userId, accountId);
        }
        log.info("Account deleted: accountId={}, userId={}", accountId, userId);
    }

    // ── ADJUST BALANCE (CASH / OTHER only) ───────────────────────────────

    @PatchMapping("/{accountId}/balance")
    public AccountResponseDto adjustBalance(@RequestAttribute UUID userId,
                                            @PathVariable UUID accountId,
                                            @RequestBody Map<String, BigDecimal> body)
            throws InstanceNotFoundException {
        BigDecimal newBalance = body.get("balance");
        if (newBalance == null) {
            throw new Balio.web.model.Exceptions.AccountInvalidException("balance is required");
        }
        Account account = accountService.adjustBalance(userId, accountId, newBalance);
        log.info("Balance adjusted: accountId={}, userId={}, newBalance={}", accountId, userId, newBalance);
        return accountConverter.toResponseDto(account);
    }

    // ── SET / CLEAR DEFAULT ACCOUNT ──────────────────────────────────────

    @PutMapping("/{accountId}/setDefault")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setDefaultAccount(@RequestAttribute UUID userId,
                                  @PathVariable UUID accountId) throws InstanceNotFoundException {
        accountService.setDefaultAccount(userId, accountId);
    }

    @PutMapping("/clearDefault")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearDefaultAccount(@RequestAttribute UUID userId) {
        accountService.clearDefaultAccount(userId);
    }
}
