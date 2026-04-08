package Balio.web.rest.controllers;

import Balio.web.enablebanking.EnableBankingClient;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.AccountDao;
import Balio.web.model.entities.BankConnection;
import Balio.web.model.services.BankService;
import Balio.web.rest.dtos.BankConnectionDto;
import Balio.web.rest.dtos.BankConverter;
import Balio.web.rest.dtos.BankRuleDto;
import Balio.web.rest.dtos.BankRuleResponseDto;
import Balio.web.rest.dtos.BankSyncResultDto;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/bank")
public class BankController {

    private static final Logger log = LoggerFactory.getLogger(BankController.class);

    private final BankService bankService;
    private final BankConverter bankConverter;
    private final EnableBankingClient enableBankingClient;
    private final ObjectMapper objectMapper;
    private final AccountDao accountDao;

    public BankController(BankService bankService,
                          BankConverter bankConverter, EnableBankingClient enableBankingClient,
                          ObjectMapper objectMapper, AccountDao accountDao) {
        this.bankService = bankService;
        this.bankConverter = bankConverter;
        this.enableBankingClient = enableBankingClient;
        this.objectMapper = objectMapper;
        this.accountDao = accountDao;
    }

    @Value("${FRONTEND_URL:http://localhost:5173}")
    private String frontendUrl;

    // ── ENABLE BANKING: list ASPSPs (banks) ────────────────────────────

    @GetMapping(value = "/enablebanking/aspsps", produces = "application/json")
    public ResponseEntity<String> listAspsps(
            @RequestParam(defaultValue = "ES") String country) throws IOException {
        JsonNode node = enableBankingClient.listAspsps(country);
        return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(objectMapper.writeValueAsString(node));
    }

    // ── ENABLE BANKING: initiate connection ──────────────────────────────

    @GetMapping("/enablebanking/connect/{accountId}")
    public Map<String, String> initEnableBankingConnect(
            @RequestAttribute UUID userId,
            @PathVariable UUID accountId,
            @RequestParam String aspspName,
            @RequestParam(defaultValue = "ES") String aspspCountry)
            throws InstanceNotFoundException {
        String link = bankService.initEnableBankingConnection(
                userId, accountId, aspspName, aspspCountry);
        return Map.of("authUrl", link);
    }

    // ── ENABLE BANKING: callback (public, no JWT required) ───────────────

    @GetMapping("/enablebanking/callback")
    public ResponseEntity<Void> handleEnableBankingCallback(
            @RequestParam String code,
            @RequestParam String state) {
        try {
            bankService.completeEnableBankingConnection(state, code);
            URI redirect = URI.create(frontendUrl + "/accounts?linked=true");
            return ResponseEntity.status(HttpStatus.FOUND).location(redirect).build();
        } catch (Exception e) {
            log.error("Enable Banking OAuth callback failed, rolling back account: state={}, error={}",
                    state, e.getMessage(), e);
            // state == accountId, delete the pre-created account
            try {
                UUID accountId = UUID.fromString(state);
                accountDao.deleteById(accountId);
                log.info("Rolled back account {} after failed OAuth", accountId);
            } catch (Exception rollbackEx) {
                log.warn("Could not rollback account during OAuth error: {}", rollbackEx.getMessage());
            }
            URI redirect = URI.create(frontendUrl + "/accounts?link_error=true");
            return ResponseEntity.status(HttpStatus.FOUND).location(redirect).build();
        }
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
                                              @PathVariable UUID accountId,
                                              @RequestParam(defaultValue = "365") int lookBackDays,
                                              @RequestParam(defaultValue = "false") boolean ignoreSyncLimit)
            throws InstanceNotFoundException {
        int imported = bankService.syncTransactions(userId, accountId, lookBackDays, ignoreSyncLimit);
        return new BankSyncResultDto(imported, 1);
    }

    @PostMapping("/sync-stale")
    public BankSyncResultDto syncStaleTransactions(@RequestAttribute UUID userId,
                                                   @RequestParam(defaultValue = "15") int minutes) {
        int imported = bankService.syncStaleConnections(userId, minutes);
        return new BankSyncResultDto(imported, bankService.findLinkedConnections(userId).size());
    }

    @PostMapping("/sync-all")
    public BankSyncResultDto syncAllTransactions(@RequestAttribute UUID userId,
                                                 @RequestParam(defaultValue = "false") boolean ignoreSyncLimit,
                                                 @RequestParam(defaultValue = "365") int lookBackDays) {
        int imported = bankService.syncAllConnections(userId, ignoreSyncLimit, lookBackDays);
        return new BankSyncResultDto(imported, bankService.findLinkedConnections(userId).size());
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

    @GetMapping("/accounts/{accountId}/rules")
    public List<BankRuleResponseDto> listRules(@RequestAttribute UUID userId,
                                               @PathVariable UUID accountId)
            throws InstanceNotFoundException {
        return bankService.findAllRulesByUserIdAndAccountId(userId, accountId).stream()
                .map(bankConverter::toRuleResponseDto)
                .toList();
    }

    @PostMapping("/accounts/{accountId}/rules")
    public ResponseEntity<BankRuleResponseDto> createRule(@RequestAttribute UUID userId,
                                                          @PathVariable UUID accountId,
                                                          @Validated @RequestBody BankRuleDto dto)
            throws InstanceNotFoundException {
        UUID categoryId = dto.getMappedCategoryId() != null
                ? UUID.fromString(dto.getMappedCategoryId()) : null;

        BankService.RuleCreationResult result = bankService.createRule(
                userId,
                accountId,
                dto.getNamePattern(),
                dto.getBankCategory(),
                dto.getTransactionType(),
                dto.getMappedName(),
                categoryId,
                Boolean.TRUE.equals(dto.getExcludeMatch()),
                dto.getAmountMultiplier(),
                Boolean.TRUE.equals(dto.getApplyToExisting()),
                dto.getApplyWindowDays());

        BankRuleResponseDto response = bankConverter.toRuleResponseDto(result.rule());
        response.setAppliedTransactions(result.appliedTransactions());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/accounts/{accountId}/rules/{ruleId}")
    public BankRuleResponseDto updateRule(@RequestAttribute UUID userId,
                                          @PathVariable UUID accountId,
                                          @PathVariable UUID ruleId,
                                          @Validated @RequestBody BankRuleDto dto)
            throws InstanceNotFoundException {
        UUID categoryId = dto.getMappedCategoryId() != null
                ? UUID.fromString(dto.getMappedCategoryId()) : null;

        BankService.RuleUpdateResult result = bankService.updateRule(
                userId, accountId, ruleId,
                dto.getNamePattern(),
                dto.getBankCategory(),
                dto.getTransactionType(),
                dto.getMappedName(),
                categoryId,
                dto.getExcludeMatch(),
                dto.getAmountMultiplier(),
                Boolean.TRUE.equals(dto.getApplyToExisting()),
                dto.getApplyWindowDays());

        BankRuleResponseDto response = bankConverter.toRuleResponseDto(result.rule());
        response.setAppliedTransactions(result.appliedTransactions());
        return response;
    }

    @DeleteMapping("/accounts/{accountId}/rules/{ruleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRule(@RequestAttribute UUID userId,
                           @PathVariable UUID accountId,
                           @PathVariable UUID ruleId)
            throws InstanceNotFoundException {
        bankService.deleteRule(userId, accountId, ruleId);
    }
}
