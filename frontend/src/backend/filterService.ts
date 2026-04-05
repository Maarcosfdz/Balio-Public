import api from "./api";
import { normalizePageResponse } from "./pageUtils";
import type {
  FilterDto,
  FilterPage,
  FilterResponseDto,
  FilterSummaryDto,
  FilterUpdateDto,
  TransactionSummaryDto,
} from "@/types";

export const filterService = {
  getAll(): Promise<FilterSummaryDto[]> {
    return api.get("/filter").then((r) => r.data);
  },

  getPaged(page: number, size: number): Promise<FilterPage> {
    return api
      .get("/filter/paged", { params: { page, size } })
      .then((r) => normalizePageResponse(r.data, page, size));
  },

  getById(filterId: string): Promise<FilterResponseDto> {
    return api.get(`/filter/${filterId}`).then((r) => r.data);
  },

  create(data: FilterDto): Promise<FilterResponseDto> {
    return api.post("/filter", data).then((r) => r.data);
  },

  update(filterId: string, data: FilterUpdateDto): Promise<FilterResponseDto> {
    return api.put(`/filter/${filterId}`, data).then((r) => r.data);
  },

  remove(filterId: string): Promise<void> {
    return api.delete(`/filter/${filterId}`);
  },

  apply(filterId: string): Promise<TransactionSummaryDto[]> {
    return api.post(`/filter/${filterId}/apply`).then((r) => r.data);
  },
};
