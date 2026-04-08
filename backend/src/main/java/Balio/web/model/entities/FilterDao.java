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

public interface FilterDao extends JpaRepository<Filter, UUID> {

    Optional<Filter> findByIdAndUserId(UUID id, UUID userId);

    List<Filter> findAllByUserIdOrderByNameAsc(UUID userId);

    Page<Filter> findAllByUserIdOrderByNameAsc(UUID userId, Pageable pageable);

    @Modifying
    @Query("DELETE FROM Filter f WHERE f.user.id = :userId")
    void deleteAllByUserId(@Param("userId") UUID userId);
}
