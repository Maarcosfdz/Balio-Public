package Balio.web.rest.controllers;

import Balio.web.enums.AccountType;
import Balio.web.model.Exceptions.AccountInvalidException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.User;
import Balio.web.model.services.AccountService;
import Balio.web.rest.common.CommonControllerAdvice;
import Balio.web.rest.dtos.AccountConverter;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-layer unit tests for {@link AccountController}.
 * <p>
 * Uses {@code standaloneSetup} (no Spring context) with
 * {@link CommonControllerAdvice} for exception mapping.
 */
@ExtendWith(MockitoExtension.class)
class AccountControllerTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID ACCOUNT_ID = UUID.randomUUID();
    private static final String VALID_NAME = "Main Account";

    @Mock
    private AccountService accountService;

    private final AccountConverter accountConverter = new AccountConverter();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private MockMvc mockMvc;

    private User testUser;
    private Account testAccount;

    @BeforeEach
    void setUp() {
        AccountController controller = new AccountController(accountService, accountConverter);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new CommonControllerAdvice())
                .build();

        testUser = new User("Nick", "nick@example.com", "encodedPwd");
        setFieldViaReflection(testUser, "id", USER_ID);

        testAccount = new Account(VALID_NAME, AccountType.BANK, "EUR", new BigDecimal("1000.00"), testUser);
        setFieldViaReflection(testAccount, "id", ACCOUNT_ID);
    }

    /* ═══════════════════════════════════════════════════════════
     *  POST /account
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("POST /account")
    class CreateAccountEndpoint {

        @Test
        @DisplayName("201 – valid account with all explicit fields")
        void shouldReturn201_whenValidAccount() throws Exception {
            when(accountService.createAccount(
                    eq(USER_ID), eq(VALID_NAME), eq(AccountType.BANK), eq("EUR"), eq(false)))
                    .thenReturn(testAccount);

            mockMvc.perform(post("/account")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(accountJson(VALID_NAME, "BANK", "EUR", false)))
                    .andExpect(status().isCreated())
                    .andExpect(header().exists("Location"))
                    .andExpect(jsonPath("$.id", is(ACCOUNT_ID.toString())))
                    .andExpect(jsonPath("$.name", is(VALID_NAME)))
                    .andExpect(jsonPath("$.type", is("BANK")))
                    .andExpect(jsonPath("$.currency", is("EUR")))
                    .andExpect(jsonPath("$.balance", is(1000.00)));
        }

        @Test
        @DisplayName("201 – CASH type account")
        void shouldReturn201_whenCashType() throws Exception {
            Account cashAccount = new Account("Cash", AccountType.CASH, "USD", BigDecimal.ZERO, testUser);
            setFieldViaReflection(cashAccount, "id", UUID.randomUUID());

            when(accountService.createAccount(
                    eq(USER_ID), eq("Cash"), eq(AccountType.CASH), eq("USD"), isNull()))
                    .thenReturn(cashAccount);

            mockMvc.perform(post("/account")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(accountJson("Cash", "CASH", "USD", null)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.type", is("CASH")))
                    .andExpect(jsonPath("$.currency", is("USD")));
        }

        @Test
        @DisplayName("201 – OTHER type account")
        void shouldReturn201_whenOtherType() throws Exception {
            Account otherAccount = new Account("Crypto", AccountType.OTHER, "BTC", BigDecimal.ZERO, testUser);
            setFieldViaReflection(otherAccount, "id", UUID.randomUUID());

            when(accountService.createAccount(
                    eq(USER_ID), eq("Crypto"), eq(AccountType.OTHER), eq("BTC"), isNull()))
                    .thenReturn(otherAccount);

            mockMvc.perform(post("/account")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(accountJson("Crypto", "OTHER", "BTC", null)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.type", is("OTHER")));
        }

        @Test
        @DisplayName("201 – empty body (all fields optional → service applies defaults)")
        void shouldReturn201_whenEmptyBody() throws Exception {
            Account defaultAccount = new Account("Account 1", AccountType.CASH, "EUR", BigDecimal.ZERO, testUser);
            setFieldViaReflection(defaultAccount, "id", UUID.randomUUID());

            when(accountService.createAccount(
                    eq(USER_ID), isNull(), isNull(), isNull(), isNull()))
                    .thenReturn(defaultAccount);

            mockMvc.perform(post("/account")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.name", is("Account 1")));
        }

        @Test
        @DisplayName("201 – setDefault=true sets account as default")
        void shouldReturn201_whenSetDefaultTrue() throws Exception {
            when(accountService.createAccount(
                    eq(USER_ID), eq(VALID_NAME), eq(AccountType.BANK), eq("EUR"), eq(true)))
                    .thenReturn(testAccount);

            mockMvc.perform(post("/account")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(accountJson(VALID_NAME, "BANK", "EUR", true)))
                    .andExpect(status().isCreated());

            verify(accountService).createAccount(USER_ID, VALID_NAME, AccountType.BANK, "EUR", true);
        }

        @Test
        @DisplayName("400 – name exceeds max length (80)")
        void shouldReturn400_whenNameTooLong() throws Exception {
            String longName = "A".repeat(81);
            mockMvc.perform(post("/account")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(accountJson(longName, "BANK", "EUR", null)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – currency exceeds max length (3)")
        void shouldReturn400_whenCurrencyTooLong() throws Exception {
            mockMvc.perform(post("/account")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(accountJson(VALID_NAME, "BANK", "EURO", null)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("500 – invalid enum value for type (deserialization error)")
        void shouldReturn500_whenInvalidEnumType() throws Exception {
            // CommonControllerAdvice does not handle HttpMessageNotReadableException,
            // so Jackson deserialization errors for invalid enum values return 500.
            mockMvc.perform(post("/account")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\":\"Test\",\"type\":\"INVALID_TYPE\"}"))
                    .andExpect(status().isInternalServerError());
        }

        @Test
        @DisplayName("404 – UserNotFoundException")
        void shouldReturn404_whenUserNotFound() throws Exception {
            when(accountService.createAccount(
                    eq(USER_ID), eq(VALID_NAME), eq(AccountType.BANK), eq("EUR"), isNull()))
                    .thenThrow(new UserNotFoundException("User not found"));

            mockMvc.perform(post("/account")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(accountJson(VALID_NAME, "BANK", "EUR", null)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code", is("project.exceptions.InstanceNotFoundException")));
        }

        @Test
        @DisplayName("400 – AccountInvalidException (max accounts reached)")
        void shouldReturn400_whenMaxAccountsReached() throws Exception {
            when(accountService.createAccount(
                    eq(USER_ID), eq(VALID_NAME), eq(AccountType.BANK), eq("EUR"), isNull()))
                    .thenThrow(new AccountInvalidException("Maximum number of accounts (5) reached"));

            mockMvc.perform(post("/account")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(accountJson(VALID_NAME, "BANK", "EUR", null)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code", is("project.exceptions.AccountInvalidException")));
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  PUT /account/{accountId}
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("PUT /account/{accountId}")
    class UpdateAccountEndpoint {

        @Test
        @DisplayName("200 – valid update returns updated account")
        void shouldReturn200_whenValidUpdate() throws Exception {
            Account updated = new Account("Savings", AccountType.OTHER, "USD", new BigDecimal("500.00"), testUser);
            setFieldViaReflection(updated, "id", ACCOUNT_ID);

            when(accountService.modifyAccount(
                    eq(USER_ID), eq(ACCOUNT_ID), eq("Savings"), eq(AccountType.OTHER), eq("USD")))
                    .thenReturn(updated);

            mockMvc.perform(put("/account/{accountId}", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(accountJson("Savings", "OTHER", "USD", null)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(ACCOUNT_ID.toString())))
                    .andExpect(jsonPath("$.name", is("Savings")))
                    .andExpect(jsonPath("$.type", is("OTHER")))
                    .andExpect(jsonPath("$.currency", is("USD")))
                    .andExpect(jsonPath("$.balance", is(500.00)));
        }

        @Test
        @DisplayName("200 – partial update (only name)")
        void shouldReturn200_whenPartialUpdateName() throws Exception {
            Account updated = new Account("New Name", AccountType.BANK, "EUR", new BigDecimal("1000.00"), testUser);
            setFieldViaReflection(updated, "id", ACCOUNT_ID);

            when(accountService.modifyAccount(
                    eq(USER_ID), eq(ACCOUNT_ID), eq("New Name"), isNull(), isNull()))
                    .thenReturn(updated);

            mockMvc.perform(put("/account/{accountId}", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(accountJson("New Name", null, null, null)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name", is("New Name")));
        }

        @Test
        @DisplayName("200 – empty body is valid (all fields optional)")
        void shouldReturn200_whenEmptyBody() throws Exception {
            when(accountService.modifyAccount(
                    eq(USER_ID), eq(ACCOUNT_ID), isNull(), isNull(), isNull()))
                    .thenReturn(testAccount);

            mockMvc.perform(put("/account/{accountId}", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("404 – account not found")
        void shouldReturn404_whenAccountNotFound() throws Exception {
            when(accountService.modifyAccount(
                    eq(USER_ID), eq(ACCOUNT_ID), isNull(), isNull(), isNull()))
                    .thenThrow(new InstanceNotFoundException("Account", ACCOUNT_ID));

            mockMvc.perform(put("/account/{accountId}", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code", is("project.exceptions.InstanceNotFoundException")));
        }

        @Test
        @DisplayName("400 – name exceeds max length on update")
        void shouldReturn400_whenNameTooLongOnUpdate() throws Exception {
            String longName = "A".repeat(81);
            mockMvc.perform(put("/account/{accountId}", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(accountJson(longName, null, null, null)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – currency exceeds max length on update")
        void shouldReturn400_whenCurrencyTooLongOnUpdate() throws Exception {
            mockMvc.perform(put("/account/{accountId}", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(accountJson(null, null, "EURO", null)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – AccountInvalidException (blank name from service)")
        void shouldReturn400_whenBlankNameFromService() throws Exception {
            when(accountService.modifyAccount(
                    eq(USER_ID), eq(ACCOUNT_ID), eq(VALID_NAME), isNull(), isNull()))
                    .thenThrow(new AccountInvalidException("Account name cannot be blank"));

            mockMvc.perform(put("/account/{accountId}", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(accountJson(VALID_NAME, null, null, null)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code", is("project.exceptions.AccountInvalidException")));
        }

        @Test
        @DisplayName("500 – invalid enum type on update (deserialization error)")
        void shouldReturn500_whenInvalidEnumTypeOnUpdate() throws Exception {
            // CommonControllerAdvice does not handle HttpMessageNotReadableException
            mockMvc.perform(put("/account/{accountId}", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"type\":\"BAD_VALUE\"}"))
                    .andExpect(status().isInternalServerError());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  DELETE /account/{accountId}
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("DELETE /account/{accountId}")
    class DeleteAccountEndpoint {

        @Test
        @DisplayName("204 – successful delete")
        void shouldReturn204_whenDeleteSuccessful() throws Exception {
            mockMvc.perform(delete("/account/{accountId}", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNoContent());

            verify(accountService).deleteAccount(USER_ID, ACCOUNT_ID);
        }

        @Test
        @DisplayName("404 – account not found on delete")
        void shouldReturn404_whenAccountNotFoundOnDelete() throws Exception {
            doThrow(new InstanceNotFoundException("Account", ACCOUNT_ID))
                    .when(accountService).deleteAccount(USER_ID, ACCOUNT_ID);

            mockMvc.perform(delete("/account/{accountId}", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code", is("project.exceptions.InstanceNotFoundException")));
        }

        @Test
        @DisplayName("404 – account belongs to another user (ownership failure)")
        void shouldReturn404_whenAccountBelongsToAnotherUser() throws Exception {
            doThrow(new InstanceNotFoundException("Account", ACCOUNT_ID))
                    .when(accountService).deleteAccount(USER_ID, ACCOUNT_ID);

            mockMvc.perform(delete("/account/{accountId}", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  PUT /account/{accountId}/setDefault
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("PUT /account/{accountId}/setDefault")
    class SetDefaultAccountEndpoint {

        @Test
        @DisplayName("204 – successfully sets default account")
        void shouldReturn204_whenSetDefaultSuccessful() throws Exception {
            when(accountService.setDefaultAccount(USER_ID, ACCOUNT_ID)).thenReturn(testUser);

            mockMvc.perform(put("/account/{accountId}/setDefault", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNoContent());

            verify(accountService).setDefaultAccount(USER_ID, ACCOUNT_ID);
        }

        @Test
        @DisplayName("404 – UserNotFoundException when setting default")
        void shouldReturn404_whenUserNotFoundOnSetDefault() throws Exception {
            when(accountService.setDefaultAccount(USER_ID, ACCOUNT_ID))
                    .thenThrow(new UserNotFoundException("User not found"));

            mockMvc.perform(put("/account/{accountId}/setDefault", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code", is("project.exceptions.InstanceNotFoundException")));
        }

        @Test
        @DisplayName("404 – account not found when setting default")
        void shouldReturn404_whenAccountNotFoundOnSetDefault() throws Exception {
            when(accountService.setDefaultAccount(USER_ID, ACCOUNT_ID))
                    .thenThrow(new InstanceNotFoundException("Account", ACCOUNT_ID));

            mockMvc.perform(put("/account/{accountId}/setDefault", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code", is("project.exceptions.InstanceNotFoundException")));
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  PUT /account/clearDefault
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("PUT /account/clearDefault")
    class ClearDefaultAccountEndpoint {

        @Test
        @DisplayName("204 – successfully clears default account")
        void shouldReturn204_whenClearDefaultSuccessful() throws Exception {
            when(accountService.clearDefaultAccount(USER_ID)).thenReturn(testUser);

            mockMvc.perform(put("/account/clearDefault")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNoContent());

            verify(accountService).clearDefaultAccount(USER_ID);
        }

        @Test
        @DisplayName("404 – UserNotFoundException when clearing default")
        void shouldReturn404_whenUserNotFoundOnClearDefault() throws Exception {
            when(accountService.clearDefaultAccount(USER_ID))
                    .thenThrow(new UserNotFoundException("User not found"));

            mockMvc.perform(put("/account/clearDefault")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code", is("project.exceptions.InstanceNotFoundException")));
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  GET /account
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("GET /account")
    class ListAccountsEndpoint {

        @Test
        @DisplayName("200 – returns all accounts as summary DTOs")
        void shouldReturn200_withAccountSummaries() throws Exception {
            Account a1 = new Account("A-Savings", AccountType.BANK, "EUR", BigDecimal.ZERO, testUser);
            setFieldViaReflection(a1, "id", UUID.randomUUID());
            Account a2 = new Account("B-Cash", AccountType.CASH, "USD", BigDecimal.TEN, testUser);
            setFieldViaReflection(a2, "id", UUID.randomUUID());

            when(accountService.findAllByUserId(USER_ID)).thenReturn(List.of(a1, a2));

            mockMvc.perform(get("/account")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)))
                    .andExpect(jsonPath("$[0].name", is("A-Savings")))
                    .andExpect(jsonPath("$[0].type", is("BANK")))
                    .andExpect(jsonPath("$[1].name", is("B-Cash")))
                    .andExpect(jsonPath("$[1].type", is("CASH")))
                    .andExpect(jsonPath("$[0].id").exists())
                    .andExpect(jsonPath("$[0].balance").exists())
                    .andExpect(jsonPath("$[0].currency").exists());
        }

        @Test
        @DisplayName("200 – returns empty list when no accounts")
        void shouldReturn200_whenNoAccounts() throws Exception {
            when(accountService.findAllByUserId(USER_ID)).thenReturn(List.of());

            mockMvc.perform(get("/account")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  GET /account/{accountId}
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("GET /account/{accountId}")
    class GetAccountEndpoint {

        @Test
        @DisplayName("200 – returns full account detail")
        void shouldReturn200_whenAccountFound() throws Exception {
            when(accountService.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(testAccount);

            mockMvc.perform(get("/account/{accountId}", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(ACCOUNT_ID.toString())))
                    .andExpect(jsonPath("$.name", is(VALID_NAME)))
                    .andExpect(jsonPath("$.type", is("BANK")))
                    .andExpect(jsonPath("$.currency", is("EUR")))
                    .andExpect(jsonPath("$.balance", is(1000.00)));
        }

        @Test
        @DisplayName("404 – account not found")
        void shouldReturn404_whenAccountNotFound() throws Exception {
            when(accountService.findByIdAndUserId(ACCOUNT_ID, USER_ID))
                    .thenThrow(new InstanceNotFoundException("Account", ACCOUNT_ID));

            mockMvc.perform(get("/account/{accountId}", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code", is("project.exceptions.InstanceNotFoundException")));
        }

        @Test
        @DisplayName("404 – account belongs to another user")
        void shouldReturn404_whenAccountBelongsToAnotherUser() throws Exception {
            when(accountService.findByIdAndUserId(ACCOUNT_ID, USER_ID))
                    .thenThrow(new InstanceNotFoundException("Account", ACCOUNT_ID));

            mockMvc.perform(get("/account/{accountId}", ACCOUNT_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound());
        }
    }

    /* ───── helpers ───── */

    /**
     * Builds JSON for an AccountDto. Null values are omitted from the payload.
     */
    private String accountJson(String name, String type, String currency, Boolean setDefault)
            throws Exception {
        Map<String, Object> map = new HashMap<>();
        if (name != null) map.put("name", name);
        if (type != null) map.put("type", type);
        if (currency != null) map.put("currency", currency);
        if (setDefault != null) map.put("setDefault", setDefault);
        return objectMapper.writeValueAsString(map);
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
}
