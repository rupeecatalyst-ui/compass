import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { getApiBaseUrl } from "@/config/env";
import type { ApiResponse } from "@/types/api";

const TOKEN_KEY = "compass:access-token";
const REFRESH_KEY = "compass:refresh-token";

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  // Keep edge middleware cookie aligned with Bearer token (Move to Deal navigation).
  document.cookie = `compass-access-token=${accessToken}; path=/; max-age=${7 * 86400}; SameSite=Lax`;
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  document.cookie = "compass-access-token=; path=/; max-age=0; SameSite=Lax";
}

/**
 * Browser fetch with Bearer auth + one refresh retry (same contract as axios interceptor).
 * Used by Enterprise Deal / Opportunity / ECM / registry API clients.
 */
export async function authenticatedJsonFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const doFetch = (token: string | null) => {
    const headers = new Headers(init?.headers ?? undefined);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    // Always win over any stale Authorization on retry.
    if (token) headers.set("Authorization", `Bearer ${token}`);
    else headers.delete("Authorization");
    return fetch(url, {
      ...init,
      headers,
    });
  };

  const token = getAccessToken();
  const res = await doFetch(token);
  if (res.status !== 401) return res;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    return res;
  }

  if (isRefreshing) {
    await new Promise<void>((resolve) => {
      subscribeTokenRefresh(() => resolve());
    });
    return doFetch(getAccessToken());
  }

  isRefreshing = true;
  try {
    const refreshRes = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ refreshToken }),
    });
    const refreshBody = (await refreshRes.json().catch(() => ({}))) as ApiResponse<{
      accessToken: string;
      refreshToken: string;
    }>;
    if (refreshRes.ok && refreshBody.success && refreshBody.data) {
      setTokens(refreshBody.data.accessToken, refreshBody.data.refreshToken);
      onTokenRefreshed(refreshBody.data.accessToken);
      return doFetch(refreshBody.data.accessToken);
    }
    clearTokens();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  } catch {
    clearTokens();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  } finally {
    isRefreshing = false;
  }

  return res;
}

const apiClient: AxiosInstance = axios.create({
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.baseURL = getApiBaseUrl();
    const skipAuth = (config as InternalAxiosRequestConfig & { skipAuth?: boolean }).skipAuth;
    if (!skipAuth) {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
          `${getApiBaseUrl()}/api/auth/refresh`,
          { refreshToken },
          { withCredentials: true },
        );

        if (data.success && data.data) {
          setTokens(data.data.accessToken, data.data.refreshToken);
          onTokenRefreshed(data.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return apiClient(originalRequest);
        }
      } catch {
        clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export async function apiRequest<T>(
  config: AxiosRequestConfig & { skipAuth?: boolean },
): Promise<ApiResponse<T>> {
  const response = await apiClient.request<ApiResponse<T>>(config);
  return response.data;
}

export { apiClient };
