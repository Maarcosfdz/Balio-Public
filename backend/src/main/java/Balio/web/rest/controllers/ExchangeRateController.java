package Balio.web.rest.controllers;

import Balio.web.model.services.ExchangeRateService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/exchange-rate")
public class ExchangeRateController {

    private final ExchangeRateService exchangeRateService;

    public ExchangeRateController(ExchangeRateService exchangeRateService) {
        this.exchangeRateService = exchangeRateService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getRate(
            @RequestParam String from,
            @RequestParam String to) {

        BigDecimal rate = exchangeRateService.getRate(from, to);
        if (rate == null) {
            return ResponseEntity.ok(Map.of("from", from, "to", to, "rate", 0, "available", false));
        }
        return ResponseEntity.ok(Map.of("from", from, "to", to, "rate", rate, "available", true));
    }

    @GetMapping("/latest")
    public Map<String, BigDecimal> getLatestRates(@RequestParam String base) {
        return exchangeRateService.getLatestRates(base);
    }
}
