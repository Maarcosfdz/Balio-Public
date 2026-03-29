package Balio.web.model.entities;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GoalDao extends JpaRepository<Goal, UUID> {

    Optional<Goal> findByIdAndUserId(UUID id, UUID userId);

    List<Goal> findAllByUserIdOrderByNameAsc(UUID userId);

    @Modifying
    @Query("DELETE FROM Goal g WHERE g.user.id = :userId")
    void deleteAllByUserId(@Param("userId") UUID userId);
}
