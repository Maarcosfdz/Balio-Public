package Balio.web.model.Exceptions;

public class AccountInvalidException extends RuntimeException {

    public AccountInvalidException() {
        super("Invalid account operation");
    }

    public AccountInvalidException(String message) {
        super(message);
    }
}
