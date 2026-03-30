package Balio.web.model.services;

import Balio.web.enums.AccountType;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.Account;
import Balio.web.model.entities.User;

import java.util.List;
import java.util.UUID;

/**
 * Defines the contract for account-related operations.
 * Every method requires the userId to guarantee that only the owner
 * can operate on their own accounts.
 */
public interface AccountService {

    /**
     * Creates a new account for the user.
     * A maximum of 5 accounts per user is enforced.
     *
     * @throws Balio.web.model.Exceptions.UserNotFoundException if the user does not exist (unchecked)
     * @throws Balio.web.model.Exceptions.AccountInvalidException if the account limit is reached (unchecked)
     */
    Account createAccount(UUID userId, String name, AccountType type, String currency, Boolean setDefault);

    /**
     * Deletes an account owned by the user.
     * If the account is the user's default account, the default is cleared automatically.
     *
     * @throws InstanceNotFoundException if the account does not exist or does not belong to the user
     */
    void deleteAccount(UUID userId, UUID accountId) throws InstanceNotFoundException;

        /**
         * Deletes an account owned by the user and optionally removes its transactions.
         * When {@code deleteTransactions} is false, existing transactions are preserved and detached
         * from the deleted account.
         *
         * @throws InstanceNotFoundException if the account does not exist or does not belong to the user
         */
        void deleteAccount(UUID userId, UUID accountId, boolean deleteTransactions)
            throws InstanceNotFoundException;

    /**
     * Modifies the fields of an existing account. Only non-null parameters are applied.
     *
     * @throws InstanceNotFoundException if the account does not exist or does not belong to the user
     */
    Account modifyAccount(UUID userId, UUID accountId, String name, AccountType type, String currency)
            throws InstanceNotFoundException;

    /**
     * Sets the given account as the user's default account.
     *
     * @throws InstanceNotFoundException if the account does not exist or does not belong to the user
     */
    User setDefaultAccount(UUID userId, UUID accountId) throws InstanceNotFoundException;

    /**
     * Clears the default account for the user (sets it to null).
     *
     * @throws Balio.web.model.Exceptions.UserNotFoundException if the user does not exist (unchecked)
     */
    User clearDefaultAccount(UUID userId);

    /**
     * Returns all accounts belonging to the user, ordered by name.
     */
    List<Account> findAllByUserId(UUID userId);

    /**
     * Returns a single account belonging to the user.
     *
     * @throws InstanceNotFoundException if the account does not exist or does not belong to the user
     */
    Account findByIdAndUserId(UUID accountId, UUID userId) throws InstanceNotFoundException;

    /**
     * Returns the UUID of the user's default account, or null if none is set.
     */
    UUID getDefaultAccountId(UUID userId);

    /**
     * Directly sets the balance of a CASH or OTHER account.
     * BANK account balances are managed automatically via bank sync and cannot be modified manually.
     *
     * @throws InstanceNotFoundException if the account does not exist or does not belong to the user
     * @throws Balio.web.model.Exceptions.AccountInvalidException if the account type is BANK
     */
    Account adjustBalance(UUID userId, UUID accountId, java.math.BigDecimal newBalance)
            throws InstanceNotFoundException;

}
