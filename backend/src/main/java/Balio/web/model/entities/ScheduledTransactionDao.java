package Balio.web.model.entities;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScheduledTransactionDao extends JpaRepository<ScheduledTransaction, UUID> {

    Optional<ScheduledTransaction> findByIdAndUserId(UUID id, UUID userId);

    Page<ScheduledTransaction> findAllByUserIdOrderByNameAsc(UUID userId, Pageable pageable);

    List<ScheduledTransaction> findAllByUserIdAndActiveTrue(UUID userId);

    List<ScheduledTransaction> findAllByUserIdAndAccountIdOrderByStartDateAsc(UUID userId, UUID accountId);

    long countByUserId(UUID userId);

    @Modifying
    @Query("DELETE FROM ScheduledTransaction st WHERE st.user.id = :userId")
    void deleteAllByUserId(@Param("userId") UUID userId);
}
