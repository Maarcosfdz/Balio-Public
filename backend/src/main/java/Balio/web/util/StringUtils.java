package Balio.web.util;

public final class StringUtils {

    private StringUtils() {}

    /**
     * Strips CR, LF and TAB from a value before writing it to a log line,
     * preventing log injection (SonarQube S5145).
     */
    public static String sanitizeLog(String value) {
        if (value == null) {
            return null;
        }
        return value.replaceAll("[\r\n\t]", "_");
    }

    /**
     * Trims the value and returns {@code null} if it is null or blank.
     */
    public static String sanitizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
