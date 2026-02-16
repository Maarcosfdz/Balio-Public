package Balio.web.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Configuración of Spring Security for the application.
 * This class defines a SecurityFilterChain bean that configures HTTP security settings, such as disabling CSRF protection and allowing all requests without authentication.
 * It also defines a PasswordEncoder bean that uses BCrypt for password hashing.
 */
@Configuration
public class SecurityConfig {

    /// Configures the security filter chain for the application. Disables CSRF protection and allows all requests without authentication.
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .build();
    }

    // Defines a PasswordEncoder bean that uses BCrypt for password hashing. This is used to securely store user passwords in the database.
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

}

