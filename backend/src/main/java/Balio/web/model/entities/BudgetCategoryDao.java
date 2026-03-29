package Balio.web.model.entities;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface BudgetCategoryDao extends JpaRepository<BudgetCategory, UUID> {

    Optional<BudgetCategory> findByIdAndBudgetId(UUID id, UUID budgetId);

    long countByBudgetId(UUID budgetId);

    // ── Account deletion helpers ─────────────────────────────────────────
    // ManyToMany join tables must be cleaned with native SQL before bulk-deleting
    // BudgetCategory rows, because JPQL bulk DELETE bypasses the JPA lifecycle.

    @Modifying
    @Query(value = "DELETE FROM budget_category_transactions WHERE budget_category_id IN " +
                   "(SELECT bc.id FROM budget_categories bc JOIN budgets b ON bc.budget_id = b.id WHERE b.user_id = :userId)",
           nativeQuery = true)
    void deleteTransactionLinksByUserId(@Param("userId") UUID userId);

    @Modifying
    @Query(value = "DELETE FROM budget_category_linked_categories WHERE budget_category_id IN " +
                   "(SELECT bc.id FROM budget_categories bc JOIN budgets b ON bc.budget_id = b.id WHERE b.user_id = :userId)",
           nativeQuery = true)
    void deleteLinkedCategoryLinksByUserId(@Param("userId") UUID userId);

    @Modifying
    @Query("DELETE FROM BudgetCategory bc WHERE bc.budget.user.id = :userId")
    void deleteAllByBudgetUserId(@Param("userId") UUID userId);
}
