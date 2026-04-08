package Balio.web.model.entities;

import Balio.web.enums.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CategoryDao extends JpaRepository<Category, UUID> {

    List<Category> findAllByUserIdOrderByNameAsc(UUID userId);

    List<Category> findAllByUserIdAndTypeOrderByNameAsc(UUID userId, TransactionType type);

    Page<Category> findAllByUserIdOrderByNameAsc(UUID userId, Pageable pageable);

    Page<Category> findAllByUserIdAndTypeOrderByNameAsc(UUID userId, TransactionType type, Pageable pageable);

    Optional<Category> findByIdAndUserId(UUID id, UUID userId);

    @Modifying
    @Query("DELETE FROM Category c WHERE c.user.id = :userId")
    void deleteAllByUserId(@Param("userId") UUID userId);
}
