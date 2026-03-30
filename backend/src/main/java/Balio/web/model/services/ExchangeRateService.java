package Balio.web.model.services;

import java.math.BigDecimal;
import java.util.Map;

public interface ExchangeRateService {

    /**
     * Returns the exchange rate to convert 1 unit of {@code from} into {@code to}.
     * Returns null if the rate cannot be fetched.
     */
    BigDecimal getRate(String from, String to);

    /**
     * Returns latest rates for all common currencies relative to {@code base}.
     * Returns empty map on failure.
     */
    Map<String, BigDecimal> getLatestRates(String base);
}
