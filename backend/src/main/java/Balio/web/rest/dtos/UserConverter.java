package Balio.web.rest.dtos;

import Balio.web.model.entities.User;

import org.springframework.stereotype.Component;

@Component
public class UserConverter {

    public AuthenticatedUserDto toAuthenticatedUserDto(User user, String token) {
        return new AuthenticatedUserDto(
                user.getId().toString(),
                user.getNickname(),
                user.getEmail(),
                token
        );
    }

    public UserDto toUserDto(User user) {
        UserDto dto = new UserDto();
        dto.setId(user.getId().toString());
        dto.setNickname(user.getNickname());
        dto.setEmail(user.getEmail());
        return dto;
    }
}
