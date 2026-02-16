package Balio.web.model.Exceptions;

@SuppressWarnings("serial")
public class IncorrectLoginException extends Exception {

    private String email;

    public IncorrectLoginException(String email) {

        this.email = email;

    }

    public String getEmail() {
        return email;
    }

}