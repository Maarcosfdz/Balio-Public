package Balio.web.model.entities;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BudgetDao extends JpaRepository<Budget, UUID> {

    Optional<Budget> findByIdAndUserId(UUID id, UUID userId);

    List<Budget> findAllByUserIdOrderByNameAsc(UUID userId);

    long countByUserId(UUID userId);
}
