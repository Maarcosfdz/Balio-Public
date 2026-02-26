package Balio.web.rest.common;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("LoginRateLimiter unit tests")
class LoginRateLimiterTest {

    private LoginRateLimiter limiter;

    @BeforeEach
    void setUp() {
        limiter = new LoginRateLimiter();
    }

    // ─── isBlocked ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("isBlocked: returns false for unknown email")
    void isBlocked_unknownEmail_returnsFalse() {
        assertThat(limiter.isBlocked("unknown@test.com")).isFalse();
    }

    @Test
    @DisplayName("isBlocked: returns false after fewer than 5 failed attempts")
    void isBlocked_belowThreshold_returnsFalse() {
        for (int i = 0; i < 4; i++) {
            limiter.registerFailedAttempt("user@test.com");
        }
        assertThat(limiter.isBlocked("user@test.com")).isFalse();
    }

    @Test
    @DisplayName("isBlocked: returns true after exactly 5 failed attempts")
    void isBlocked_afterFiveFailures_returnsTrue() {
        for (int i = 0; i < 5; i++) {
            limiter.registerFailedAttempt("user@test.com");
        }
        assertThat(limiter.isBlocked("user@test.com")).isTrue();
    }

    @Test
    @DisplayName("isBlocked: returns false after successful login clears the record")
    void isBlocked_afterSuccessfulLogin_returnsFalse() {
        for (int i = 0; i < 5; i++) {
            limiter.registerFailedAttempt("user@test.com");
        }
        limiter.registerSuccessfulLogin("user@test.com");
        assertThat(limiter.isBlocked("user@test.com")).isFalse();
    }

    @Test
    @DisplayName("isBlocked: treats email as case-insensitive")
    void isBlocked_emailNormalization_caseInsensitive() {
        for (int i = 0; i < 5; i++) {
            limiter.registerFailedAttempt("User@Test.COM");
        }
        assertThat(limiter.isBlocked("user@test.com")).isTrue();
    }

    @Test
    @DisplayName("isBlocked: trims whitespace from email")
    void isBlocked_emailNormalization_trimmed() {
        for (int i = 0; i < 5; i++) {
            limiter.registerFailedAttempt("  user@test.com  ");
        }
        assertThat(limiter.isBlocked("user@test.com")).isTrue();
    }

    // ─── getRemainingBlockSeconds ──────────────────────────────────────────────

    @Test
    @DisplayName("getRemainingBlockSeconds: returns 0 for unknown email")
    void getRemainingBlockSeconds_unknownEmail_returnsZero() {
        assertThat(limiter.getRemainingBlockSeconds("unknown@test.com")).isZero();
    }

    @Test
    @DisplayName("getRemainingBlockSeconds: returns 0 when not yet blocked")
    void getRemainingBlockSeconds_belowThreshold_returnsZero() {
        limiter.registerFailedAttempt("user@test.com");
        assertThat(limiter.getRemainingBlockSeconds("user@test.com")).isZero();
    }

    @Test
    @DisplayName("getRemainingBlockSeconds: returns positive value when blocked")
    void getRemainingBlockSeconds_whenBlocked_returnsPositive() {
        for (int i = 0; i < 5; i++) {
            limiter.registerFailedAttempt("user@test.com");
        }
        assertThat(limiter.getRemainingBlockSeconds("user@test.com")).isPositive();
    }

    @Test
    @DisplayName("getRemainingBlockSeconds: returns 0 after successful login")
    void getRemainingBlockSeconds_afterSuccessfulLogin_returnsZero() {
        for (int i = 0; i < 5; i++) {
            limiter.registerFailedAttempt("user@test.com");
        }
        limiter.registerSuccessfulLogin("user@test.com");
        assertThat(limiter.getRemainingBlockSeconds("user@test.com")).isZero();
    }

    // ─── registerSuccessfulLogin ───────────────────────────────────────────────

    @Test
    @DisplayName("registerSuccessfulLogin: no-op for unknown email")
    void registerSuccessfulLogin_unknownEmail_noOp() {
        limiter.registerSuccessfulLogin("clean@test.com");
        assertThat(limiter.isBlocked("clean@test.com")).isFalse();
    }

    @Test
    @DisplayName("registerSuccessfulLogin: resets counter so 5 new failures block again")
    void registerSuccessfulLogin_resetAllowsNewBlock() {
        for (int i = 0; i < 5; i++) {
            limiter.registerFailedAttempt("user@test.com");
        }
        limiter.registerSuccessfulLogin("user@test.com");

        for (int i = 0; i < 5; i++) {
            limiter.registerFailedAttempt("user@test.com");
        }
        assertThat(limiter.isBlocked("user@test.com")).isTrue();
    }

    // ─── Email isolation ───────────────────────────────────────────────────────

    @Test
    @DisplayName("Blocking one email does not affect another")
    void blockingOneEmail_doesNotBlockAnother() {
        for (int i = 0; i < 5; i++) {
            limiter.registerFailedAttempt("blocked@test.com");
        }
        assertThat(limiter.isBlocked("blocked@test.com")).isTrue();
        assertThat(limiter.isBlocked("clean@test.com")).isFalse();
    }
}
