import api from "./api";
import type {
  AuthenticatedUserDto,
  ChangePasswordParamsDto,
  LoginParamsDto,
  UserDto,
} from "@/types";

export const authService = {
  signUp(data: UserDto): Promise<AuthenticatedUserDto> {
    return api.post("/user/signUp", data).then((r) => r.data);
  },

  login(data: LoginParamsDto): Promise<AuthenticatedUserDto> {
    return api.post("/user/login", data).then((r) => r.data);
  },

  refreshToken(refreshToken: string): Promise<AuthenticatedUserDto> {
    return api.post("/user/refreshToken", { refreshToken }).then((r) => r.data);
  },

  logout(): Promise<void> {
    return api.post("/user/logout");
  },

  updateProfile(userId: string, data: Pick<UserDto, "nickname" | "email">): Promise<UserDto> {
    return api.put(`/user/${userId}`, data).then((r) => r.data);
  },

  changePassword(userId: string, data: ChangePasswordParamsDto): Promise<void> {
    return api.post(`/user/${userId}/changePassword`, data);
  },

  updatePreferredCurrency(userId: string, preferredCurrency: string): Promise<void> {
    return api.put(`/user/${userId}/preferredCurrency`, { preferredCurrency });
  },
};
