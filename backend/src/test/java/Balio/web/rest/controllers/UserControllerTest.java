package Balio.web.rest.controllers;

import Balio.web.model.Exceptions.DuplicateInstanceException;
import Balio.web.model.Exceptions.IncorrectLoginException;
import Balio.web.model.Exceptions.IncorrectPasswordException;
import Balio.web.model.entities.RefreshToken;
import Balio.web.model.entities.User;
import Balio.web.model.services.RefreshTokenService;
import Balio.web.model.services.UserService;
import Balio.web.rest.common.CommonControllerAdvice;
import Balio.web.rest.common.JwtGenerator;
import Balio.web.rest.common.LoginRateLimiter;
import Balio.web.rest.dtos.UserConverter;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import javax.management.InstanceNotFoundException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-layer unit tests for {@link UserController}.
 * <p>
 * Uses {@code MockMvcBuilders.standaloneSetup()} – no Spring context required.
 * Tests DTO validation, HTTP status codes, JSON payloads, and error handling.
 */
@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    /* ───── constants ───── */
    private static final String VALID_NICKNAME = "TestUser";
    private static final String VALID_EMAIL = "test@example.com";
    private static final String VALID_PASSWORD = "Password1";
    private static final UUID USER_ID = UUID.randomUUID();
    private static final String ACCESS_TOKEN = "access.token.here";
    private static final String REFRESH_TOKEN_VALUE = "refresh-token-value";

    /* ───── mocks ───── */
    @Mock
    private UserService userService;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private JwtGenerator jwtGenerator;

    @Mock
    private LoginRateLimiter loginRateLimiter;

    /* ───── real collaborators ───── */
    private final UserConverter userConverter = new UserConverter();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private MockMvc mockMvc;
    private User testUser;
    private RefreshToken testRefreshToken;

    @BeforeEach
    void setUp() {
        UserController controller = new UserController(
                userService, refreshTokenService,
                jwtGenerator, userConverter, loginRateLimiter);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new CommonControllerAdvice())
                .build();

        testUser = new User(VALID_NICKNAME, VALID_EMAIL, "encodedPassword");
        setUserId(testUser, USER_ID);

        testRefreshToken = new RefreshToken(
                REFRESH_TOKEN_VALUE, testUser,
                Instant.now().plus(7, ChronoUnit.DAYS));
    }

    /* ═══════════════════════════════════════════════════════════
     *  POST /user/signUp
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("POST /user/signUp")
    class SignUpEndpoint {

        @Test
        @DisplayName("201 – valid registration returns authenticated user")
        void shouldReturn201_whenSignUpWithValidData() throws Exception {
            when(userService.login(VALID_EMAIL, VALID_PASSWORD)).thenReturn(testUser);
            when(jwtGenerator.generateAccessToken(USER_ID)).thenReturn(ACCESS_TOKEN);
            when(refreshTokenService.createRefreshToken(testUser)).thenReturn(testRefreshToken);

            mockMvc.perform(post("/user/signUp")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(signUpJson(VALID_NICKNAME, VALID_EMAIL, VALID_PASSWORD)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id", is(USER_ID.toString())))
                    .andExpect(jsonPath("$.nickname", is(VALID_NICKNAME)))
                    .andExpect(jsonPath("$.email", is(VALID_EMAIL)))
                    .andExpect(jsonPath("$.accessToken", is(ACCESS_TOKEN)))
                    .andExpect(jsonPath("$.refreshToken", is(REFRESH_TOKEN_VALUE)));
        }

        @Test
        @DisplayName("409 – duplicate email")
        void shouldReturn409_whenSignUpWithDuplicateEmail() throws Exception {
            doThrow(new DuplicateInstanceException("project.entities.user", VALID_EMAIL))
                    .when(userService).signUp(VALID_NICKNAME, VALID_EMAIL, VALID_PASSWORD);

            mockMvc.perform(post("/user/signUp")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(signUpJson(VALID_NICKNAME, VALID_EMAIL, VALID_PASSWORD)))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.code", is("project.exceptions.DuplicateInstanceException")));
        }

        @Test
        @DisplayName("400 – blank nickname")
        void shouldReturn400_whenSignUpWithBlankNickname() throws Exception {
            mockMvc.perform(post("/user/signUp")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(signUpJson("", VALID_EMAIL, VALID_PASSWORD)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – invalid email format")
        void shouldReturn400_whenSignUpWithInvalidEmail() throws Exception {
            mockMvc.perform(post("/user/signUp")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(signUpJson(VALID_NICKNAME, "not-an-email", VALID_PASSWORD)))
                    .andExpect(status().isBadRequest());
        }

        @ParameterizedTest(name = "400 – weak password: \"{0}\"")
        @ValueSource(strings = {"short1A", "nouppercase1", "NOLOWERCASE1", "NoDigitsHere"})
        @DisplayName("400 – weak password (parametrized)")
        void shouldReturn400_whenSignUpWithWeakPassword(String weakPassword) throws Exception {
            mockMvc.perform(post("/user/signUp")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(signUpJson(VALID_NICKNAME, VALID_EMAIL, weakPassword)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – blank password")
        void shouldReturn400_whenSignUpWithBlankPassword() throws Exception {
            mockMvc.perform(post("/user/signUp")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(signUpJson(VALID_NICKNAME, VALID_EMAIL, "")))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – missing required fields (empty body)")
        void shouldReturn400_whenSignUpWithMissingFields() throws Exception {
            mockMvc.perform(post("/user/signUp")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – missing password only")
        void shouldReturn400_whenSignUpWithMissingPassword() throws Exception {
            String json = """
                    {"nickname": "TestUser", "email": "test@example.com"}
                    """;
            mockMvc.perform(post("/user/signUp")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – nickname exceeds max length (60)")
        void shouldReturn400_whenSignUpWithNicknameTooLong() throws Exception {
            String longNickname = "A".repeat(61);

            mockMvc.perform(post("/user/signUp")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(signUpJson(longNickname, VALID_EMAIL, VALID_PASSWORD)))
                    .andExpect(status().isBadRequest());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  POST /user/login
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("POST /user/login")
    class LoginEndpoint {

        @Test
        @DisplayName("200 – valid credentials return tokens")
        void shouldReturn200_whenLoginWithValidCredentials() throws Exception {
            when(loginRateLimiter.isBlocked(VALID_EMAIL)).thenReturn(false);
            when(userService.login(VALID_EMAIL, VALID_PASSWORD)).thenReturn(testUser);
            when(jwtGenerator.generateAccessToken(USER_ID)).thenReturn(ACCESS_TOKEN);
            when(refreshTokenService.createRefreshToken(testUser)).thenReturn(testRefreshToken);

            mockMvc.perform(post("/user/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(loginJson(VALID_EMAIL, VALID_PASSWORD)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(USER_ID.toString())))
                    .andExpect(jsonPath("$.accessToken", is(ACCESS_TOKEN)))
                    .andExpect(jsonPath("$.refreshToken", is(REFRESH_TOKEN_VALUE)));

            verify(loginRateLimiter).registerSuccessfulLogin(VALID_EMAIL);
        }

        @Test
        @DisplayName("401 – incorrect credentials (and rate limiter notified)")
        void shouldReturn401_whenLoginWithIncorrectCredentials() throws Exception {
            when(loginRateLimiter.isBlocked(VALID_EMAIL)).thenReturn(false);
            when(userService.login(VALID_EMAIL, "wrongPassword"))
                    .thenThrow(new IncorrectLoginException(VALID_EMAIL));

            mockMvc.perform(post("/user/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(loginJson(VALID_EMAIL, "wrongPassword")))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code", is("project.exceptions.IncorrectLoginException")));

            verify(loginRateLimiter).registerFailedAttempt(VALID_EMAIL);
        }

        @Test
        @DisplayName("401 – blocked by rate limiter")
        void shouldReturn401_whenLoginBlockedByRateLimiter() throws Exception {
            when(loginRateLimiter.isBlocked(VALID_EMAIL)).thenReturn(true);
            when(loginRateLimiter.getRemainingBlockSeconds(VALID_EMAIL)).thenReturn(120L);

            mockMvc.perform(post("/user/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(loginJson(VALID_EMAIL, VALID_PASSWORD)))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("400 – blank email")
        void shouldReturn400_whenLoginWithBlankEmail() throws Exception {
            mockMvc.perform(post("/user/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(loginJson("", VALID_PASSWORD)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – blank password")
        void shouldReturn400_whenLoginWithBlankPassword() throws Exception {
            mockMvc.perform(post("/user/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(loginJson(VALID_EMAIL, "")))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – invalid email format")
        void shouldReturn400_whenLoginWithInvalidEmail() throws Exception {
            mockMvc.perform(post("/user/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(loginJson("not-an-email", VALID_PASSWORD)))
                    .andExpect(status().isBadRequest());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  POST /user/refreshToken
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("POST /user/refreshToken")
    class RefreshTokenEndpoint {

        @Test
        @DisplayName("200 – valid refresh returns rotated tokens")
        void shouldReturn200_whenRefreshTokenValid() throws Exception {
            RefreshToken rotated = new RefreshToken(
                    "new-refresh-token", testUser,
                    Instant.now().plus(7, ChronoUnit.DAYS));

            when(refreshTokenService.rotateRefreshToken(REFRESH_TOKEN_VALUE)).thenReturn(rotated);
            when(jwtGenerator.generateAccessToken(USER_ID)).thenReturn(ACCESS_TOKEN);

            mockMvc.perform(post("/user/refreshToken")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"refreshToken": "%s"}
                                    """.formatted(REFRESH_TOKEN_VALUE)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.accessToken", is(ACCESS_TOKEN)))
                    .andExpect(jsonPath("$.refreshToken", is("new-refresh-token")));
        }

        @Test
        @DisplayName("400 – blank refresh token")
        void shouldReturn400_whenRefreshTokenBlank() throws Exception {
            mockMvc.perform(post("/user/refreshToken")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"refreshToken": ""}
                                    """))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – invalid / expired refresh token")
        void shouldReturn400_whenRefreshTokenInvalid() throws Exception {
            when(refreshTokenService.rotateRefreshToken("invalid-token"))
                    .thenThrow(new IllegalArgumentException("Invalid refresh token"));

            mockMvc.perform(post("/user/refreshToken")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"refreshToken": "invalid-token"}
                                    """))
                    .andExpect(status().isBadRequest());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  POST /user/logout
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("POST /user/logout")
    class LogoutEndpoint {

        @Test
        @DisplayName("204 – successful logout revokes tokens")
        void shouldReturn204_whenLogout() throws Exception {
            mockMvc.perform(post("/user/logout")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNoContent());

            verify(refreshTokenService).revokeAllUserTokens(USER_ID);
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  PUT /user/{id}
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("PUT /user/{id}")
    class UpdateProfileEndpoint {

        @Test
        @DisplayName("200 – valid update returns updated user")
        void shouldReturn200_whenUpdateProfileWithValidData() throws Exception {
            String newNickname = "UpdatedNick";
            String newEmail = "updated@example.com";

            User updatedUser = new User(newNickname, newEmail, "encodedPassword");
            setUserId(updatedUser, USER_ID);

            when(userService.updateProfile(USER_ID, newNickname, newEmail)).thenReturn(updatedUser);

            mockMvc.perform(put("/user/{id}", USER_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(profileJson(newNickname, newEmail)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(USER_ID.toString())))
                    .andExpect(jsonPath("$.nickname", is(newNickname)))
                    .andExpect(jsonPath("$.email", is(newEmail)));
        }

        @Test
        @DisplayName("403 – cannot update another user's profile")
        void shouldReturn403_whenUpdateProfileOfAnotherUser() throws Exception {
            UUID otherUserId = UUID.randomUUID();

            mockMvc.perform(put("/user/{id}", otherUserId)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(profileJson(VALID_NICKNAME, VALID_EMAIL)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code", is("project.exceptions.PermissionException")));
        }

        @Test
        @DisplayName("400 – blank nickname")
        void shouldReturn400_whenUpdateProfileWithBlankNickname() throws Exception {
            mockMvc.perform(put("/user/{id}", USER_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(profileJson("", VALID_EMAIL)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – invalid email format")
        void shouldReturn400_whenUpdateProfileWithInvalidEmail() throws Exception {
            mockMvc.perform(put("/user/{id}", USER_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(profileJson(VALID_NICKNAME, "invalid-email")))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("409 – duplicate email on update")
        void shouldReturn409_whenUpdateProfileWithDuplicateEmail() throws Exception {
            String takenEmail = "taken@example.com";

            when(userService.updateProfile(USER_ID, VALID_NICKNAME, takenEmail))
                    .thenThrow(new DuplicateInstanceException("User", takenEmail));

            mockMvc.perform(put("/user/{id}", USER_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(profileJson(VALID_NICKNAME, takenEmail)))
                    .andExpect(status().isConflict());
        }

        @Test
        @DisplayName("404 – user not found on update")
        void shouldReturn404_whenUpdateProfileUserNotFound() throws Exception {
            when(userService.updateProfile(eq(USER_ID), anyString(), anyString()))
                    .thenThrow(new InstanceNotFoundException());

            mockMvc.perform(put("/user/{id}", USER_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(profileJson(VALID_NICKNAME, VALID_EMAIL)))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("400 – nickname exceeds max length")
        void shouldReturn400_whenUpdateProfileWithNicknameTooLong() throws Exception {
            String longNickname = "A".repeat(61);

            mockMvc.perform(put("/user/{id}", USER_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(profileJson(longNickname, VALID_EMAIL)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – missing required fields")
        void shouldReturn400_whenUpdateProfileWithMissingFields() throws Exception {
            mockMvc.perform(put("/user/{id}", USER_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  POST /user/{id}/changePassword
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("POST /user/{id}/changePassword")
    class ChangePasswordEndpoint {

        @Test
        @DisplayName("204 – successful password change revokes tokens")
        void shouldReturn204_whenChangePasswordWithValidData() throws Exception {
            mockMvc.perform(post("/user/{id}/changePassword", USER_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(changePasswordJson(VALID_PASSWORD, "NewPassword1")))
                    .andExpect(status().isNoContent());

            verify(userService).changePassword(USER_ID, VALID_PASSWORD, "NewPassword1");
            verify(refreshTokenService).revokeAllUserTokens(USER_ID);
        }

        @Test
        @DisplayName("403 – cannot change another user's password")
        void shouldReturn403_whenChangePasswordOfAnotherUser() throws Exception {
            UUID otherUserId = UUID.randomUUID();

            mockMvc.perform(post("/user/{id}/changePassword", otherUserId)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(changePasswordJson(VALID_PASSWORD, "NewPassword1")))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("401 – incorrect old password")
        void shouldReturn401_whenChangePasswordWithIncorrectOldPassword() throws Exception {
            doThrow(new IncorrectPasswordException())
                    .when(userService).changePassword(USER_ID, "wrongOld", "NewPassword1");

            mockMvc.perform(post("/user/{id}/changePassword", USER_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(changePasswordJson("wrongOld", "NewPassword1")))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code", is("project.exceptions.IncorrectPasswordException")));
        }

        @Test
        @DisplayName("401 – new password equals old password")
        void shouldReturn401_whenNewPasswordEqualsOldPassword() throws Exception {
            doThrow(new IncorrectPasswordException())
                    .when(userService).changePassword(USER_ID, VALID_PASSWORD, VALID_PASSWORD);

            mockMvc.perform(post("/user/{id}/changePassword", USER_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(changePasswordJson(VALID_PASSWORD, VALID_PASSWORD)))
                    .andExpect(status().isUnauthorized());
        }

        @ParameterizedTest(name = "400 – weak new password: \"{0}\"")
        @ValueSource(strings = {"short1A", "nouppercase1", "NOLOWERCASE1", "NoDigitsHere"})
        @DisplayName("400 – weak new password (parametrized)")
        void shouldReturn400_whenChangePasswordWithWeakNewPassword(String weakPassword) throws Exception {
            mockMvc.perform(post("/user/{id}/changePassword", USER_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(changePasswordJson(VALID_PASSWORD, weakPassword)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – blank old password")
        void shouldReturn400_whenChangePasswordWithBlankOldPassword() throws Exception {
            mockMvc.perform(post("/user/{id}/changePassword", USER_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(changePasswordJson("", "NewPassword1")))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – blank new password")
        void shouldReturn400_whenChangePasswordWithBlankNewPassword() throws Exception {
            mockMvc.perform(post("/user/{id}/changePassword", USER_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(changePasswordJson(VALID_PASSWORD, "")))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("404 – user not found on change password")
        void shouldReturn404_whenChangePasswordUserNotFound() throws Exception {
            doThrow(new InstanceNotFoundException())
                    .when(userService).changePassword(eq(USER_ID), anyString(), anyString());

            mockMvc.perform(post("/user/{id}/changePassword", USER_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(changePasswordJson(VALID_PASSWORD, "NewPassword1")))
                    .andExpect(status().isNotFound());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  Helper methods
     * ═══════════════════════════════════════════════════════════ */

    private static void setUserId(User user, UUID id) {
        try {
            var field = User.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(user, id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to set User.id via reflection", e);
        }
    }

    private String signUpJson(String nickname, String email, String password) throws Exception {
        Map<String, String> map = new HashMap<>();
        map.put("nickname", nickname);
        map.put("email", email);
        map.put("password", password);
        return objectMapper.writeValueAsString(map);
    }

    private String loginJson(String email, String password) throws Exception {
        Map<String, String> map = new HashMap<>();
        map.put("email", email);
        map.put("password", password);
        return objectMapper.writeValueAsString(map);
    }

    private String profileJson(String nickname, String email) throws Exception {
        Map<String, String> map = new HashMap<>();
        map.put("nickname", nickname);
        map.put("email", email);
        return objectMapper.writeValueAsString(map);
    }

    private String changePasswordJson(String oldPassword, String newPassword) throws Exception {
        Map<String, String> map = new HashMap<>();
        map.put("oldPassword", oldPassword);
        map.put("newPassword", newPassword);
        return objectMapper.writeValueAsString(map);
    }
}
