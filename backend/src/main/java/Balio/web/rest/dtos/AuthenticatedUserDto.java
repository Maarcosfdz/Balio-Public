package Balio.web.rest.dtos;

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

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }

    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }

    public String getPreferredCurrency() { return preferredCurrency; }
    public void setPreferredCurrency(String preferredCurrency) { this.preferredCurrency = preferredCurrency; }
}
