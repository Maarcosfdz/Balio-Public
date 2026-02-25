package Balio.web;

import Balio.web.rest.common.JwtGenerator;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for Spring Security configuration.
 *
 * Verifies that:
 * - Protected routes reject unauthenticated requests (returns 401/403)
 * - Protected routes are accessible with a valid JWT
 * - Public routes (/user/signUp, /user/login) do not require a token
 *
 * Uses MockMvc (MOCK servlet) + the full Spring Security filter chain.
 * Unit tests bypass Spring Security entirely (standaloneSetup), so
 * this is the ONLY place where security rules are actually exercised.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Security Integration Tests")
class SecurityIT {

    @Autowired MockMvc mockMvc;
    @Autowired JwtGenerator jwtGenerator;

    private String validToken;

    @BeforeEach
    void setUp() {
        // Any UUID is sufficient — JwtFilter only validates the token signature,
        // it does not check if the user exists in the database.
        validToken = jwtGenerator.generateAccessToken(UUID.randomUUID());
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Protected routes — no token → 401 or 403
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Protected routes: no token")
    class NoToken {

        @Test
        @DisplayName("GET /goal without token → rejected")
        void goal() throws Exception {
            mockMvc.perform(get("/goal")).andExpect(status().is4xxClientError());
        }

        @Test
        @DisplayName("GET /filter without token → rejected")
        void filter() throws Exception {
            mockMvc.perform(get("/filter")).andExpect(status().is4xxClientError());
        }

        @Test
        @DisplayName("GET /account without token → rejected")
        void account() throws Exception {
            mockMvc.perform(get("/account")).andExpect(status().is4xxClientError());
        }

        @Test
        @DisplayName("GET /transaction without token → rejected")
        void transaction() throws Exception {
            mockMvc.perform(get("/transaction")).andExpect(status().is4xxClientError());
        }

        @Test
        @DisplayName("GET /category without token → rejected")
        void category() throws Exception {
            mockMvc.perform(get("/category")).andExpect(status().is4xxClientError());
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Protected routes — invalid token → 401 or 403
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Protected routes: invalid token")
    class InvalidToken {

        @Test
        @DisplayName("GET /goal with garbage token → rejected")
        void garbageToken() throws Exception {
            mockMvc.perform(get("/goal").header(HttpHeaders.AUTHORIZATION, "Bearer not-a-jwt"))
                    .andExpect(status().is4xxClientError());
        }

        @Test
        @DisplayName("GET /goal with wrong-signature token → rejected")
        void wrongSignatureToken() throws Exception {
            String fake = "eyJhbGciOiJIUzI1NiJ9"
                    + ".eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJ0eXBlIjoiYWNjZXNzIn0"
                    + ".FAKE_SIGNATURE";
            mockMvc.perform(get("/goal").header(HttpHeaders.AUTHORIZATION, "Bearer " + fake))
                    .andExpect(status().is4xxClientError());
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Protected routes — valid token → accessible
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Protected routes: valid token")
    class ValidToken {

        @Test
        @DisplayName("GET /goal with valid token → 200 (empty list)")
        void goal() throws Exception {
            mockMvc.perform(get("/goal").header(HttpHeaders.AUTHORIZATION, "Bearer " + validToken))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("GET /filter with valid token → 200 (empty list)")
        void filter() throws Exception {
            mockMvc.perform(get("/filter").header(HttpHeaders.AUTHORIZATION, "Bearer " + validToken))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("GET /account with valid token → 200 (empty list)")
        void account() throws Exception {
            mockMvc.perform(get("/account").header(HttpHeaders.AUTHORIZATION, "Bearer " + validToken))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("GET /transaction with valid token → 200 (empty list)")
        void transaction() throws Exception {
            mockMvc.perform(get("/transaction").header(HttpHeaders.AUTHORIZATION, "Bearer " + validToken))
                    .andExpect(status().isOk());
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Public routes — no token needed
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Public routes: no token required")
    class PublicRoutes {

        @Test
        @DisplayName("POST /user/signUp without token → not rejected by security (400 from validation)")
        void signUp() throws Exception {
            // Empty body → 400 Bad Request (validation), NOT 401/403 (security)
            mockMvc.perform(post("/user/signUp")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().is(org.hamcrest.Matchers.not(
                            org.hamcrest.Matchers.anyOf(
                                    org.hamcrest.Matchers.is(401),
                                    org.hamcrest.Matchers.is(403)))));
        }

        @Test
        @DisplayName("POST /user/login without token → not rejected by security")
        void login() throws Exception {
            // Spring Security allows the request through → business logic rejects it
            // What matters: NOT 403 (which would mean Spring Security blocked it)
            mockMvc.perform(post("/user/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"email\":\"nobody@example.com\",\"password\":\"wrong\"}"))
                    .andExpect(status().is(org.hamcrest.Matchers.not(403)));
        }
    }

}

