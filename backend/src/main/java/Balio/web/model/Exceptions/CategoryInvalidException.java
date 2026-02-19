package Balio.web.model.Exceptions;

public class CategoryInvalidException extends RuntimeException {

    public CategoryInvalidException() {
        super("Invalid category operation");
    }

    public CategoryInvalidException(String message) {
        super(message);
    }

}
