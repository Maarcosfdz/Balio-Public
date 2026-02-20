package Balio.web.config;

import Balio.web.model.services.RefreshTokenService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/**
 * Scheduled tasks for housekeeping operations.
 * Runs periodic cleanup of expired refresh tokens to keep the database lean.
 */
@Configuration
@EnableScheduling
public class ScheduledTasks {

    private static final Logger log = LoggerFactory.getLogger(ScheduledTasks.class);

    private final RefreshTokenService refreshTokenService;

    public ScheduledTasks(RefreshTokenService refreshTokenService) {
        this.refreshTokenService = refreshTokenService;
    }

    /**
     * Purge expired refresh tokens every 6 hours.
     * Cron: second minute hour day-of-month month day-of-week
     */
    @Scheduled(cron = "0 0 */6 * * *")
    public void purgeExpiredRefreshTokens() {
        log.info("Scheduled task: purging expired refresh tokens");
        refreshTokenService.purgeExpiredTokens();
    }
}
