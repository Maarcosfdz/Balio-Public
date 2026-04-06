package Balio.web.rest.controllers;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.AccountInvalidException;
import javax.management.InstanceNotFoundException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Category;
import Balio.web.model.entities.CategoryDao;
import Balio.web.model.entities.Transaction;
import Balio.web.model.services.TransactionService;
import Balio.web.rest.dtos.CsvImportResultDto;
import Balio.web.rest.dtos.CsvImportRuleDto;
import Balio.web.rest.dtos.TransactionBatchRuleDto;
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
    private final CategoryDao categoryDao;
    private final ObjectMapper objectMapper;

    public TransactionController(TransactionService transactionService,
                                 TransactionConverter transactionConverter,
                                 CategoryDao categoryDao,
                                 ObjectMapper objectMapper) {
        this.transactionService = transactionService;
        this.transactionConverter = transactionConverter;
        this.categoryDao = categoryDao;
        this.objectMapper = objectMapper;
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
            @RequestParam(defaultValue = "date") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return transactionService
                .findPaged(userId, type, accountId, categoryId, startDate, endDate, sortBy, sortDir, page, size)
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
                dto.getName(), dto.getAmount(), dto.getDate(), dto.getAffectsBalance(),
                dto.getOriginalAmount(), dto.getOriginalCurrency(), dto.getExchangeRate());

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
                dto.getName(), dto.getAmount(), dto.getDate(), dto.getAffectsBalance(),
                dto.getOriginalAmount(), dto.getOriginalCurrency(), dto.getExchangeRate());

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
                dto.getType(), dto.getName(), dto.getAmount(), dto.getDate(), dto.getAffectsBalance(),
                dto.getOriginalAmount(), dto.getOriginalCurrency(), dto.getExchangeRate());

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
        log.info("Transaction deleted: txId={}, userId={}, revertBalance={}",
                transactionId, userId, revertBalance);
    }

    // ── APPLY BATCH RULES ──────────────────────────────────────────────

    @PostMapping("/apply-rules")
    public ResponseEntity<java.util.Map<String, Integer>> applyBatchRules(
            @RequestAttribute UUID userId,
            @RequestBody TransactionBatchRuleDto dto) {

        int updated = transactionService.applyBatchRule(
                userId, dto.getType(), dto.getCategoryIds(),
                dto.getNameContains(), dto.getStartDate(), dto.getEndDate(),
            dto.getNewName(), dto.getNewCategoryId(), dto.getExcludeMatch(), dto.getAmountMultiplier());

        log.info("Batch rules applied: userId={}, updated={}", userId, updated);
        return ResponseEntity.ok(java.util.Map.of("updated", updated));
    }

    // ── EXPORT CSV ─────────────────────────────────────────────────────

    @GetMapping("/export/csv")
    public ResponseEntity<byte[]> exportCsv(
            @RequestAttribute UUID userId,
            @RequestParam(required = false) UUID accountId) {

        List<Transaction> transactions = transactionService.findFiltered(
                userId, null, accountId, null, null, null);

        StringBuilder csv = new StringBuilder();
        csv.append("Date,Name,Amount,Category\n");

        for (Transaction tx : transactions) {
            BigDecimal signedAmount = tx.getType() == TransactionType.EXPENSE
                    ? tx.getAmount().negate()
                    : tx.getAmount();

            csv.append(tx.getDate().toString()).append(',');
            csv.append(escapeCsv(tx.getName())).append(',');
            csv.append(signedAmount.toPlainString()).append(',');
            csv.append(escapeCsv(tx.getCategory() != null ? tx.getCategory().getName() : "")).append('\n');
        }

        byte[] content = csv.toString().getBytes(StandardCharsets.UTF_8);
        String filename = accountId != null
                ? "transactions_" + accountId + ".csv"
                : "transactions.csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(content);
    }

    // ── IMPORT CSV ─────────────────────────────────────────────────────

    @PostMapping(value = "/import/csv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CsvImportResultDto> importCsv(
            @RequestAttribute UUID userId,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) UUID accountId,
            @RequestParam(required = false) String rules) {

        List<CsvImportRuleDto> importRules = new ArrayList<>();
        if (rules != null && !rules.isBlank()) {
            try {
                importRules = objectMapper.readValue(rules, new TypeReference<>() {});
            } catch (Exception e) {
                log.warn("Failed to parse import rules JSON: {}", e.getMessage());
            }
        }

        // Load user categories for matching
        List<Category> userCategories = categoryDao.findAllByUserIdOrderByNameAsc(userId);

        int imported = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {

            String headerLine = reader.readLine();
            if (headerLine == null) {
                return ResponseEntity.badRequest()
                        .body(new CsvImportResultDto(0, 0, List.of("Empty CSV file")));
            }

            // Remove BOM if present
            if (headerLine.startsWith("\uFEFF")) {
                headerLine = headerLine.substring(1);
            }

            DetectedFormat format = detectFormat(headerLine);

            String line;
            int lineNum = 1;
            while ((line = reader.readLine()) != null) {
                lineNum++;
                if (line.isBlank()) { continue; }

                try {
                    ParsedRow row = parseLine(line, format);
                    if (row.name == null || row.name.isBlank() || row.amount == null) {
                        skipped++;
                        continue;
                    }

                    // Apply import rules to determine category
                    UUID categoryId = null;
                    if (row.categoryName != null && !row.categoryName.isBlank()) {
                        categoryId = findCategoryByName(userCategories, row.categoryName,
                                row.amount.compareTo(BigDecimal.ZERO) < 0
                                        ? TransactionType.EXPENSE : TransactionType.INCOME);
                    }

                    BigDecimal absAmount = row.amount.abs();
                    TransactionType type = row.amount.compareTo(BigDecimal.ZERO) < 0
                            ? TransactionType.EXPENSE : TransactionType.INCOME;

                    // Apply rules (rules override category and name from CSV)
                    String finalName = row.name.trim();
                        boolean excluded = false;
                    for (CsvImportRuleDto rule : importRules) {
                        if (rule.getPattern() != null && !rule.getPattern().isBlank()
                                && row.name.toLowerCase().contains(rule.getPattern().toLowerCase())) {
                            // Check transaction type filter
                            if (rule.getTransactionType() != null && !rule.getTransactionType().isBlank()) {
                                try {
                                    TransactionType ruleType = TransactionType.valueOf(rule.getTransactionType());
                                    if (ruleType != type) { continue; }
                                } catch (IllegalArgumentException e) {
                                    log.debug("Unknown transaction type in rule, skipping: {}",
                                            rule.getTransactionType());
                                }
                            }
                            if (Boolean.TRUE.equals(rule.getExcludeMatch())) {
                                excluded = true;
                                break;
                            }
                            if (rule.getAmountMultiplier() != null
                                    && rule.getAmountMultiplier().compareTo(BigDecimal.ZERO) > 0
                                    && rule.getAmountMultiplier().compareTo(BigDecimal.ONE) != 0) {
                                absAmount = absAmount.multiply(rule.getAmountMultiplier())
                                        .setScale(2, RoundingMode.HALF_UP)
                                        .abs();
                            }
                            if (rule.getCategoryId() != null && !rule.getCategoryId().isBlank()) {
                                try {
                                    UUID ruleCategoryId = UUID.fromString(rule.getCategoryId());
                                    Category ruleCategory = findCategoryById(userCategories, ruleCategoryId);
                                    // Keep backward compatibility when category catalog is not available,
                                    // but enforce type matching when the category is known.
                                    if (ruleCategory == null || ruleCategory.getType() == type) {
                                        categoryId = ruleCategoryId;
                                    }
                                } catch (IllegalArgumentException e) {
                                    log.debug("Invalid category UUID in rule, skipping: {}", rule.getCategoryId());
                                }
                            }
                            if (rule.getMappedName() != null && !rule.getMappedName().isBlank()) {
                                finalName = rule.getMappedName().trim();
                            }
                            break;
                        }
                    }

                    if (excluded || absAmount.compareTo(BigDecimal.ZERO) <= 0) {
                        skipped++;
                        continue;
                    }

                    if (type == TransactionType.EXPENSE) {
                        transactionService.addExpense(userId, accountId, categoryId,
                                finalName, absAmount, row.date, true);
                    } else {
                        transactionService.addIncome(userId, accountId, categoryId,
                                finalName, absAmount, row.date, true);
                    }
                    imported++;
                } catch (Exception e) {
                    skipped++;
                    errors.add("Line " + lineNum + ": " + e.getMessage());
                    if (errors.size() > 50) { break; }
                }
            }
        } catch (Exception e) {
            log.error("CSV import error", e);
            return ResponseEntity.badRequest()
                    .body(new CsvImportResultDto(imported, skipped, List.of("File read error: " + e.getMessage())));
        }

        log.info("CSV import completed: userId={}, imported={}, skipped={}", userId, imported, skipped);
        return ResponseEntity.ok(new CsvImportResultDto(imported, skipped, errors));
    }

    // ── CSV helpers ────────────────────────────────────────────────────

    private static class DetectedFormat {
        final boolean isBank;
        final char separator; // ';' or '\t' for bank, ',' for app

        DetectedFormat(boolean isBank, char separator) {
            this.isBank = isBank;
            this.separator = separator;
        }
    }

    private DetectedFormat detectFormat(String headerLine) {
        String lower = headerLine.toLowerCase();
        if (lower.contains("fecha")) {
            char sep = headerLine.contains("\t") ? '\t' : ';';
            return new DetectedFormat(true, sep);
        }
        return new DetectedFormat(false, ',');
    }

    private static class ParsedRow {
        LocalDate date;
        String name;
        BigDecimal amount;
        String categoryName;
    }

    private ParsedRow parseLine(String line, DetectedFormat format) {
        ParsedRow row = new ParsedRow();

        if (format.isBank) {
            // Bank format: Fecha ctble;Fecha valor;Concepto;Importe;Moneda;Saldo;Moneda;Concepto ampliado
            String[] parts = line.split(String.valueOf(format.separator), -1);
            if (parts.length < 4) { throw new IllegalArgumentException("Not enough columns"); }

            row.date = parseDateFlexible(parts[0].trim());
            row.name = parts[2].trim();
            // Bank amounts use comma as decimal separator and dot as thousands: 1.234,56 → 1234.56
            String amountStr = parts[3].trim().replace(".", "").replace(",", ".");
            row.amount = new BigDecimal(amountStr);
            row.categoryName = null;
        } else {
            // App format: Date,Name,Amount,Category
            String[] parts = splitCsvLine(line);
            if (parts.length < 3) { throw new IllegalArgumentException("Not enough columns"); }

            row.date = parseDateFlexible(parts[0].trim());
            row.name = parts[1].trim();
            row.amount = new BigDecimal(parts[2].trim());
            row.categoryName = parts.length > 3 ? parts[3].trim() : null;
        }

        return row;
    }

    private static final List<DateTimeFormatter> FLEXIBLE_DATE_FORMATS = List.of(
            DateTimeFormatter.ISO_LOCAL_DATE,
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("dd/MM/yy")
    );

    private LocalDate parseDateFlexible(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) { return LocalDate.now(); }

        for (DateTimeFormatter fmt : FLEXIBLE_DATE_FORMATS) {
            try {
                return LocalDate.parse(dateStr, fmt);
            } catch (DateTimeParseException e) {
                log.debug("Date '{}' does not match format {}, trying next", dateStr, fmt);
            }
        }

        return LocalDate.now();
    }

    private UUID findCategoryByName(List<Category> categories, String name, TransactionType type) {
        // Only accept categories matching the transaction type.
        for (Category c : categories) {
            if (c.getName().equalsIgnoreCase(name) && c.getType() == type) {
                return c.getId();
            }
        }
        return null;
    }

    private Category findCategoryById(List<Category> categories, UUID categoryId) {
        for (Category c : categories) {
            if (c.getId().equals(categoryId)) {
                return c;
            }
        }
        return null;
    }

    private String escapeCsv(String value) {
        if (value == null) { return ""; }
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private String[] splitCsvLine(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (inQuotes) {
                if (c == '"') {
                    if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
                        current.append('"');
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current.append(c);
                }
            } else {
                if (c == '"') {
                    inQuotes = true;
                } else if (c == ',') {
                    fields.add(current.toString());
                    current.setLength(0);
                } else {
                    current.append(c);
                }
            }
        }
        fields.add(current.toString());
        return fields.toArray(new String[0]);
    }
}
