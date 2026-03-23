import api from "./api";
import type {
  ScheduledTransactionDto,
  ScheduledTransactionUpdateDto,
  ScheduledTransactionResponseDto,
  ScheduledTransactionPage,
} from "@/types";

export const scheduledTransactionService = {
  getAll(page = 0, size = 20): Promise<ScheduledTransactionPage> {
    return api.get("/scheduled-transaction", { params: { page, size } }).then((r) => r.data);
  },

  getById(id: string): Promise<ScheduledTransactionResponseDto> {
    return api.get(`/scheduled-transaction/${id}`).then((r) => r.data);
  },

  create(data: ScheduledTransactionDto): Promise<ScheduledTransactionResponseDto> {
    return api.post("/scheduled-transaction", data).then((r) => r.data);
  },

  update(id: string, data: ScheduledTransactionUpdateDto): Promise<ScheduledTransactionResponseDto> {
    return api.put(`/scheduled-transaction/${id}`, data).then((r) => r.data);
  },

  remove(id: string): Promise<void> {
    return api.delete(`/scheduled-transaction/${id}`);
  },

  firePending(): Promise<{ created: number }> {
    return api.post("/scheduled-transaction/fire").then((r) => r.data);
  },
};
