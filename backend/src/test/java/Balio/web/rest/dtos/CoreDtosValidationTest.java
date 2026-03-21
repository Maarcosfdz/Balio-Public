package Balio.web.rest.dtos;

import Balio.web.enums.AccountType;
import Balio.web.enums.TransactionType;
import Balio.web.enums.WidgetChartType;
import Balio.web.enums.WidgetType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CoreDtosValidationTest {

    private Validator validator;

    @BeforeEach
    void setUp() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @Test
    @DisplayName("AccountDto validates size constraints")
    void shouldValidateAccountDtoSize() {
        AccountDto dto = new AccountDto();
        dto.setName("A".repeat(81));
        dto.setCurrency("EURO");
        dto.setType(AccountType.BANK);
        dto.setSetDefault(true);

        Set<ConstraintViolation<AccountDto>> violations = validator.validate(dto);

        assertEquals(2, violations.size());
    }

    @Test
    @DisplayName("TransactionDto validates required and positive fields")
    void shouldValidateTransactionDtoRequiredFields() {
        TransactionDto dto = new TransactionDto();
        dto.setName(" ");
        dto.setAmount(BigDecimal.ZERO);

        Set<ConstraintViolation<TransactionDto>> violations = validator.validate(dto);

        assertEquals(3, violations.size());
    }

    @Test
    @DisplayName("ChartWidgetDto validates blank and max-length constraints")
    void shouldValidateChartWidgetDtoFields() {
        ChartWidgetDto dto = new ChartWidgetDto();
        dto.setName(" ");
        dto.setConfiguration(" ");
        dto.setLayoutSize("X".repeat(21));

        Set<ConstraintViolation<ChartWidgetDto>> violations = validator.validate(dto);

        assertEquals(5, violations.size());
    }

    @Test
    @DisplayName("BankRuleDto validates max length boundaries")
    void shouldValidateBankRuleDtoLengthLimits() {
        BankRuleDto dto = new BankRuleDto();
        dto.setNamePattern("N".repeat(201));
        dto.setBankCategory("C".repeat(101));
        dto.setMappedName("M".repeat(121));

        Set<ConstraintViolation<BankRuleDto>> violations = validator.validate(dto);

        assertEquals(3, violations.size());
    }

    @Test
    @DisplayName("DTO getters and setters preserve account/transaction/bank/chart payload")
    void shouldRoundTripCoreDtoFields() {
        AccountDto account = new AccountDto();
        account.setName("Main");
        account.setType(AccountType.CASH);
        account.setCurrency("EUR");
        account.setSetDefault(false);

        TransactionDto tx = new TransactionDto();
        UUID accountId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();
        tx.setName("Coffee");
        tx.setAmount(new BigDecimal("3.50"));
        tx.setDate(LocalDate.of(2026, 3, 20));
        tx.setAccountId(accountId);
        tx.setCategoryId(categoryId);
        tx.setAffectsBalance(true);
        tx.setType(TransactionType.EXPENSE);

        BankConnectionDto bank = new BankConnectionDto();
        Instant now = Instant.now();
        bank.setId(UUID.randomUUID().toString());
        bank.setAccountId(accountId.toString());
        bank.setProvider("ENABLE_BANKING");
        bank.setLastSync(now);
        bank.setConsentExpires(now.plusSeconds(3600));
        bank.setLinked(true);

        ChartWidgetPreviewResponseDto preview = new ChartWidgetPreviewResponseDto();
        ObjectNode data = new ObjectMapper().createObjectNode().put("kpi", 12);
        preview.setWidgetType(WidgetType.KPI.name());
        preview.setChartType(WidgetChartType.KPI_CARD.name());
        preview.setData(data);

        assertEquals("Main", account.getName());
        assertEquals(AccountType.CASH, account.getType());
        assertEquals("EUR", account.getCurrency());
        assertFalse(account.getSetDefault());

        assertEquals("Coffee", tx.getName());
        assertEquals(new BigDecimal("3.50"), tx.getAmount());
        assertEquals(LocalDate.of(2026, 3, 20), tx.getDate());
        assertEquals(accountId, tx.getAccountId());
        assertEquals(categoryId, tx.getCategoryId());
        assertTrue(tx.getAffectsBalance());
        assertEquals(TransactionType.EXPENSE, tx.getType());

        assertEquals("ENABLE_BANKING", bank.getProvider());
        assertTrue(bank.isLinked());
        assertNotNull(bank.getLastSync());
        assertNotNull(bank.getConsentExpires());

        assertEquals("KPI", preview.getWidgetType());
        assertEquals("KPI_CARD", preview.getChartType());
        assertEquals(12, preview.getData().get("kpi").asInt());
    }
}
