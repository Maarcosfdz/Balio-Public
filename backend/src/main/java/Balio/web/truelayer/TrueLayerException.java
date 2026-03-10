package Balio.web.truelayer;

/**
 * Runtime exception for TrueLayer API errors.
 */
public class TrueLayerException extends RuntimeException {

    public TrueLayerException(String message) {
        super(message);
    }

    public TrueLayerException(String message, Throwable cause) {
        super(message, cause);
    }
}
