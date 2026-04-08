import api from "./api";
import { normalizePageResponse } from "./pageUtils";
import type {
  CsvImportResultDto,
  CsvImportRuleDto,
  TransactionBatchRuleDto,
  TransactionDto,
  TransactionFilters,
  TransactionPage,
  TransactionResponseDto,
} from "@/types";

export const transactionService = {
  getAll(filters?: TransactionFilters, page = 0, size = 20): Promise<TransactionPage> {
    return api
      .get("/transaction", { params: { ...filters, page, size } })
      .then((r) => normalizePageResponse(r.data, page, size));
  },

  getById(transactionId: string): Promise<TransactionResponseDto> {
    return api.get(`/transaction/${transactionId}`).then((r) => r.data);
  },

  createExpense(data: TransactionDto): Promise<TransactionResponseDto> {
    return api.post("/transaction/expense", data).then((r) => r.data);
  },

  createIncome(data: TransactionDto): Promise<TransactionResponseDto> {
    return api.post("/transaction/income", data).then((r) => r.data);
  },

  update(transactionId: string, data: TransactionDto): Promise<TransactionResponseDto> {
    return api.put(`/transaction/${transactionId}`, data).then((r) => r.data);
  },

  remove(transactionId: string, revertBalance = true): Promise<void> {
    return api.delete(`/transaction/${transactionId}`, {
      params: { revertBalance },
    });
  },

  exportCsv(accountId?: string): Promise<Blob> {
    return api
      .get("/transaction/export/csv", {
        params: accountId ? { accountId } : {},
        responseType: "blob",
      })
      .then((r) => r.data);
  },

  applyBatchRules(dto: TransactionBatchRuleDto): Promise<{ updated: number }> {
    return api.post("/transaction/apply-rules", dto).then((r) => r.data);
  },

  importCsv(
    file: File,
    accountId?: string,
    rules?: CsvImportRuleDto[],
  ): Promise<CsvImportResultDto> {
    const form = new FormData();
    form.append("file", file);
    if (accountId) form.append("accountId", accountId);
    if (rules && rules.length > 0) form.append("rules", JSON.stringify(rules));
    return api
      .post("/transaction/import/csv", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};
