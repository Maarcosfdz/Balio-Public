package Balio.web.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Jackson 2.x configuration.
 *
 * Spring Boot 4 auto-configures Jackson 3 (tools.jackson.*) by default.
 * FilterServiceImpl still relies on the classic Jackson 2 ObjectMapper for
 * JSON parsing of filter definitions. This bean makes ObjectMapper available
 * in the Spring context so the auto-wiring succeeds in both production and test.
 */
@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper;
    }
}
