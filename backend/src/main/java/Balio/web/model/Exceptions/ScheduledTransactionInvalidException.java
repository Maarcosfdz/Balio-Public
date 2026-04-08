package Balio.web.model.Exceptions;

@SuppressWarnings("serial")
public class ScheduledTransactionInvalidException extends RuntimeException {

    public ScheduledTransactionInvalidException(String message) {
        super(message);
    }
}
