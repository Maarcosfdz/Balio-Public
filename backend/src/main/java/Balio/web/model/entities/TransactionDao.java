package Balio.web.model.entities;

import Balio.web.enums.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransactionDao extends JpaRepository<Transaction, UUID> {

    Optional<Transaction> findByIdAndUserId(UUID id, UUID userId);

    List<Transaction> findAllByUserIdOrderByDateDesc(UUID userId);

    List<Transaction> findAllByUserIdAndAccountIdOrderByDateDesc(UUID userId, UUID accountId);

    @Query("SELECT t FROM Transaction t WHERE t.user.id = :userId " +
           "AND (:type IS NULL OR t.type = :type) " +
           "AND (:accountId IS NULL OR t.account.id = :accountId) " +
           "AND (:categoryId IS NULL OR t.category.id = :categoryId) " +
           "AND (CAST(:startDate AS date) IS NULL OR t.date >= :startDate) " +
           "AND (CAST(:endDate AS date) IS NULL OR t.date <= :endDate) " +
           "ORDER BY t.date DESC")
    List<Transaction> findFiltered(@Param("userId") UUID userId,
                                   @Param("type") TransactionType type,
                                   @Param("accountId") UUID accountId,
                                   @Param("categoryId") UUID categoryId,
                                   @Param("startDate") LocalDate startDate,
                                   @Param("endDate") LocalDate endDate);

    @Query(value = "SELECT t FROM Transaction t WHERE t.user.id = :userId " +
                   "AND (:type IS NULL OR t.type = :type) " +
                   "AND (:accountId IS NULL OR t.account.id = :accountId) " +
                   "AND (:categoryId IS NULL OR t.category.id = :categoryId) " +
                   "AND (CAST(:startDate AS date) IS NULL OR t.date >= :startDate) " +
                   "AND (CAST(:endDate AS date) IS NULL OR t.date <= :endDate)",
           countQuery = "SELECT count(t) FROM Transaction t WHERE t.user.id = :userId " +
                        "AND (:type IS NULL OR t.type = :type) " +
                        "AND (:accountId IS NULL OR t.account.id = :accountId) " +
                        "AND (:categoryId IS NULL OR t.category.id = :categoryId) " +
                        "AND (CAST(:startDate AS date) IS NULL OR t.date >= :startDate) " +
                        "AND (CAST(:endDate AS date) IS NULL OR t.date <= :endDate)")
    Page<Transaction> findFilteredPaged(@Param("userId") UUID userId,
                                        @Param("type") TransactionType type,
                                        @Param("accountId") UUID accountId,
                                        @Param("categoryId") UUID categoryId,
                                        @Param("startDate") LocalDate startDate,
                                        @Param("endDate") LocalDate endDate,
                                        Pageable pageable);

    // ── BATCH RULES ─────────────────────────────────────────────────────

    @Query("SELECT t FROM Transaction t WHERE t.user.id = :userId " +
           "AND (:type IS NULL OR t.type = :type) " +
           "AND (:categoryId IS NULL OR t.category.id = :categoryId) " +
           "AND (:nameLike IS NULL OR LOWER(t.name) LIKE :nameLike) " +
           "AND (CAST(:startDate AS date) IS NULL OR t.date >= :startDate) " +
           "AND (CAST(:endDate AS date) IS NULL OR t.date <= :endDate)")
    List<Transaction> findForBatchRule(@Param("userId") UUID userId,
                                      @Param("type") TransactionType type,
                                      @Param("categoryId") UUID categoryId,
                                      @Param("nameLike") String nameLike,
                                      @Param("startDate") LocalDate startDate,
                                      @Param("endDate") LocalDate endDate);

    // ── BANK SYNC ────────────────────────────────────────────────────────

    boolean existsByAccountIdAndExternalId(UUID accountId, String externalId);

    // ── BUDGET ──────────────────────────────────────────────────────────

    @Query("SELECT t FROM Transaction t WHERE t.user.id = :userId " +
           "AND t.type = Balio.web.enums.TransactionType.EXPENSE " +
           "AND t.category.id IN :categoryIds " +
           "AND t.date >= :startDate AND t.date <= :endDate " +
           "ORDER BY t.date DESC")
    List<Transaction> findExpensesByCategoryIdsAndDateRange(
            @Param("userId") UUID userId,
            @Param("categoryIds") List<UUID> categoryIds,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

}
