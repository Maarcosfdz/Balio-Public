import api from "./api";
import type {
  TransactionDto,
  TransactionFilters,
  TransactionResponseDto,
  TransactionSummaryDto,
} from "@/types";

export const transactionService = {
  getAll(filters?: TransactionFilters): Promise<TransactionSummaryDto[]> {
    return api.get("/transaction", { params: filters }).then((r) => r.data);
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
};
