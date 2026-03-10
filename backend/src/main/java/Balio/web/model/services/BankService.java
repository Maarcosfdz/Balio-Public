package Balio.web.model.services;

import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.BankConnection;

import java.util.UUID;

/**
 * Handles bank-account linking via TrueLayer and transaction synchronization.
 */
public interface BankService {

    /**
     * Generates the TrueLayer authorization URL for the given account.
     * The account must be of type BANK and not already linked.
     */
    String initConnection(UUID userId, UUID accountId) throws InstanceNotFoundException;

    /**
     * Completes the OAuth flow: exchanges the authorization code for tokens,
     * selects the first TrueLayer account, and persists the BankConnection.
     *
     * @param state the opaque state value (= accountId) received in the callback
     * @param code  the authorization code from TrueLayer
     */
    BankConnection completeConnection(String state, String code) throws InstanceNotFoundException;

    /**
     * Triggers a manual synchronization: fetches transactions and updates the balance.
     *
     * @return number of new transactions imported
     */
    int syncTransactions(UUID userId, UUID accountId) throws InstanceNotFoundException;

    /**
     * Returns the BankConnection for a linked account, or null if not linked.
     */
    BankConnection getConnection(UUID userId, UUID accountId);

    /**
     * Removes the bank link (tokens, connection) but keeps the account and its transactions.
     */
    void unlinkAccount(UUID userId, UUID accountId) throws InstanceNotFoundException;
}
