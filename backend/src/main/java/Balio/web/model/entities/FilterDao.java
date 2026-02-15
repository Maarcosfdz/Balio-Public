package Balio.web.model.entities;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface FilterDao extends JpaRepository<Filter, UUID> {
}
