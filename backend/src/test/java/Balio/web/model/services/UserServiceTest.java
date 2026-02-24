package Balio.web.model.services;

import Balio.web.model.Exceptions.DuplicateInstanceException;
import Balio.web.model.Exceptions.IncorrectLoginException;
import Balio.web.model.Exceptions.IncorrectPasswordException;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import javax.management.InstanceNotFoundException;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link UserServiceImpl}.
 * <p>
 * Uses Mockito (no Spring context) to test business rules, exceptions,
 * and decisions in isolation.
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    /* ───── shared constants ───── */
    private static final String VALID_NICKNAME = "TestUser";
    private static final String VALID_EMAIL = "test@example.com";
    private static final String VALID_PASSWORD = "Password1";
    private static final String ENCODED_PASSWORD = "$2a$10$encodedPasswordHash";
    private static final UUID USER_ID = UUID.randomUUID();

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private UserDao userDao;

    @InjectMocks
    private UserServiceImpl userService;

    private User existingUser;

    @BeforeEach
    void setUp() {
        existingUser = new User(VALID_NICKNAME, VALID_EMAIL, ENCODED_PASSWORD);
        setUserId(existingUser, USER_ID);
    }

    /* ═══════════════════════════════════════════════════════════
     *  signUp
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("signUp")
    class SignUpTests {

        @Test
        @DisplayName("should create user when credentials are valid")
        void shouldSignUp_whenValidCredentials() throws DuplicateInstanceException {
            // Arrange
            when(userDao.existsByEmail(VALID_EMAIL)).thenReturn(false);
            when(passwordEncoder.encode(VALID_PASSWORD)).thenReturn(ENCODED_PASSWORD);

            // Act
            userService.signUp(VALID_NICKNAME, VALID_EMAIL, VALID_PASSWORD);

            // Assert – verify saved user has correct fields and hashed password
            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userDao).save(captor.capture());

            User saved = captor.getValue();
            assertEquals(VALID_NICKNAME, saved.getNickname());
            assertEquals(VALID_EMAIL, saved.getEmail());
            assertEquals(ENCODED_PASSWORD, saved.getPassword());
        }

        @Test
        @DisplayName("should throw DuplicateInstanceException when email already exists")
        void shouldThrowDuplicateInstanceException_whenEmailAlreadyExists() {
            when(userDao.existsByEmail(VALID_EMAIL)).thenReturn(true);

            assertThrows(DuplicateInstanceException.class,
                    () -> userService.signUp(VALID_NICKNAME, VALID_EMAIL, VALID_PASSWORD));

            verify(userDao, never()).save(any());
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  login
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("login")
    class LoginTests {

        @Test
        @DisplayName("should return user when credentials are correct")
        void shouldLogin_whenValidCredentials() throws IncorrectLoginException {
            when(userDao.findByEmail(VALID_EMAIL)).thenReturn(Optional.of(existingUser));
            when(passwordEncoder.matches(VALID_PASSWORD, ENCODED_PASSWORD)).thenReturn(true);

            User result = userService.login(VALID_EMAIL, VALID_PASSWORD);

            assertNotNull(result);
            assertEquals(VALID_EMAIL, result.getEmail());
            assertEquals(VALID_NICKNAME, result.getNickname());
        }

        @Test
        @DisplayName("should throw IncorrectLoginException when email does not exist")
        void shouldThrowIncorrectLoginException_whenEmailNotFound() {
            when(userDao.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

            assertThrows(IncorrectLoginException.class,
                    () -> userService.login("unknown@example.com", VALID_PASSWORD));
        }

        @Test
        @DisplayName("should throw IncorrectLoginException when password is wrong")
        void shouldThrowIncorrectLoginException_whenPasswordIncorrect() {
            when(userDao.findByEmail(VALID_EMAIL)).thenReturn(Optional.of(existingUser));
            when(passwordEncoder.matches("wrongPassword", ENCODED_PASSWORD)).thenReturn(false);

            assertThrows(IncorrectLoginException.class,
                    () -> userService.login(VALID_EMAIL, "wrongPassword"));
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  getUserById
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("getUserById")
    class GetUserByIdTests {

        @Test
        @DisplayName("should return user when id exists")
        void shouldReturnUser_whenIdExists() throws InstanceNotFoundException {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(existingUser));

            User result = userService.getUserById(USER_ID);

            assertNotNull(result);
            assertEquals(USER_ID, result.getId());
            assertEquals(VALID_EMAIL, result.getEmail());
        }

        @Test
        @DisplayName("should throw InstanceNotFoundException when id does not exist")
        void shouldThrowInstanceNotFoundException_whenIdNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(userDao.findById(unknownId)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> userService.getUserById(unknownId));
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  updateProfile
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("updateProfile")
    class UpdateProfileTests {

        @Test
        @DisplayName("should update nickname and email when data is valid")
        void shouldUpdateProfile_whenValidData() throws InstanceNotFoundException,
                                                        DuplicateInstanceException {
            String newNickname = "NewNick";
            String newEmail = "new@example.com";

            when(userDao.findById(USER_ID)).thenReturn(Optional.of(existingUser));
            when(userDao.existsByEmail(newEmail)).thenReturn(false);

            User result = userService.updateProfile(USER_ID, newNickname, newEmail);

            assertEquals(newNickname, result.getNickname());
            assertEquals(newEmail, result.getEmail());
        }

        @Test
        @DisplayName("should not check duplicate email when email is unchanged")
        void shouldUpdateProfile_whenKeepingSameEmail() throws InstanceNotFoundException,
                                                               DuplicateInstanceException {
            String newNickname = "NewNick";

            when(userDao.findById(USER_ID)).thenReturn(Optional.of(existingUser));

            User result = userService.updateProfile(USER_ID, newNickname, VALID_EMAIL);

            assertEquals(newNickname, result.getNickname());
            assertEquals(VALID_EMAIL, result.getEmail());
            verify(userDao, never()).existsByEmail(anyString());
        }

        @Test
        @DisplayName("should throw InstanceNotFoundException when user does not exist")
        void shouldThrowInstanceNotFoundException_whenUserNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(userDao.findById(unknownId)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> userService.updateProfile(unknownId, "Nick", "e@e.com"));
        }

        @Test
        @DisplayName("should throw DuplicateInstanceException when new email is already taken")
        void shouldThrowDuplicateInstanceException_whenEmailAlreadyTaken() {
            String takenEmail = "taken@example.com";

            when(userDao.findById(USER_ID)).thenReturn(Optional.of(existingUser));
            when(userDao.existsByEmail(takenEmail)).thenReturn(true);

            assertThrows(DuplicateInstanceException.class,
                    () -> userService.updateProfile(USER_ID, VALID_NICKNAME, takenEmail));
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  changePassword
     * ═══════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("changePassword")
    class ChangePasswordTests {

        @Test
        @DisplayName("should change password when old password is correct and new is different")
        void shouldChangePassword_whenValidPasswords() throws InstanceNotFoundException,
                                                              IncorrectPasswordException {
            String newPassword = "NewPassword1";
            String newEncodedHash = "$2a$10$newEncodedHash";

            when(userDao.findById(USER_ID)).thenReturn(Optional.of(existingUser));
            when(passwordEncoder.matches(VALID_PASSWORD, ENCODED_PASSWORD)).thenReturn(true);
            when(passwordEncoder.matches(newPassword, ENCODED_PASSWORD)).thenReturn(false);
            when(passwordEncoder.encode(newPassword)).thenReturn(newEncodedHash);

            userService.changePassword(USER_ID, VALID_PASSWORD, newPassword);

            assertEquals(newEncodedHash, existingUser.getPassword());
        }

        @Test
        @DisplayName("should throw InstanceNotFoundException when user does not exist")
        void shouldThrowInstanceNotFoundException_whenUserNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(userDao.findById(unknownId)).thenReturn(Optional.empty());

            assertThrows(InstanceNotFoundException.class,
                    () -> userService.changePassword(unknownId, "old", "new"));
        }

        @Test
        @DisplayName("should throw IncorrectPasswordException when old password is wrong")
        void shouldThrowIncorrectPasswordException_whenOldPasswordWrong() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(existingUser));
            when(passwordEncoder.matches("wrongOld", ENCODED_PASSWORD)).thenReturn(false);

            assertThrows(IncorrectPasswordException.class,
                    () -> userService.changePassword(USER_ID, "wrongOld", "NewPassword1"));
        }

        @Test
        @DisplayName("should throw IncorrectPasswordException when new password equals old password")
        void shouldThrowIncorrectPasswordException_whenNewPasswordEqualsOld() {
            when(userDao.findById(USER_ID)).thenReturn(Optional.of(existingUser));
            // Both calls to matches() use same arguments → both return true
            when(passwordEncoder.matches(VALID_PASSWORD, ENCODED_PASSWORD)).thenReturn(true);

            assertThrows(IncorrectPasswordException.class,
                    () -> userService.changePassword(USER_ID, VALID_PASSWORD, VALID_PASSWORD));
        }
    }

    /* ───── helper ───── */

    private static void setUserId(User user, UUID id) {
        try {
            var field = User.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(user, id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to set User.id via reflection", e);
        }
    }
}
