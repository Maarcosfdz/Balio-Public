package Balio.web.model.entities;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChartWidgetDao extends JpaRepository<ChartWidget, UUID> {

    Optional<ChartWidget> findByIdAndUserId(UUID id, UUID userId);

    List<ChartWidget> findAllByUserIdOrderByDisplayOrderAscNameAsc(UUID userId);

    List<ChartWidget> findAllByUserIdAndPinnedOrderByDisplayOrderAscNameAsc(UUID userId, boolean pinned);

    Page<ChartWidget> findAllByUserIdOrderByDisplayOrderAscNameAsc(UUID userId, Pageable pageable);

    Page<ChartWidget> findAllByUserIdAndPinnedOrderByDisplayOrderAscNameAsc(
            UUID userId, boolean pinned, Pageable pageable);
}
