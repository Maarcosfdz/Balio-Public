package Balio.web.model.entities;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BankTransactionRuleDao extends JpaRepository<BankTransactionRule, UUID> {

    List<BankTransactionRule> findAllByUserIdAndAccountIdOrderByPriorityDesc(UUID userId, UUID accountId);

    Optional<BankTransactionRule> findByIdAndUserIdAndAccountId(UUID id, UUID userId, UUID accountId);

    @Modifying
    @Query("DELETE FROM BankTransactionRule r WHERE r.user.id = :userId")
    void deleteAllByUserId(@Param("userId") UUID userId);
}
