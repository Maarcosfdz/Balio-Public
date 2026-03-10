package Balio.web.model.entities;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BankTransactionRuleDao extends JpaRepository<BankTransactionRule, UUID> {

    List<BankTransactionRule> findAllByUserIdOrderByPriorityDesc(UUID userId);

    Optional<BankTransactionRule> findByIdAndUserId(UUID id, UUID userId);
}
