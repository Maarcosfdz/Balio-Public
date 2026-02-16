package Balio.web.model.services;

import Balio.web.model.Exceptions.DuplicateInstanceException;
import Balio.web.model.Exceptions.IncorrectLoginException;
import Balio.web.model.Exceptions.IncorrectPasswordException;
import Balio.web.model.entities.User;

import javax.management.InstanceNotFoundException;
import java.util.UUID;

/*
 * Defines the contract for user-related operations in the application.
 * This interface includes methods for signing up new users, logging in, retrieving user information by ID, updating user profiles, and changing passwords.
 * The methods throw specific exceptions to handle cases such as duplicate instances and incorrect login attempts.
 */
public interface UserService {

    void signUp(String nickname, String email, String rawPassword) throws DuplicateInstanceException;

    User login(String email, String rawPassword) throws IncorrectLoginException;

    User getUserById(UUID id) throws InstanceNotFoundException;

    // A user only can modify their own data
    User updateProfile(UUID id, String nickname, String email) throws InstanceNotFoundException,
                                                                      DuplicateInstanceException;

    // A user only can modify their own password
    void changePassword(UUID id, String oldRawPassword, String newRawPassword) throws InstanceNotFoundException,
                                                                                      IncorrectPasswordException;
}
