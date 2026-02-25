package Balio.web.model.Exceptions;

@SuppressWarnings("serial")
public class GoalInvalidException extends RuntimeException {

    public GoalInvalidException(String message) {
        super(message);
    }
}
