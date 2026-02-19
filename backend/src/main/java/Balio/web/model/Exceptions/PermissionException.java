package Balio.web.model.Exceptions;

@SuppressWarnings("serial")
public class PermissionException extends Exception {

    public PermissionException() {
        super("Permission denied");
    }
}
