import api from "./api";
import type {
  AccountDto,
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

  remove(accountId: string): Promise<void> {
    return api.delete(`/account/${accountId}`);
  },

  setDefault(accountId: string): Promise<void> {
    return api.put(`/account/${accountId}/setDefault`);
  },

  clearDefault(): Promise<void> {
    return api.put("/account/clearDefault");
  },
};
