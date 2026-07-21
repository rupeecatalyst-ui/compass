import { apiRequest } from "@/lib/api-client";
import { unwrapResponse } from "@/lib/response-handler";
import type {
  AuthSession,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginCredentials,
  ResetPasswordPayload,
  User,
} from "@/types/auth";

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const response = await apiRequest<AuthSession>({
      method: "POST",
      url: "/api/auth/login",
      data: credentials,
      skipAuth: true,
    });
    return unwrapResponse(response);
  },

  async logout(): Promise<void> {
    await apiRequest({
      method: "POST",
      url: "/api/auth/logout",
    });
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<{ message: string }> {
    const response = await apiRequest<{ message: string }>({
      method: "POST",
      url: "/api/auth/forgot-password",
      data: payload,
      skipAuth: true,
    });
    return unwrapResponse(response);
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
    const response = await apiRequest<{ message: string }>({
      method: "POST",
      url: "/api/auth/reset-password",
      data: payload,
      skipAuth: true,
    });
    return unwrapResponse(response);
  },

  async getMe(): Promise<User> {
    const response = await apiRequest<User>({
      method: "GET",
      url: "/api/auth/me",
    });
    return unwrapResponse(response);
  },

  async changePassword(payload: ChangePasswordPayload): Promise<{ user: User; message: string }> {
    const response = await apiRequest<{ user: User; message: string }>({
      method: "POST",
      url: "/api/auth/change-password",
      data: payload,
    });
    return unwrapResponse(response);
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await apiRequest<{ accessToken: string; refreshToken: string }>({
      method: "POST",
      url: "/api/auth/refresh",
      data: { refreshToken },
      skipAuth: true,
    });
    return unwrapResponse(response);
  },
};
