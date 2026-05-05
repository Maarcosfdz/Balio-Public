package Balio.web.model.entities;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GoalDao extends JpaRepository<Goal, UUID> {

    @Query("""
            SELECT DISTINCT g FROM Goal g
            LEFT JOIN FETCH g.linkedAccounts
            WHERE g.id = :id AND g.user.id = :userId
            """)
    Optional<Goal> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);

    @Query("""
            SELECT DISTINCT g FROM Goal g
            LEFT JOIN FETCH g.linkedAccounts
            WHERE g.user.id = :userId
            ORDER BY g.name ASC
            """)
    List<Goal> findAllByUserIdOrderByNameAsc(@Param("userId") UUID userId);

    /**
     * Returns all goals (except excludeGoalId) for the user that are linked
     * to at least one account from the given set. Used for cross-goal balance validation.
     */
    @Query("""
            SELECT DISTINCT g FROM Goal g
            JOIN g.linkedAccounts a
            WHERE g.user.id = :userId
              AND a.id IN :accountIds
              AND g.id <> :excludeGoalId
            """)
    List<Goal> findByUserAndLinkedAccounts(
            @Param("userId") UUID userId,
            @Param("accountIds") Collection<UUID> accountIds,
            @Param("excludeGoalId") UUID excludeGoalId);

    @Modifying
    @Query("DELETE FROM Goal g WHERE g.user.id = :userId")
    void deleteAllByUserId(@Param("userId") UUID userId);
}
