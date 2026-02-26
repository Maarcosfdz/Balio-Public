package Balio.web.model.entities;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FilterDao extends JpaRepository<Filter, UUID> {

    Optional<Filter> findByIdAndUserId(UUID id, UUID userId);

    List<Filter> findAllByUserIdOrderByNameAsc(UUID userId);
}
