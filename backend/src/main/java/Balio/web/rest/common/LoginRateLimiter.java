package Balio.web.rest.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * In-memory rate limiter to protect against brute-force login and signup attempts.
 * Tracks failed attempts per key (email) and blocks requests after exceeding the threshold.
 *
 * A scheduled task cleans up expired entries every 10 minutes to prevent memory leaks.
 *
 * For production with multiple instances, replace with Redis-based rate limiting.
 */
@Component
public class LoginRateLimiter {

    private static final Logger log = LoggerFactory.getLogger(LoginRateLimiter.class);

    private static final int MAX_ATTEMPTS = 5;
    private static final long BLOCK_DURATION_SECONDS = 300; // 5 minutes

    private final ConcurrentHashMap<String, AttemptInfo> attempts = new ConcurrentHashMap<>();

    public boolean isBlocked(String email) {
        String key = normalizeKey(email);
        AttemptInfo info = attempts.get(key);

        if (info == null) {
            return false;
        }

        // If block period has expired, reset
        if (info.blockedUntil != null && Instant.now().isAfter(info.blockedUntil)) {
            attempts.remove(key);
            return false;
        }

        return info.blockedUntil != null && Instant.now().isBefore(info.blockedUntil);
    }

    public void registerFailedAttempt(String email) {
        String key = normalizeKey(email);
        AttemptInfo info = attempts.computeIfAbsent(key, k -> new AttemptInfo());

        int count = info.count.incrementAndGet();
        info.lastAttempt = Instant.now();

        if (count >= MAX_ATTEMPTS) {
            info.blockedUntil = Instant.now().plusSeconds(BLOCK_DURATION_SECONDS);
            log.warn("Rate limit reached for key={}, blocked for {} seconds", key, BLOCK_DURATION_SECONDS);
        }
    }

    public void registerSuccessfulLogin(String email) {
        String key = normalizeKey(email);
        attempts.remove(key);
    }

    /**
     * Returns remaining seconds of block, or 0 if not blocked.
     */
    public long getRemainingBlockSeconds(String email) {
        String key = normalizeKey(email);
        AttemptInfo info = attempts.get(key);
        if (info == null || info.blockedUntil == null) {
            return 0;
        }
        long remaining = info.blockedUntil.getEpochSecond() - Instant.now().getEpochSecond();
        return Math.max(0, remaining);
    }

    /**
     * Periodically removes expired entries to prevent unbounded memory growth.
     * Runs every 10 minutes.
     */
    @Scheduled(fixedRate = 600_000)
    public void cleanupExpired() {
        Instant now = Instant.now();
        int before = attempts.size();
        attempts.entrySet().removeIf(entry -> {
            AttemptInfo info = entry.getValue();
            // Remove if block has expired, or if no activity for 2× block duration
            if (info.blockedUntil != null && now.isAfter(info.blockedUntil)) {
                return true;
            }
            return info.lastAttempt != null
                    && now.getEpochSecond() - info.lastAttempt.getEpochSecond() > BLOCK_DURATION_SECONDS * 2;
        });
        int removed = before - attempts.size();
        if (removed > 0) {
            log.debug("Rate limiter cleanup: removed {} expired entries", removed);
        }
    }

    private static String normalizeKey(String email) {
        return email == null ? "" : email.toLowerCase().trim();
    }

    private static class AttemptInfo {
        final AtomicInteger count = new AtomicInteger(0);
        volatile Instant lastAttempt;
        volatile Instant blockedUntil;
    }
}
