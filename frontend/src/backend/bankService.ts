import api from "./api";
import type {
  BankConnectionDto,
  BankRuleDto,
  BankRuleResponseDto,
  BankSyncResultDto,
} from "@/types";

export interface BankInstitution {
  name: string;
  country: string;
  logo: string;
}

export interface BankSyncOptions {
  ignoreSyncLimit?: boolean;
  lookBackDays?: number;
  syncDeletedTransactions?: boolean;
}

export const bankService = {
  initConnection(accountId: string): Promise<{ authUrl: string }> {
    return api.get(`/bank/connect/${accountId}`).then((r) => r.data);
  },

  getStatus(accountId: string): Promise<BankConnectionDto> {
    return api.get(`/bank/accounts/${accountId}/status`).then((r) => r.data);
  },

  sync(accountId: string, lookBackDays = 365, ignoreSyncLimit = false, syncDeletedTransactions = false): Promise<BankSyncResultDto> {
    return api
      .post(`/bank/accounts/${accountId}/sync`, null, { params: { lookBackDays, ignoreSyncLimit, syncDeletedTransactions } })
      .then((r) => r.data);
  },

  syncStale(minutes = 15): Promise<BankSyncResultDto> {
    return api.post(`/bank/sync-stale`, null, { params: { minutes } }).then((r) => r.data);
  },

  syncAll(options?: BankSyncOptions): Promise<BankSyncResultDto> {
    const lookBackDays = options?.lookBackDays ?? 365;
    const ignoreSyncLimit = options?.ignoreSyncLimit ?? false;
    const syncDeletedTransactions = options?.syncDeletedTransactions ?? false;
    return api.post(`/bank/sync-all`, null, { params: { lookBackDays, ignoreSyncLimit, syncDeletedTransactions } }).then((r) => r.data);
  },

  unlink(accountId: string): Promise<void> {
    return api.delete(`/bank/accounts/${accountId}/link`);
  },

  // ── Enable Banking ─────────────────────────────────────────
  listAspsps(country = "ES"): Promise<BankInstitution[]> {
    return api
      .get(`/bank/enablebanking/aspsps`, { params: { country } })
      // Enable Banking returns { aspsps: [...] }; fallback handles flat arrays too
      .then((r) => r.data?.aspsps ?? (Array.isArray(r.data) ? r.data : []));
  },

  initEnableBankingConnection(
    accountId: string,
    aspspName: string,
    aspspCountry = "ES",
  ): Promise<{ authUrl: string }> {
    return api
      .get(`/bank/enablebanking/connect/${accountId}`, {
        params: { aspspName, aspspCountry },
      })
      .then((r) => r.data);
  },

  listRules(accountId: string): Promise<BankRuleResponseDto[]> {
    return api.get(`/bank/accounts/${accountId}/rules`).then((r) => r.data);
  },

  createRule(accountId: string, data: BankRuleDto): Promise<BankRuleResponseDto> {
    return api.post(`/bank/accounts/${accountId}/rules`, data).then((r) => r.data);
  },

  updateRule(accountId: string, ruleId: string, data: BankRuleDto): Promise<BankRuleResponseDto> {
    return api.put(`/bank/accounts/${accountId}/rules/${ruleId}`, data).then((r) => r.data);
  },

  deleteRule(accountId: string, ruleId: string): Promise<void> {
    return api.delete(`/bank/accounts/${accountId}/rules/${ruleId}`);
  },
};
