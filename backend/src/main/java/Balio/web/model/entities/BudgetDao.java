package Balio.web.model.entities;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BudgetDao extends JpaRepository<Budget, UUID> {

    Optional<Budget> findByIdAndUserId(UUID id, UUID userId);

    List<Budget> findAllByUserIdOrderByNameAsc(UUID userId);

    long countByUserId(UUID userId);

    @Modifying
    @Query("DELETE FROM Budget b WHERE b.user.id = :userId")
    void deleteAllByUserId(@Param("userId") UUID userId);
}
