package Balio.web.model.services;

import Balio.web.enums.AccountType;
import Balio.web.model.entities.Account;

import java.util.UUID;

/*
 * Defines the contract for account-related operations in the application.
 * This interface includes methods for creating, deleting, modifying, and setting default accounts.
 * Each method requires the user ID to ensure that users can only modify their own accounts.
 */
public interface AccountService {

    Account createAccount(UUID userId, String name, AccountType type, String currency, Boolean setDefault);

    void deleteAccount(UUID userId, UUID accountId);

    Account modifyAccount(UUID userId, UUID accountId, String name, AccountType type, String currency, Boolean setDefault);

    Account setDefaultAccount(UUID userId, UUID accountId, Boolean setDefault);
}
