package Balio.web.model.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class FrankfurterExchangeRateService implements ExchangeRateService {

    private static final Logger log = LoggerFactory.getLogger(FrankfurterExchangeRateService.class);
    private static final String BASE_URL = "https://api.frankfurter.app/latest";
    private static final long CACHE_TTL_MS = 3_600_000; // 1 hour

    private final RestTemplate restTemplate = new RestTemplate();

    // Simple in-memory cache: key = "FROM->TO", value = CachedRate
    private final ConcurrentHashMap<String, CachedRate> cache = new ConcurrentHashMap<>();

    @Override
    public BigDecimal getRate(String from, String to) {
        if (from == null || to == null) {
            return null;
        }
        if (from.equalsIgnoreCase(to)) {
            return BigDecimal.ONE;
        }

        String key = from.toUpperCase() + "->" + to.toUpperCase();
        CachedRate cached = cache.get(key);
        if (cached != null && !cached.isExpired()) {
            return cached.rate;
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(
                    BASE_URL + "?from={from}&to={to}", Map.class, from, to);

            if (response != null && response.containsKey("rates")) {
                @SuppressWarnings("unchecked")
                Map<String, Number> rates = (Map<String, Number>) response.get("rates");
                Number rateNum = rates.get(to.toUpperCase());
                if (rateNum != null) {
                    BigDecimal rate = new BigDecimal(rateNum.toString());
                    cache.put(key, new CachedRate(rate));
                    return rate;
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch exchange rate {}->{}: {}", from, to, e.getMessage());
        }

        return cached != null ? cached.rate : null;
    }

    @Override
    @SuppressWarnings("unchecked")
    public Map<String, BigDecimal> getLatestRates(String base) {
        if (base == null) {
            return Collections.emptyMap();
        }

        try {
            Map<String, Object> response = restTemplate.getForObject(
                    BASE_URL + "?from={base}", Map.class, base);

            if (response != null && response.containsKey("rates")) {
                Map<String, Number> rates = (Map<String, Number>) response.get("rates");
                Map<String, BigDecimal> result = new ConcurrentHashMap<>();
                for (Map.Entry<String, Number> entry : rates.entrySet()) {
                    BigDecimal rate = new BigDecimal(entry.getValue().toString());
                    result.put(entry.getKey(), rate);
                    cache.put(base.toUpperCase() + "->" + entry.getKey(),
                            new CachedRate(rate));
                }
                return result;
            }
        } catch (Exception e) {
            log.warn("Failed to fetch latest rates for {}: {}", base, e.getMessage());
        }

        return Collections.emptyMap();
    }

    private static class CachedRate {
        final BigDecimal rate;
        final long timestamp;

        CachedRate(BigDecimal rate) {
            this.rate = rate;
            this.timestamp = System.currentTimeMillis();
        }

        boolean isExpired() {
            return System.currentTimeMillis() - timestamp > CACHE_TTL_MS;
        }
    }
}
