package Balio.web.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("StringUtils")
class StringUtilsTest {

    @Nested
    @DisplayName("sanitizeOptional")
    class SanitizeOptional {

        @Test
        @DisplayName("returns null for null input")
        void nullInput() {
            assertThat(StringUtils.sanitizeOptional(null)).isNull();
        }

        @Test
        @DisplayName("returns null for blank input")
        void blankInput() {
            assertThat(StringUtils.sanitizeOptional("   ")).isNull();
        }

        @Test
        @DisplayName("trims and returns non-blank value")
        void trimsValue() {
            assertThat(StringUtils.sanitizeOptional("  hello  ")).isEqualTo("hello");
        }
    }

    @Nested
    @DisplayName("sanitizeLog")
    class SanitizeLog {

        @Test
        @DisplayName("returns null for null input")
        void nullInput() {
            assertThat(StringUtils.sanitizeLog(null)).isNull();
        }

        @Test
        @DisplayName("replaces CR, LF and TAB with underscore")
        void stripsControlChars() {
            assertThat(StringUtils.sanitizeLog("line1\nline2")).isEqualTo("line1_line2");
            assertThat(StringUtils.sanitizeLog("line1\rline2")).isEqualTo("line1_line2");
            assertThat(StringUtils.sanitizeLog("col1\tcol2")).isEqualTo("col1_col2");
        }

        @Test
        @DisplayName("leaves normal strings unchanged")
        void normalString() {
            assertThat(StringUtils.sanitizeLog("user@example.com")).isEqualTo("user@example.com");
        }

        @Test
        @DisplayName("replaces CRLF sequence")
        void crlf() {
            assertThat(StringUtils.sanitizeLog("a\r\nb")).isEqualTo("a__b");
        }
    }
}
