package Balio.web.enablebanking;

/**
 * Runtime exception for Enable Banking API errors.
 */
public class EnableBankingException extends RuntimeException {

    public EnableBankingException(String message) {
        super(message);
    }

    public EnableBankingException(String message, Throwable cause) {
        super(message, cause);
    }
}
