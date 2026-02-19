package Balio.web.rest.controllers;

import java.net.URI;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import Balio.web.model.Exceptions.DuplicateInstanceException;
import Balio.web.model.Exceptions.IncorrectLoginException;
import Balio.web.model.Exceptions.IncorrectPasswordException;
import Balio.web.model.Exceptions.PermissionException;
import Balio.web.model.entities.User;
import Balio.web.model.services.UserService;
import Balio.web.rest.common.JwtGenerator;
import Balio.web.rest.dtos.AuthenticatedUserDto;
import Balio.web.rest.dtos.ChangePasswordParamsDto;
import Balio.web.rest.dtos.LoginParamsDto;
import Balio.web.rest.dtos.UserConverter;
import Balio.web.rest.dtos.UserDto;

import javax.management.InstanceNotFoundException;

@RestController
@RequestMapping("/user")
public class UserController {

    private final UserService userService;
    private final JwtGenerator jwtGenerator;
    private final UserConverter userConverter;

    public UserController(UserService userService, JwtGenerator jwtGenerator, UserConverter userConverter) {
        this.userService = userService;
        this.jwtGenerator = jwtGenerator;
        this.userConverter = userConverter;
    }

    @PostMapping("/signUp")
    public ResponseEntity<AuthenticatedUserDto> signUp(
            @Validated({UserDto.AllValidations.class}) @RequestBody UserDto userDto)
            throws DuplicateInstanceException, IncorrectLoginException {

        userService.signUp(userDto.getNickname(), userDto.getEmail(), userDto.getPassword());

        User user = userService.login(userDto.getEmail(), userDto.getPassword());
        String token = jwtGenerator.generateToken(user.getId());

        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest().path("/{id}")
                .buildAndExpand(user.getId()).toUri();

        return ResponseEntity.created(location).body(userConverter.toAuthenticatedUserDto(user, token));
    }

    @PostMapping("/login")
    public AuthenticatedUserDto login(@Validated @RequestBody LoginParamsDto params)
            throws IncorrectLoginException {

        User user = userService.login(params.getEmail(), params.getPassword());
        String token = jwtGenerator.generateToken(user.getId());

        return userConverter.toAuthenticatedUserDto(user, token);
    }

    @PutMapping("/{id}")
    public UserDto updateProfile(@RequestAttribute UUID userId,
                                 @PathVariable UUID id,
                                 @Validated({UserDto.UpdateValidations.class}) @RequestBody UserDto userDto)
            throws InstanceNotFoundException, DuplicateInstanceException, PermissionException {

        if (!id.equals(userId)) {
            throw new PermissionException();
        }

        User user = userService.updateProfile(id, userDto.getNickname(), userDto.getEmail());
        return userConverter.toUserDto(user);
    }

    @PostMapping("/{id}/changePassword")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@RequestAttribute UUID userId,
                               @PathVariable UUID id,
                               @Validated @RequestBody ChangePasswordParamsDto params)
            throws PermissionException, InstanceNotFoundException, IncorrectPasswordException {

        if (!id.equals(userId)) {
            throw new PermissionException();
        }

        userService.changePassword(id, params.getOldPassword(), params.getNewPassword());
    }

}
