package Balio.web.rest.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ChangePasswordParamsDto {

    @NotBlank
    private String oldPassword;

    @NotBlank
    @Size(min = 8, max = 255)
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$",
        message = "Password must contain at least one uppercase letter, one lowercase letter, and one digit"
    )
    private String newPassword;

    public String getOldPassword() { return oldPassword; }
    public void setOldPassword(String oldPassword) { this.oldPassword = oldPassword; }

    public String getNewPassword() { return newPassword; }
    public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
}
