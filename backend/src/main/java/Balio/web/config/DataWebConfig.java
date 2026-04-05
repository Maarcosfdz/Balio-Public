package Balio.web.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.web.config.EnableSpringDataWebSupport;

/**
 * Configuration for Spring Data Web support.
 * Enables proper serialization of Page objects in REST endpoints
 * using PagedModel (DTO) instead of raw PageImpl for stable JSON structure.
 * 
 * This resolves the warning about unstable JSON serialization
 * when returning Page<T> from REST controllers.
 */
@Configuration
@EnableSpringDataWebSupport(pageSerializationMode = EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO)
public class DataWebConfig {
    // Configuration class for Spring Data Web support
}
