package Balio.web.model.services;

import Balio.web.model.Exceptions.DuplicateInstanceException;
import Balio.web.model.Exceptions.IncorrectLoginException;
import Balio.web.model.Exceptions.IncorrectPasswordException;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.management.InstanceNotFoundException;
import java.util.UUID;

@Service
@Transactional
public class UserServiceImpl implements UserService {

    private final PasswordEncoder passwordEncoder; //
    private final UserDao userDao;

    public UserServiceImpl(PasswordEncoder passwordEncoder,
                           UserDao userDao) {
        this.passwordEncoder = passwordEncoder;
        this.userDao = userDao;
    }

    @Override
    public void signUp(String nickname, String email, String rawPassword)
            throws DuplicateInstanceException {

        if ( userDao.existsByEmail(email) ) {
            throw new DuplicateInstanceException("project.entities.user", email);
        }

        String passwordHash = passwordEncoder.encode(rawPassword);

        User user = new User(nickname, email, passwordHash);
        userDao.save(user);
    }

    @Override
    @Transactional(readOnly = true)
    public User login(String email, String rawPassword) throws IncorrectLoginException {

        User user = userDao.findByEmail(email)
                .orElseThrow(() -> new IncorrectLoginException(email));

        if ( !passwordEncoder.matches(rawPassword, user.getPassword()) ) {
            throw new IncorrectLoginException(email);
        }

        return user;
    }

    @Override
    @Transactional(readOnly = true)
    public User getUserById(UUID id) throws InstanceNotFoundException {
        return userDao.findById(id)
                .orElseThrow(InstanceNotFoundException::new);
    }

    @Override
    public User updateProfile(UUID id, String nickname, String email) throws InstanceNotFoundException,
                                                                             DuplicateInstanceException {

        User user = userDao.findById(id)
                .orElseThrow(InstanceNotFoundException::new);

        // Check if the email exist if it changed
        if ( !user.getEmail().equals(email) && userDao.existsByEmail(email) ) {
            throw new DuplicateInstanceException("User", email);
        }

        user.setNickname(nickname);
        user.setEmail(email);

        return user; // User is automatically updated in the database at the end of the transaction
    }

    @Override
    public void changePassword(UUID authUserId, String oldRawPassword, String newRawPassword) throws
                                                                                              InstanceNotFoundException,
                                                                                              IncorrectPasswordException {

        User user = userDao.findById(authUserId)
                .orElseThrow(() -> new InstanceNotFoundException());

        // 1) Check de old
        if ( !passwordEncoder.matches(oldRawPassword, user.getPassword()) ) {
            throw new IncorrectPasswordException();
        }

        // 2) Avoid that the old passoword is equals than the new
        if ( passwordEncoder.matches(newRawPassword, user.getPassword()) ) {
            throw new IncorrectPasswordException();
        }

        user.setPassword(passwordEncoder.encode(newRawPassword));
    }

}
