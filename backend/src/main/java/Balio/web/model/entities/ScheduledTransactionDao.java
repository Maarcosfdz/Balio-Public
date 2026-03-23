package Balio.web.model.entities;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScheduledTransactionDao extends JpaRepository<ScheduledTransaction, UUID> {

    Optional<ScheduledTransaction> findByIdAndUserId(UUID id, UUID userId);

    Page<ScheduledTransaction> findAllByUserIdOrderByNameAsc(UUID userId, Pageable pageable);

    List<ScheduledTransaction> findAllByUserIdAndActiveTrue(UUID userId);

    long countByUserId(UUID userId);
}
