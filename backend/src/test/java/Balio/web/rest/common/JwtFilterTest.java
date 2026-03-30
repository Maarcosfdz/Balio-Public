package Balio.web.rest.common;

import Balio.web.model.entities.UserDao;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("JwtFilter unit tests")
class JwtFilterTest {

    @Mock private JwtGenerator jwtGenerator;
    @Mock private UserDao userDao;
    @Mock private HttpServletRequest request;
    @Mock private HttpServletResponse response;
    @Mock private FilterChain filterChain;

    private JwtFilter jwtFilter;

    @BeforeEach
    void setUp() {
        jwtFilter = new JwtFilter(jwtGenerator, userDao);
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("no Authorization header → chain proceeds, no authentication set")
    void noAuthHeader_chainProceeds() throws Exception {
        when(request.getHeader(HttpHeaders.AUTHORIZATION)).thenReturn(null);

        jwtFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    @DisplayName("Authorization header without Bearer prefix → chain proceeds, no authentication")
    void nonBearerHeader_chainProceeds() throws Exception {
        when(request.getHeader(HttpHeaders.AUTHORIZATION)).thenReturn("Basic dXNlcjpwYXNz");

        jwtFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(jwtGenerator, never()).extractTokenType(any());
    }

    @Test
    @DisplayName("valid access token → userId attribute set and authentication stored")
    void validAccessToken_setsAuthentication() throws Exception {
        UUID userId = UUID.randomUUID();
        String token = "valid.jwt.token";
        when(request.getHeader(HttpHeaders.AUTHORIZATION)).thenReturn("Bearer " + token);
        when(jwtGenerator.extractTokenType(token)).thenReturn("access");
        when(jwtGenerator.extractUserId(token)).thenReturn(userId);
        when(userDao.existsById(eq(userId))).thenReturn(true);

        jwtFilter.doFilterInternal(request, response, filterChain);

        verify(request).setAttribute("userId", userId);
        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("refresh token → context cleared, chain proceeds")
    void refreshToken_contextClearedAndChainProceeds() throws Exception {
        String token = "refresh.jwt.token";
        when(request.getHeader(HttpHeaders.AUTHORIZATION)).thenReturn("Bearer " + token);
        when(jwtGenerator.extractTokenType(token)).thenReturn("refresh");

        jwtFilter.doFilterInternal(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
        verify(jwtGenerator, never()).extractUserId(any());
    }

    @Test
    @DisplayName("invalid / expired token → exception caught, context cleared, chain proceeds")
    void invalidToken_exceptionCaught_chainProceeds() throws Exception {
        String token = "corrupted.token";
        when(request.getHeader(HttpHeaders.AUTHORIZATION)).thenReturn("Bearer " + token);
        when(jwtGenerator.extractTokenType(token)).thenThrow(new RuntimeException("invalid JWT"));

        jwtFilter.doFilterInternal(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }
}
