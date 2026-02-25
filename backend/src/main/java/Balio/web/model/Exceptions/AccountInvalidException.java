package Balio.web.model.Exceptions;

public class AccountInvalidException extends RuntimeException {

    public AccountInvalidException(String message) {
        super(message);
    }
}
