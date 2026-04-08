import api from "./api";
import type {
  AccountDto,
  AccountDeleteOptions,
  AccountResponseDto,
  AccountSummaryDto,
} from "@/types";

export const accountService = {
  getAll(): Promise<AccountSummaryDto[]> {
    return api.get("/account").then((r) => r.data);
  },

  getById(accountId: string): Promise<AccountResponseDto> {
    return api.get(`/account/${accountId}`).then((r) => r.data);
  },

  create(data: AccountDto): Promise<AccountResponseDto> {
    return api.post("/account", data).then((r) => r.data);
  },

  update(accountId: string, data: AccountDto): Promise<AccountResponseDto> {
    return api.put(`/account/${accountId}`, data).then((r) => r.data);
  },

  remove(accountId: string, options?: AccountDeleteOptions): Promise<void> {
    return api.delete(`/account/${accountId}`, {
      params: {
        deleteTransactions: options?.deleteTransactions ?? false,
      },
    });
  },

  setDefault(accountId: string): Promise<void> {
    return api.put(`/account/${accountId}/setDefault`);
  },

  clearDefault(): Promise<void> {
    return api.put("/account/clearDefault");
  },

  adjustBalance(accountId: string, balance: number): Promise<AccountResponseDto> {
    return api.patch(`/account/${accountId}/balance`, { balance }).then((r) => r.data);
  },
};
