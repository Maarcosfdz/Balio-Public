package Balio.web.model.entities;

import Balio.web.enums.TransactionType;
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

}
