package Balio.web.util;

public final class StringUtils {

    private StringUtils() {}

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
