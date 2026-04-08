import api from "./api";
import type {
  BudgetDto,
  BudgetUpdateDto,
  BudgetSummaryDto,
  BudgetResponseDto,
  BudgetCategoryDto,
  BudgetCategoryUpdateDto,
} from "@/types";

export const budgetService = {
  getAll(): Promise<BudgetSummaryDto[]> {
    return api.get("/budget").then((r) => r.data);
  },

  getById(budgetId: string): Promise<BudgetResponseDto> {
    return api.get(`/budget/${budgetId}`).then((r) => r.data);
  },

  create(data: BudgetDto): Promise<BudgetResponseDto> {
    return api.post("/budget", data).then((r) => r.data);
  },

  update(budgetId: string, data: BudgetUpdateDto): Promise<BudgetResponseDto> {
    return api.put(`/budget/${budgetId}`, data).then((r) => r.data);
  },

  remove(budgetId: string): Promise<void> {
    return api.delete(`/budget/${budgetId}`);
  },

  // ── Budget categories ──

  createCategory(budgetId: string, data: BudgetCategoryDto): Promise<BudgetResponseDto> {
    return api.post(`/budget/${budgetId}/category`, data).then((r) => r.data);
  },

  updateCategory(
    budgetId: string,
    categoryId: string,
    data: BudgetCategoryUpdateDto,
  ): Promise<BudgetResponseDto> {
    return api.put(`/budget/${budgetId}/category/${categoryId}`, data).then((r) => r.data);
  },

  deleteCategory(budgetId: string, categoryId: string): Promise<void> {
    return api.delete(`/budget/${budgetId}/category/${categoryId}`);
  },

  // ── Transaction linking ──

  linkTransaction(budgetId: string, categoryId: string, transactionId: string): Promise<void> {
    return api.post(`/budget/${budgetId}/category/${categoryId}/link`, { transactionId });
  },

  unlinkTransaction(
    budgetId: string,
    categoryId: string,
    transactionId: string,
  ): Promise<void> {
    return api.delete(`/budget/${budgetId}/category/${categoryId}/link/${transactionId}`);
  },
};
