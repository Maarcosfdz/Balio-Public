package Balio.web.model.entities;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccountDao extends JpaRepository<Account, UUID> {

    Optional<Account> findByIdAndUserId(UUID id, UUID userId);

    long countByUserId(UUID userId);

    List<Account> findAllByUserIdOrderByNameAsc(UUID userId);

    @Modifying
    @Query("DELETE FROM Account a WHERE a.user.id = :userId")
    void deleteAllByUserId(@Param("userId") UUID userId);
}
