import api from "./api";
import { normalizePageResponse } from "./pageUtils";
import type {
  CategoryDto,
  CategoryPage,
  CategoryResponseDto,
  CategorySummaryDto,
} from "@/types";

export const categoryService = {
  getAll(): Promise<CategorySummaryDto[]> {
    return api.get("/category").then((r) => r.data);
  },

  getPaged(type: string, page: number, size: number): Promise<CategoryPage> {
    return api
      .get("/category/paged", { params: { type, page, size } })
      .then((r) => normalizePageResponse(r.data, page, size));
  },

  getById(categoryId: string): Promise<CategoryResponseDto> {
    return api.get(`/category/${categoryId}`).then((r) => r.data);
  },

  create(data: CategoryDto): Promise<CategoryResponseDto> {
    return api.post("/category/create", data).then((r) => r.data);
  },

  update(categoryId: string, data: CategoryDto): Promise<CategoryResponseDto> {
    return api.put(`/category/${categoryId}`, data).then((r) => r.data);
  },

  remove(categoryId: string): Promise<void> {
    return api.delete(`/category/${categoryId}`);
  },
};
