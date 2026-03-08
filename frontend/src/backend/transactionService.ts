import api from "./api";
import type {
  TransactionDto,
  TransactionFilters,
  TransactionPage,
  TransactionResponseDto,
} from "@/types";

export const transactionService = {
  getAll(filters?: TransactionFilters, page = 0, size = 20): Promise<TransactionPage> {
    return api.get("/transaction", { params: { ...filters, page, size } }).then((r) => r.data);
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
