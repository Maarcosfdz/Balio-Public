package Balio.web.model.services;

import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.Filter;
import Balio.web.model.entities.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

/**
 * Defines the contract for filter-related operations.
 * Filters store user-defined criteria as JSON to query transactions.
 */
public interface FilterService {

    /**
     * Creates a new filter for the user.
     *
     * @throws Balio.web.model.Exceptions.UserNotFoundException   if the user does not exist
     * @throws Balio.web.model.Exceptions.FilterInvalidException  if validation fails (name/definition)
     */
    Filter createFilter(UUID userId, String name, String definition);

    /**
     * Deletes a filter owned by the user.
     *
     * @throws InstanceNotFoundException if the filter does not exist or does not belong to the user
     */
    void deleteFilter(UUID userId, UUID filterId) throws InstanceNotFoundException;

    /**
     * Modifies the fields of an existing filter. Only non-null parameters are applied.
     *
     * @throws InstanceNotFoundException if the filter does not exist or does not belong to the user
     */
    Filter modifyFilter(UUID userId, UUID filterId, String name, String definition)
            throws InstanceNotFoundException;

    /**
     * Returns all filters belonging to the user, ordered by name.
     */
    List<Filter> findAllByUserId(UUID userId);

    /**
     * Returns a paginated list of filters for the user, ordered by name.
     */
    Page<Filter> findPagedByUserId(UUID userId, Pageable pageable);

    /**
     * Returns a single filter belonging to the user.
     *
     * @throws InstanceNotFoundException if the filter does not exist or does not belong to the user
     */
    Filter findByIdAndUserId(UUID filterId, UUID userId) throws InstanceNotFoundException;

    /**
     * Applies a saved filter to the user's transactions and returns the matching results.
     *
     * @throws InstanceNotFoundException if the filter does not exist or does not belong to the user
     */
    List<Transaction> applyFilter(UUID userId, UUID filterId) throws InstanceNotFoundException;
}
