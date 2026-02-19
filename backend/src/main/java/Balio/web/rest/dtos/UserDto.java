package Balio.web.rest.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UserDto {

    public interface AllValidations {}
    public interface UpdateValidations {}

    private String id;

    @NotBlank(groups = {AllValidations.class, UpdateValidations.class})
    @Size(max = 60, groups = {AllValidations.class, UpdateValidations.class})
    private String nickname;

    @NotBlank(groups = {AllValidations.class, UpdateValidations.class})
    @Email(groups = {AllValidations.class, UpdateValidations.class})
    @Size(max = 255, groups = {AllValidations.class, UpdateValidations.class})
    private String email;

    @NotBlank(groups = AllValidations.class)
    @Size(min = 6, max = 255, groups = AllValidations.class)
    private String password;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
