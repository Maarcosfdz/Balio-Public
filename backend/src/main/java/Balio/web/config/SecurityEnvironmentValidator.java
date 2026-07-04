package Balio.web.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

/**
 * Validates that security-sensitive configuration has been overridden from its
 * development defaults.  Logs a prominent warning at startup when insecure
 * defaults are still in use.
 */
@Component
public class SecurityEnvironmentValidator {

    private static final Logger log = LoggerFactory.getLogger(SecurityEnvironmentValidator.class);

    @Value("${project.jwt.signKey:}")
    private String jwtSignKey;

    @Value("${spring.datasource.password:}")
    private String dbPassword;

    @PostConstruct
    public void validate() {
        if (jwtSignKey.contains("DevOnlyKey") || jwtSignKey.contains("YourSuperSecretKey")) {
            log.warn("╔═══════════════════════════════════════════════════════════════╗");
            log.warn("║  WARNING: JWT_SIGN_KEY is using a development default.       ║");
            log.warn("║  Set the JWT_SIGN_KEY environment variable before deploying.  ║");
            log.warn("║  Generate with: openssl rand -base64 48                       ║");
            log.warn("╚═══════════════════════════════════════════════════════════════╝");
        }
        if ("change_me_local_password".equals(dbPassword)) {
            log.warn("╔═══════════════════════════════════════════════════════════════╗");
            log.warn("║  WARNING: DB_PASSWORD is using the development default.      ║");
            log.warn("║  Set the DB_PASSWORD environment variable before deploying.   ║");
            log.warn("╚═══════════════════════════════════════════════════════════════╝");
        }
    }
}
