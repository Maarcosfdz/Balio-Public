import api from "./api";

export interface ExchangeRateDto {
  from: string;
  to: string;
  rate: number;
  available: boolean;
}

export const exchangeRateService = {
  getRate(from: string, to: string): Promise<ExchangeRateDto> {
    return api.get("/exchange-rate", { params: { from, to } }).then((r) => r.data);
  },

  getLatestRates(base: string): Promise<Record<string, number>> {
    return api.get("/exchange-rate/latest", { params: { base } }).then((r) => r.data);
  },
};
