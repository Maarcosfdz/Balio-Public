package Balio.web.rest.controllers;

import Balio.web.enablebanking.EnableBankingClient;
import Balio.web.enums.AccountType;
import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.AccountDao;
import Balio.web.model.entities.BankConnection;
import Balio.web.model.entities.BankTransactionRule;
import Balio.web.model.entities.User;
import Balio.web.model.services.BankService;
import Balio.web.rest.common.CommonControllerAdvice;
import Balio.web.rest.dtos.BankConnectionDto;
import Balio.web.rest.dtos.BankConverter;
import Balio.web.rest.dtos.BankRuleResponseDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class BankControllerTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID ACCOUNT_ID = UUID.randomUUID();
    private static final UUID RULE_ID = UUID.randomUUID();

    @Mock
    private BankService bankService;

    @Mock
    private BankConverter bankConverter;

    @Mock
    private EnableBankingClient enableBankingClient;

    @Mock
    private AccountDao accountDao;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        BankController controller = new BankController(
                bankService,
                bankConverter,
                enableBankingClient,
                objectMapper,
                accountDao
        );

        ReflectionTestUtils.setField(controller, "frontendUrl", "http://localhost:5173");

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new CommonControllerAdvice())
                .build();
    }

    @Nested
    @DisplayName("Enable Banking endpoints")
    class EnableBankingEndpoints {

        @Test
        @DisplayName("GET /bank/enablebanking/aspsps returns JSON payload")
        void shouldReturnAspsps() throws Exception {
            ObjectNode node = objectMapper.createObjectNode();
            node.putArray("aspsps").add("bank-a");

            when(enableBankingClient.listAspsps("ES")).thenReturn(node);

            mockMvc.perform(get("/bank/enablebanking/aspsps"))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Type", "application/json"))
                    .andExpect(jsonPath("$.aspsps[0]", is("bank-a")));
        }

        @Test
        @DisplayName("GET /bank/enablebanking/connect/{accountId} returns auth URL")
        void shouldReturnAuthUrl() throws Exception {
            when(bankService.initEnableBankingConnection(USER_ID, ACCOUNT_ID, "DemoBank", "ES"))
                    .thenReturn("https://auth.example.com");

            mockMvc.perform(get("/bank/enablebanking/connect/{accountId}", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID)
                            .param("aspspName", "DemoBank"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.authUrl", is("https://auth.example.com")));
        }

        @Test
        @DisplayName("GET /bank/enablebanking/callback success redirects linked=true")
        void shouldRedirectWhenCallbackSucceeds() throws Exception {
            when(bankService.completeEnableBankingConnection(ACCOUNT_ID.toString(), "code-ok"))
                    .thenReturn(new BankConnection(new Account("A", AccountType.BANK, "EUR", java.math.BigDecimal.ZERO,
                            new User("u", "u@e.com", "pwd")), new User("u", "u@e.com", "pwd"), null, null, null));

            mockMvc.perform(get("/bank/enablebanking/callback")
                            .param("code", "code-ok")
                            .param("state", ACCOUNT_ID.toString()))
                    .andExpect(status().isFound())
                    .andExpect(header().string("Location", is("http://localhost:5173/accounts?linked=true")));
        }

        @Test
        @DisplayName("GET /bank/enablebanking/callback failure rolls back account and redirects")
        void shouldRollbackAndRedirectWhenCallbackFails() throws Exception {
            when(bankService.completeEnableBankingConnection(ACCOUNT_ID.toString(), "bad-code"))
                    .thenThrow(new RuntimeException("oauth failed"));
            doNothing().when(accountDao).deleteById(ACCOUNT_ID);

            mockMvc.perform(get("/bank/enablebanking/callback")
                            .param("code", "bad-code")
                            .param("state", ACCOUNT_ID.toString()))
                    .andExpect(status().isFound())
                    .andExpect(header().string("Location", is("http://localhost:5173/accounts?link_error=true")));

            verify(accountDao).deleteById(ACCOUNT_ID);
        }

        @Test
        @DisplayName("GET /bank/enablebanking/callback with malformed state does not rollback by id")
        void shouldNotRollbackWhenStateIsMalformed() throws Exception {
            when(bankService.completeEnableBankingConnection("not-a-uuid", "bad-code"))
                    .thenThrow(new RuntimeException("oauth failed"));

            mockMvc.perform(get("/bank/enablebanking/callback")
                            .param("code", "bad-code")
                            .param("state", "not-a-uuid"))
                    .andExpect(status().isFound())
                    .andExpect(header().string("Location", is("http://localhost:5173/accounts?link_error=true")));

            verify(accountDao, never()).deleteById(any());
        }
    }

    @Nested
    @DisplayName("Connection and sync endpoints")
    class ConnectionAndSyncEndpoints {

        @Test
        @DisplayName("GET /bank/accounts/{accountId}/status returns linked=false when no connection")
        void shouldReturnUnlinkedStatus() throws Exception {
            when(bankService.getConnection(USER_ID, ACCOUNT_ID)).thenReturn(null);

            mockMvc.perform(get("/bank/accounts/{accountId}/status", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.accountId", is(ACCOUNT_ID.toString())))
                    .andExpect(jsonPath("$.linked", is(false)));
        }

        @Test
        @DisplayName("GET /bank/accounts/{accountId}/status maps converter response when linked")
        void shouldReturnLinkedStatus() throws Exception {
            Account account = new Account("Bank", AccountType.BANK, "EUR", java.math.BigDecimal.ZERO,
                    new User("u", "u@e.com", "pwd"));
            setFieldViaReflection(account, "id", ACCOUNT_ID);

            BankConnection connection = new BankConnection(account, new User("u", "u@e.com", "pwd"), null, null, null);
            setFieldViaReflection(connection, "id", UUID.randomUUID());

            BankConnectionDto dto = new BankConnectionDto();
            dto.setAccountId(ACCOUNT_ID.toString());
            dto.setLinked(true);
            dto.setProvider("ENABLE_BANKING");

            when(bankService.getConnection(USER_ID, ACCOUNT_ID)).thenReturn(connection);
            when(bankConverter.toConnectionDto(connection)).thenReturn(dto);

            mockMvc.perform(get("/bank/accounts/{accountId}/status", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.linked", is(true)))
                    .andExpect(jsonPath("$.provider", is("ENABLE_BANKING")));
        }

        @Test
        @DisplayName("POST /bank/accounts/{accountId}/sync returns imported transactions")
        void shouldSyncSpecificAccount() throws Exception {
            when(bankService.syncTransactions(USER_ID, ACCOUNT_ID)).thenReturn(7);

            mockMvc.perform(post("/bank/accounts/{accountId}/sync", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(7)))
                    .andExpect(jsonPath("$.syncedAccounts", is(1)));
        }

        @Test
        @DisplayName("POST /bank/sync-stale uses default minutes=15")
        void shouldSyncStaleWithDefaultMinutes() throws Exception {
            when(bankService.syncStaleConnections(USER_ID, 15)).thenReturn(5);
                        when(bankService.findLinkedConnections(USER_ID)).thenReturn(List.of(sampleConnection(), sampleConnection()));

            mockMvc.perform(post("/bank/sync-stale")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(5)))
                    .andExpect(jsonPath("$.syncedAccounts", is(2)));
        }

        @Test
        @DisplayName("POST /bank/sync-all returns imported and linked account count")
        void shouldSyncAll() throws Exception {
            when(bankService.syncAllConnections(USER_ID)).thenReturn(9);
            when(bankService.findLinkedConnections(USER_ID))
                                        .thenReturn(List.of(sampleConnection(), sampleConnection(), sampleConnection()));

            mockMvc.perform(post("/bank/sync-all")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.imported", is(9)))
                    .andExpect(jsonPath("$.syncedAccounts", is(3)));
        }

        @Test
        @DisplayName("DELETE /bank/accounts/{accountId}/link returns 204")
        void shouldUnlinkAccount() throws Exception {
            doNothing().when(bankService).unlinkAccount(USER_ID, ACCOUNT_ID);

            mockMvc.perform(delete("/bank/accounts/{accountId}/link", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNoContent());
        }
    }

    @Nested
    @DisplayName("Rules endpoints")
    class RuleEndpoints {

        @Test
        @DisplayName("GET /bank/accounts/{accountId}/rules returns mapped rules")
        void shouldListRules() throws Exception {
            Account account = new Account("Main", AccountType.BANK, "EUR", java.math.BigDecimal.ZERO,
                    new User("u", "u@e.com", "pwd"));
            setFieldViaReflection(account, "id", ACCOUNT_ID);

            BankTransactionRule rule = new BankTransactionRule(new User("u", "u@e.com", "pwd"),
                    account, "amaz", null, TransactionType.EXPENSE, "Amazon", null, 200);
            setFieldViaReflection(rule, "id", RULE_ID);

            BankRuleResponseDto dto = new BankRuleResponseDto();
            dto.setId(RULE_ID.toString());
            dto.setMappedName("Amazon");

            when(bankService.findAllRulesByUserIdAndAccountId(USER_ID, ACCOUNT_ID)).thenReturn(List.of(rule));
            when(bankConverter.toRuleResponseDto(rule)).thenReturn(dto);

            mockMvc.perform(get("/bank/accounts/{accountId}/rules", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].id", is(RULE_ID.toString())))
                    .andExpect(jsonPath("$[0].mappedName", is("Amazon")));
        }

        @Test
        @DisplayName("POST /bank/accounts/{accountId}/rules creates rule and sets appliedTransactions")
        void shouldCreateRule() throws Exception {
            Account account = new Account("Main", AccountType.BANK, "EUR", java.math.BigDecimal.ZERO,
                    new User("u", "u@e.com", "pwd"));
            setFieldViaReflection(account, "id", ACCOUNT_ID);

            BankTransactionRule rule = new BankTransactionRule(new User("u", "u@e.com", "pwd"),
                    account, "netflix", null, TransactionType.EXPENSE, "Netflix", null, 300);
            setFieldViaReflection(rule, "id", RULE_ID);

            BankRuleResponseDto converted = new BankRuleResponseDto();
            converted.setId(RULE_ID.toString());
            converted.setMappedName("Netflix");

            when(bankService.createRule(
                    eq(USER_ID), eq(ACCOUNT_ID), eq("netflix"), eq("streaming"), eq(TransactionType.EXPENSE),
                    eq("Netflix"), isNull(), eq(true), eq(30)))
                    .thenReturn(new BankService.RuleCreationResult(rule, 4));
            when(bankConverter.toRuleResponseDto(rule)).thenReturn(converted);

            mockMvc.perform(post("/bank/accounts/{accountId}/rules", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "namePattern": "netflix",
                                      "bankCategory": "streaming",
                                      "transactionType": "EXPENSE",
                                      "mappedName": "Netflix",
                                      "applyToExisting": true,
                                      "applyWindowDays": 30
                                    }
                                    """))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id", is(RULE_ID.toString())))
                    .andExpect(jsonPath("$.appliedTransactions", is(4)));
        }

        @Test
        @DisplayName("POST /bank/accounts/{accountId}/rules with malformed mappedCategoryId returns 400")
        void shouldReturn400WhenCreateMappedCategoryIdMalformed() throws Exception {
            mockMvc.perform(post("/bank/accounts/{accountId}/rules", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "namePattern": "netflix",
                                      "mappedName": "Netflix",
                                      "mappedCategoryId": "bad-uuid"
                                    }
                                    """))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code", is("project.exceptions.IllegalArgumentException")));
        }

        @Test
        @DisplayName("PUT /bank/accounts/{accountId}/rules/{ruleId} updates rule")
        void shouldUpdateRule() throws Exception {
            Account account = new Account("Main", AccountType.BANK, "EUR", java.math.BigDecimal.ZERO,
                    new User("u", "u@e.com", "pwd"));
            setFieldViaReflection(account, "id", ACCOUNT_ID);

            BankTransactionRule updatedRule = new BankTransactionRule(new User("u", "u@e.com", "pwd"),
                    account, "uber", null, TransactionType.EXPENSE, "Uber", null, 250);
            setFieldViaReflection(updatedRule, "id", RULE_ID);

            BankRuleResponseDto converted = new BankRuleResponseDto();
            converted.setId(RULE_ID.toString());
            converted.setMappedName("Uber");

            when(bankService.updateRule(
                    eq(USER_ID), eq(ACCOUNT_ID), eq(RULE_ID), eq("uber"), isNull(), eq(TransactionType.EXPENSE),
                    eq("Uber"), isNull(), eq(false), isNull()))
                    .thenReturn(new BankService.RuleUpdateResult(updatedRule, 1));
            when(bankConverter.toRuleResponseDto(updatedRule)).thenReturn(converted);

            mockMvc.perform(put("/bank/accounts/{accountId}/rules/{ruleId}", ACCOUNT_ID, RULE_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "namePattern": "uber",
                                      "transactionType": "EXPENSE",
                                      "mappedName": "Uber"
                                    }
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(RULE_ID.toString())))
                    .andExpect(jsonPath("$.mappedName", is("Uber")));
        }

        @Test
        @DisplayName("DELETE /bank/accounts/{accountId}/rules/{ruleId} returns 204")
        void shouldDeleteRule() throws Exception {
            doNothing().when(bankService).deleteRule(USER_ID, ACCOUNT_ID, RULE_ID);

            mockMvc.perform(delete("/bank/accounts/{accountId}/rules/{ruleId}", ACCOUNT_ID, RULE_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNoContent());
        }
    }

    private static void setFieldViaReflection(Object target, String fieldName, Object value) {
        try {
            java.lang.reflect.Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException("Cannot set field " + fieldName, e);
        }
    }

        private static BankConnection sampleConnection() {
                User user = new User("u", "u@e.com", "pwd");
                Account account = new Account("A", AccountType.BANK, "EUR", java.math.BigDecimal.ZERO, user);
                return new BankConnection(account, user, null, null, null);
        }
}
