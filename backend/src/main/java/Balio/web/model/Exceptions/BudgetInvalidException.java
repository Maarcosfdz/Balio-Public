package Balio.web.model.Exceptions;

@SuppressWarnings("serial")
public class BudgetInvalidException extends RuntimeException {

    public BudgetInvalidException(String message) {
        super(message);
    }
}
