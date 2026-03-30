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

public interface ChartWidgetDao extends JpaRepository<ChartWidget, UUID> {

    Optional<ChartWidget> findByIdAndUserId(UUID id, UUID userId);

    List<ChartWidget> findAllByUserIdOrderByDisplayOrderAscNameAsc(UUID userId);

    List<ChartWidget> findAllByUserIdAndPinnedOrderByDisplayOrderAscNameAsc(UUID userId, boolean pinned);

    Page<ChartWidget> findAllByUserIdOrderByDisplayOrderAscNameAsc(UUID userId, Pageable pageable);

    Page<ChartWidget> findAllByUserIdAndPinnedOrderByDisplayOrderAscNameAsc(
            UUID userId, boolean pinned, Pageable pageable);

    @Modifying
    @Query("DELETE FROM ChartWidget cw WHERE cw.user.id = :userId")
    void deleteAllByUserId(@Param("userId") UUID userId);
}
