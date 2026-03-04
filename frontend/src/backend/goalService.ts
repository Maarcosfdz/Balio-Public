import api from "./api";
import type {
  GoalAmountDto,
  GoalDto,
  GoalResponseDto,
  GoalSummaryDto,
  GoalUpdateDto,
} from "@/types";

export const goalService = {
  getAll(): Promise<GoalSummaryDto[]> {
    return api.get("/goal").then((r) => r.data);
  },

  getById(goalId: string): Promise<GoalResponseDto> {
    return api.get(`/goal/${goalId}`).then((r) => r.data);
  },

  create(data: GoalDto): Promise<GoalResponseDto> {
    return api.post("/goal", data).then((r) => r.data);
  },

  update(goalId: string, data: GoalUpdateDto): Promise<GoalResponseDto> {
    return api.put(`/goal/${goalId}`, data).then((r) => r.data);
  },

  remove(goalId: string): Promise<void> {
    return api.delete(`/goal/${goalId}`);
  },

  addAmount(goalId: string, data: GoalAmountDto): Promise<GoalResponseDto> {
    return api.post(`/goal/${goalId}/add`, data).then((r) => r.data);
  },

  withdrawAmount(goalId: string, data: GoalAmountDto): Promise<GoalResponseDto> {
    return api.post(`/goal/${goalId}/withdraw`, data).then((r) => r.data);
  },
};
