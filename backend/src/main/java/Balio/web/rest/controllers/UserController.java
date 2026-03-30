package Balio.web.rest.controllers;

import Balio.web.model.Exceptions.DuplicateInstanceException;
import Balio.web.model.Exceptions.IncorrectLoginException;
import Balio.web.model.Exceptions.IncorrectPasswordException;
import Balio.web.model.Exceptions.PermissionException;
import Balio.web.model.entities.RefreshToken;
import Balio.web.model.entities.User;
import Balio.web.model.services.RefreshTokenService;
import Balio.web.model.services.UserService;
import Balio.web.rest.common.JwtGenerator;
import Balio.web.rest.common.LoginRateLimiter;
import Balio.web.rest.dtos.AuthenticatedUserDto;
import Balio.web.rest.dtos.ChangePasswordParamsDto;
import Balio.web.rest.dtos.LoginParamsDto;
import Balio.web.rest.dtos.RefreshTokenRequestDto;
import Balio.web.rest.dtos.UserConverter;
import Balio.web.rest.dtos.UserDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import javax.management.InstanceNotFoundException;
import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/user")
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);

    private final UserService userService;
    private final RefreshTokenService refreshTokenService;
    private final JwtGenerator jwtGenerator;
    private final UserConverter userConverter;
    private final LoginRateLimiter loginRateLimiter;

    public UserController(UserService userService, RefreshTokenService refreshTokenService,
                          JwtGenerator jwtGenerator, UserConverter userConverter,
                          LoginRateLimiter loginRateLimiter) {
        this.userService = userService;
        this.refreshTokenService = refreshTokenService;
        this.jwtGenerator = jwtGenerator;
        this.userConverter = userConverter;
        this.loginRateLimiter = loginRateLimiter;
    }

    @PostMapping("/signUp")
    public ResponseEntity<AuthenticatedUserDto> signUp(
            @Validated({UserDto.AllValidations.class}) @RequestBody UserDto userDto)
            throws DuplicateInstanceException, IncorrectLoginException {

        // Rate limit signup to prevent registration spam
        if (loginRateLimiter.isBlocked(userDto.getEmail())) {
            long remaining = loginRateLimiter.getRemainingBlockSeconds(userDto.getEmail());
            throw new IncorrectLoginException("Too many attempts. Try again in " + remaining + " seconds.");
        }

        userService.signUp(userDto.getNickname(), userDto.getEmail(), userDto.getPassword());

        User user = userService.login(userDto.getEmail(), userDto.getPassword());
        String accessToken = jwtGenerator.generateAccessToken(user.getId());
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

        log.info("User signed up: userId={}", user.getId());

        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest().path("/{id}")
                .buildAndExpand(user.getId()).toUri();

        return ResponseEntity.created(location)
                .body(userConverter.toAuthenticatedUserDto(user, accessToken, refreshToken.getToken()));
    }

    @PostMapping("/login")
    public AuthenticatedUserDto login(@Validated @RequestBody LoginParamsDto params)
            throws IncorrectLoginException {

        if ( loginRateLimiter.isBlocked(params.getEmail()) ) {
            long remaining = loginRateLimiter.getRemainingBlockSeconds(params.getEmail());
            log.warn("Login blocked due to rate limiting: email={}, remaining={}s", params.getEmail(), remaining);
            throw new IncorrectLoginException("Too many failed attempts. Try again in " + remaining + " seconds.");
        }

        try {
            User user = userService.login(params.getEmail(), params.getPassword());
            String accessToken = jwtGenerator.generateAccessToken(user.getId());
            RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

            loginRateLimiter.registerSuccessfulLogin(params.getEmail());
            log.info("User logged in: userId={}", user.getId());

            return userConverter.toAuthenticatedUserDto(user, accessToken, refreshToken.getToken());
        } catch (IncorrectLoginException e) {
            loginRateLimiter.registerFailedAttempt(params.getEmail());
            log.warn("Failed login attempt: email={}", params.getEmail());
            throw e;
        }
    }

    @PostMapping("/refreshToken")
    public AuthenticatedUserDto refreshToken(@Validated @RequestBody RefreshTokenRequestDto params) {

        RefreshToken rotated = refreshTokenService.rotateRefreshToken(params.getRefreshToken());
        User user = rotated.getUser();
        String accessToken = jwtGenerator.generateAccessToken(user.getId());

        log.debug("Token refreshed for userId={}", user.getId());

        return userConverter.toAuthenticatedUserDto(user, accessToken, rotated.getToken());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@RequestAttribute UUID userId) {
        refreshTokenService.revokeAllUserTokens(userId);
        log.info("User logged out: userId={}", userId);
    }

    @PutMapping("/{id}")
    public UserDto updateProfile(@RequestAttribute UUID userId,
                                 @PathVariable UUID id,
                                 @Validated({UserDto.UpdateValidations.class}) @RequestBody UserDto userDto)
            throws InstanceNotFoundException, DuplicateInstanceException, PermissionException {

        if ( !id.equals(userId) ) {
            throw new PermissionException();
        }

        User user = userService.updateProfile(id, userDto.getNickname(), userDto.getEmail());
        log.info("Profile updated: userId={}", id);
        return userConverter.toUserDto(user);
    }

    @PutMapping("/{id}/preferredCurrency")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updatePreferredCurrency(@RequestAttribute UUID userId,
                                         @PathVariable UUID id,
                                         @RequestBody java.util.Map<String, String> body)
            throws InstanceNotFoundException, PermissionException {

        if (!id.equals(userId)) {
            throw new PermissionException();
        }

        userService.updatePreferredCurrency(id, body.get("preferredCurrency"));
        log.info("Preferred currency updated: userId={}, currency={}", id, body.get("preferredCurrency"));
    }

    @PostMapping("/{id}/changePassword")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@RequestAttribute UUID userId,
                               @PathVariable UUID id,
                               @Validated @RequestBody ChangePasswordParamsDto params)
            throws PermissionException, InstanceNotFoundException, IncorrectPasswordException {

        if ( !id.equals(userId) ) {
            throw new PermissionException();
        }

        userService.changePassword(id, params.getOldPassword(), params.getNewPassword());

        // Revoke all refresh tokens on password change for security
        refreshTokenService.revokeAllUserTokens(id);
        log.info("Password changed and tokens revoked: userId={}", id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(@RequestAttribute UUID userId,
                              @PathVariable UUID id)
            throws PermissionException, InstanceNotFoundException {

        if (!id.equals(userId)) {
            throw new PermissionException();
        }

        userService.deleteAccount(id);
        log.info("Account deleted: userId={}", id);
    }

}
