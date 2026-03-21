package Balio.web.model.entities;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BudgetCategoryDao extends JpaRepository<BudgetCategory, UUID> {

    Optional<BudgetCategory> findByIdAndBudgetId(UUID id, UUID budgetId);

    long countByBudgetId(UUID budgetId);
}
