package Balio.web.rest.controllers;

import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.BankConnection;
import Balio.web.model.entities.BankTransactionRule;
import Balio.web.model.services.BankRuleService;
import Balio.web.model.services.BankService;
import Balio.web.rest.dtos.BankConnectionDto;
import Balio.web.rest.dtos.BankConverter;
import Balio.web.rest.dtos.BankRuleDto;
import Balio.web.rest.dtos.BankRuleResponseDto;
import Balio.web.rest.dtos.BankSyncResultDto;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
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

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/bank")
public class BankController {

    private static final Logger log = LoggerFactory.getLogger(BankController.class);

    private final BankService bankService;
    private final BankRuleService bankRuleService;
    private final BankConverter bankConverter;

    @Value("${FRONTEND_URL:http://localhost:5173}")
    private String frontendUrl;

    public BankController(BankService bankService,
                          BankRuleService bankRuleService,
                          BankConverter bankConverter) {
        this.bankService = bankService;
        this.bankRuleService = bankRuleService;
        this.bankConverter = bankConverter;
    }

    // ── CONNECTION: initiate OAuth ───────────────────────────────────────

    @GetMapping("/connect/{accountId}")
    public Map<String, String> initConnect(@RequestAttribute UUID userId,
                                           @PathVariable UUID accountId)
            throws InstanceNotFoundException {
        String authUrl = bankService.initConnection(userId, accountId);
        return Map.of("authUrl", authUrl);
    }

    // ── CONNECTION: OAuth callback (public, no JWT required) ─────────────

    @GetMapping("/callback")
    public ResponseEntity<Void> handleCallback(@RequestParam String code,
                                               @RequestParam String state)
            throws InstanceNotFoundException {
        BankConnection connection = bankService.completeConnection(state, code);
        log.info("OAuth callback completed for accountId={}", connection.getAccount().getId());

        // Redirect back to the frontend account page
        URI redirect = URI.create(frontendUrl + "/accounts/" + connection.getAccount().getId() + "?linked=true");
        return ResponseEntity.status(HttpStatus.FOUND).location(redirect).build();
    }

    // ── CONNECTION: status ───────────────────────────────────────────────

    @GetMapping("/accounts/{accountId}/status")
    public BankConnectionDto getConnectionStatus(@RequestAttribute UUID userId,
                                                 @PathVariable UUID accountId) {
        BankConnection connection = bankService.getConnection(userId, accountId);
        if (connection == null) {
            BankConnectionDto dto = new BankConnectionDto();
            dto.setAccountId(accountId.toString());
            dto.setLinked(false);
            return dto;
        }
        return bankConverter.toConnectionDto(connection);
    }

    // ── SYNC ─────────────────────────────────────────────────────────────

    @PostMapping("/accounts/{accountId}/sync")
    public BankSyncResultDto syncTransactions(@RequestAttribute UUID userId,
                                              @PathVariable UUID accountId)
            throws InstanceNotFoundException {
        int imported = bankService.syncTransactions(userId, accountId);
        return new BankSyncResultDto(imported);
    }

    // ── UNLINK ───────────────────────────────────────────────────────────

    @DeleteMapping("/accounts/{accountId}/link")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unlinkAccount(@RequestAttribute UUID userId,
                              @PathVariable UUID accountId)
            throws InstanceNotFoundException {
        bankService.unlinkAccount(userId, accountId);
    }

    // ══════════════════════════════════════════════════════════════════════
    // ── MAPPING RULES ────────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════

    @GetMapping("/rules")
    public List<BankRuleResponseDto> listRules(@RequestAttribute UUID userId) {
        return bankRuleService.findAllByUserId(userId).stream()
                .map(bankConverter::toRuleResponseDto)
                .toList();
    }

    @PostMapping("/rules")
    public ResponseEntity<BankRuleResponseDto> createRule(@RequestAttribute UUID userId,
                                                          @Validated @RequestBody BankRuleDto dto)
            throws InstanceNotFoundException {
        UUID categoryId = dto.getMappedCategoryId() != null
                ? UUID.fromString(dto.getMappedCategoryId()) : null;

        BankTransactionRule rule = bankRuleService.createRule(
                userId,
                dto.getNamePattern(),
                dto.getBankCategory(),
                dto.getMappedName(),
                categoryId,
                dto.getPriority() != null ? dto.getPriority() : 0);

        return ResponseEntity.status(HttpStatus.CREATED).body(bankConverter.toRuleResponseDto(rule));
    }

    @PutMapping("/rules/{ruleId}")
    public BankRuleResponseDto updateRule(@RequestAttribute UUID userId,
                                          @PathVariable UUID ruleId,
                                          @Validated @RequestBody BankRuleDto dto)
            throws InstanceNotFoundException {
        UUID categoryId = dto.getMappedCategoryId() != null
                ? UUID.fromString(dto.getMappedCategoryId()) : null;

        BankTransactionRule rule = bankRuleService.updateRule(
                userId, ruleId,
                dto.getNamePattern(),
                dto.getBankCategory(),
                dto.getMappedName(),
                categoryId,
                dto.getPriority());

        return bankConverter.toRuleResponseDto(rule);
    }

    @DeleteMapping("/rules/{ruleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRule(@RequestAttribute UUID userId,
                           @PathVariable UUID ruleId)
            throws InstanceNotFoundException {
        bankRuleService.deleteRule(userId, ruleId);
    }
}
