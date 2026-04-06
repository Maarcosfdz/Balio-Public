package Balio.web.rest.dtos;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AuthenticatedUserDto {

    private String id;
    private String nickname;
    private String email;
    private String accessToken;
    private String refreshToken;
    private String preferredCurrency;

    public AuthenticatedUserDto() {}

    public AuthenticatedUserDto(String id, String nickname, String email,
                                String accessToken, String refreshToken,
                                String preferredCurrency) {
        this.id = id;
        this.nickname = nickname;
        this.email = email;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.preferredCurrency = preferredCurrency;
    }
}
