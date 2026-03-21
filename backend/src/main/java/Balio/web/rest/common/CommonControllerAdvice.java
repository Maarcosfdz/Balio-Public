package Balio.web.rest.common;

import Balio.web.model.Exceptions.AccountInvalidException;
import Balio.web.model.Exceptions.BudgetInvalidException;
import Balio.web.model.Exceptions.CategoryInvalidException;
import Balio.web.model.Exceptions.DuplicateInstanceException;
import Balio.web.model.Exceptions.FilterInvalidException;
import Balio.web.model.Exceptions.GoalInvalidException;
import Balio.web.model.Exceptions.IncorrectLoginException;
import Balio.web.model.Exceptions.IncorrectPasswordException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.Exceptions.PermissionException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.enablebanking.EnableBankingException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@ControllerAdvice
public class CommonControllerAdvice {

    private static final Logger log = LoggerFactory.getLogger(CommonControllerAdvice.class);

    private static final String INSTANCE_NOT_FOUND_EXCEPTION_CODE = "project.exceptions.InstanceNotFoundException";
    private static final String DUPLICATE_INSTANCE_EXCEPTION_CODE = "project.exceptions.DuplicateInstanceException";
    private static final String INCORRECT_LOGIN_EXCEPTION_CODE = "project.exceptions.IncorrectLoginException";
    private static final String INCORRECT_PASSWORD_EXCEPTION_CODE = "project.exceptions.IncorrectPasswordException";
    private static final String PERMISSION_EXCEPTION_CODE = "project.exceptions.PermissionException";

    // --- Balio InstanceNotFoundException (AccountService, CategoryService) ---

    @ExceptionHandler(InstanceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    @ResponseBody
    public Map<String, Object> handleInstanceNotFoundException(InstanceNotFoundException exception) {
        return Map.of(
            "code", INSTANCE_NOT_FOUND_EXCEPTION_CODE,
            "name", exception.getName() != null ? exception.getName() : "",
            "key", exception.getKey() != null ? exception.getKey().toString() : ""
        );
    }

    // --- javax.management.InstanceNotFoundException (UserService, TransactionService) ---

    @ExceptionHandler(javax.management.InstanceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    @ResponseBody
    public Map<String, String> handleJavaxInstanceNotFoundException(
            javax.management.InstanceNotFoundException exception) {
        return Map.of(
            "code", INSTANCE_NOT_FOUND_EXCEPTION_CODE,
            "message", exception.getMessage() != null ? exception.getMessage() : "Entity not found"
        );
    }

    // --- DuplicateInstanceException ---

    @ExceptionHandler(DuplicateInstanceException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    @ResponseBody
    public Map<String, Object> handleDuplicateInstanceException(DuplicateInstanceException exception) {
        return Map.of(
            "code", DUPLICATE_INSTANCE_EXCEPTION_CODE,
            "name", exception.getName() != null ? exception.getName() : "",
            "key", exception.getKey() != null ? exception.getKey().toString() : ""
        );
    }

    // --- IncorrectLoginException ---

    @ExceptionHandler(IncorrectLoginException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    @ResponseBody
    public Map<String, String> handleIncorrectLoginException(IncorrectLoginException exception) {
        return Map.of("code", INCORRECT_LOGIN_EXCEPTION_CODE, "message", "Incorrect login credentials");
    }

    // --- IncorrectPasswordException ---

    @ExceptionHandler(IncorrectPasswordException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    @ResponseBody
    public Map<String, String> handleIncorrectPasswordException(IncorrectPasswordException exception) {
        return Map.of("code", INCORRECT_PASSWORD_EXCEPTION_CODE, "message", "Incorrect password");
    }

    // --- PermissionException ---

    @ExceptionHandler(PermissionException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    @ResponseBody
    public Map<String, String> handlePermissionException(PermissionException exception) {
        return Map.of("code", PERMISSION_EXCEPTION_CODE, "message", "Permission denied");
    }

    // --- UserNotFoundException (runtime) ---

    @ExceptionHandler(UserNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    @ResponseBody
    public Map<String, String> handleUserNotFoundException(UserNotFoundException exception) {
        return Map.of("code", INSTANCE_NOT_FOUND_EXCEPTION_CODE, "message", exception.getMessage());
    }

    // --- AccountInvalidException (runtime) ---

    @ExceptionHandler(AccountInvalidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ResponseBody
    public Map<String, String> handleAccountInvalidException(AccountInvalidException exception) {
        return Map.of("code", "project.exceptions.AccountInvalidException", "message", exception.getMessage());
    }

    // --- CategoryInvalidException (runtime) ---

    @ExceptionHandler(CategoryInvalidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ResponseBody
    public Map<String, String> handleCategoryInvalidException(CategoryInvalidException exception) {
        return Map.of("code", "project.exceptions.CategoryInvalidException", "message", exception.getMessage());
    }

    // --- GoalInvalidException (runtime) ---

    @ExceptionHandler(GoalInvalidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ResponseBody
    public Map<String, String> handleGoalInvalidException(GoalInvalidException exception) {
        return Map.of("code", "project.exceptions.GoalInvalidException", "message", exception.getMessage());
    }

    // --- BudgetInvalidException (runtime) ---

    @ExceptionHandler(BudgetInvalidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ResponseBody
    public Map<String, String> handleBudgetInvalidException(BudgetInvalidException exception) {
        return Map.of("code", "project.exceptions.BudgetInvalidException", "message", exception.getMessage());
    }

    // --- FilterInvalidException (runtime) ---

    @ExceptionHandler(FilterInvalidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ResponseBody
    public Map<String, String> handleFilterInvalidException(FilterInvalidException exception) {
        return Map.of("code", "project.exceptions.FilterInvalidException", "message", exception.getMessage());
    }

    // --- Validation errors ---

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ResponseBody
    public Map<String, Object> handleValidationExceptions(MethodArgumentNotValidException exception) {
        List<Map<String, String>> fieldErrors = exception.getBindingResult().getFieldErrors().stream()
            .map(fe -> Map.of("field", fe.getField(), "message",
                    fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "Invalid value"))
            .collect(Collectors.toList());
        return Map.of("code", "project.exceptions.ValidationException", "fieldErrors", fieldErrors);
    }

    // --- IllegalArgumentException (e.g. invalid refresh token) ---

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ResponseBody
    public Map<String, String> handleIllegalArgumentException(IllegalArgumentException exception) {
        return Map.of("code", "project.exceptions.IllegalArgumentException",
                       "message", exception.getMessage() != null ? exception.getMessage() : "Invalid request");
    }

    // --- EnableBankingException (bank API errors) ---

    @ExceptionHandler(EnableBankingException.class)
    @ResponseStatus(HttpStatus.BAD_GATEWAY)
    @ResponseBody
    public Map<String, String> handleEnableBankingException(EnableBankingException exception) {
        log.error("Enable Banking API error", exception);
        return Map.of("code", "project.exceptions.BankApiException",
                       "message", exception.getMessage() != null ? exception.getMessage() : "Enable Banking error");
    }

    // --- Generic exception handler (catch-all, never expose internals) ---

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    @ResponseBody
    public Map<String, String> handleGenericException(Exception exception) {
        log.error("Unexpected error", exception);
        return Map.of("code", "project.exceptions.InternalServerError",
                       "message", "An unexpected error occurred. Please try again later.");
    }
}
