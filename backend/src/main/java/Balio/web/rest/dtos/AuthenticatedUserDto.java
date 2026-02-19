package Balio.web.rest.dtos;

public class AuthenticatedUserDto {

    private String id;
    private String nickname;
    private String email;
    private String token;

    public AuthenticatedUserDto() {}

    public AuthenticatedUserDto(String id, String nickname, String email, String token) {
        this.id = id;
        this.nickname = nickname;
        this.email = email;
        this.token = token;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
}
