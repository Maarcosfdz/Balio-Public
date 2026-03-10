package Balio.web.model.entities;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BankConnectionDao extends JpaRepository<BankConnection, UUID> {

    Optional<BankConnection> findByAccountId(UUID accountId);

    Optional<BankConnection> findByAccountIdAndUserId(UUID accountId, UUID userId);

    boolean existsByAccountId(UUID accountId);
}
