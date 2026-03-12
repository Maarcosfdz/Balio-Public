package Balio.web.model.services;

import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.BankConnection;

import java.util.List;
import java.util.UUID;

/**
 * Handles bank-account linking via TrueLayer or Enable Banking and transaction synchronization.
 */
public interface BankService {

    /**
     * Generates the TrueLayer authorization URL for the given account.
     * The account must be of type BANK and not already linked.
     */
    String initConnection(UUID userId, UUID accountId) throws InstanceNotFoundException;

    /**
     * Completes the TrueLayer OAuth flow: exchanges the authorization code for tokens,
     * selects the first TrueLayer account, and persists the BankConnection.
     */
    BankConnection completeConnection(String state, String code) throws InstanceNotFoundException;

    // ── Enable Banking ───────────────────────────────────────────────────

    /**
     * Starts an Enable Banking authorization for the given ASPSP (bank).
     *
     * @param aspspName    bank name as returned by the Enable Banking /aspsps endpoint
     * @param aspspCountry ISO 3166-1 alpha-2 country code (e.g. "ES")
     * @return the authorization link the user must visit
     */
    String initEnableBankingConnection(UUID userId, UUID accountId,
                                       String aspspName, String aspspCountry)
            throws InstanceNotFoundException;

    /**
     * Completes the Enable Banking flow after the user returns from the bank.
     * Creates a session, picks the first account, and persists the BankConnection.
     *
     * @param state the state value (= accountId) passed when starting the auth
     * @param code  the authorization code received in the callback
     */
    BankConnection completeEnableBankingConnection(String state, String code)
            throws InstanceNotFoundException;

    // ── Common ───────────────────────────────────────────────────────────

    /**
     * Triggers a manual synchronization: fetches transactions and updates the balance.
     * Routes to the correct provider based on the stored connection.
     *
     * @return number of new transactions imported
     */
    int syncTransactions(UUID userId, UUID accountId) throws InstanceNotFoundException;

        int syncStaleConnections(UUID userId, int staleMinutes);

        int syncAllConnections(UUID userId);

        List<BankConnection> findLinkedConnections(UUID userId);

    /**
     * Returns the BankConnection for a linked account, or null if not linked.
     */
    BankConnection getConnection(UUID userId, UUID accountId);

    /**
     * Removes the bank link (tokens, connection) but keeps the account and its transactions.
     */
    void unlinkAccount(UUID userId, UUID accountId) throws InstanceNotFoundException;
}
