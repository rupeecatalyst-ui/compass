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
let refreshSubscribers: Array<(token: string | null) => void> = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

/** CO-QA-003 — Always flush waiters (including refresh failure) so fetch never hangs forever. */
function flushTokenRefreshWaiters(token: string | null = null) {
  const waiting = refreshSubscribers;
  refreshSubscribers = [];
  waiting.forEach((cb) => cb(token));
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

function isAuthoritativeAuthRejection(status: number | undefined): boolean {
  return status === 401 || status === 403;
}

function redirectToLoginIfNeeded() {
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}

function invalidateBrowserSession() {
  clearTokens();
  redirectToLoginIfNeeded();
}

async function readJsonBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(`Empty response body (${res.status})`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Response was not valid JSON (${res.status}, ${text.length} bytes)`);
  }
}

function refreshRejectedAuthoritatively(status: number | undefined, body: ApiResponse<unknown> | undefined): boolean {
  if (isAuthoritativeAuthRejection(status)) return true;
  const code = body?.error?.code;
  return (
    code === "UNAUTHORIZED" ||
    code === "TOKEN_EXPIRED" ||
    code === "INVALID_TOKEN" ||
    code === "INVALID_REFRESH"
  );
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
    const tokenAfterWait = await new Promise<string | null>((resolve) => {
      subscribeTokenRefresh((next) => resolve(next));
    });
    return doFetch(tokenAfterWait ?? getAccessToken());
  }

  isRefreshing = true;
  try {
    const refreshRes = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ refreshToken }),
    });
    const refreshBody = (await readJsonBody(refreshRes)) as ApiResponse<{
      accessToken: string;
      refreshToken: string;
    }>;
    if (refreshRes.ok && refreshBody.success && refreshBody.data) {
      setTokens(refreshBody.data.accessToken, refreshBody.data.refreshToken);
      onTokenRefreshed(refreshBody.data.accessToken);
      return doFetch(refreshBody.data.accessToken);
    }
    flushTokenRefreshWaiters(null);
    if (refreshRejectedAuthoritatively(refreshRes.status, refreshBody)) {
      invalidateBrowserSession();
    }
  } catch {
    flushTokenRefreshWaiters(null);
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
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token: string | null) => {
            if (!token) {
              reject(error);
              return;
            }
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
          `${getApiBaseUrl()}/api/auth/refresh`,
          { refreshToken },
          { withCredentials: true },
        );
        const data = refreshResponse.data;

        if (data.success && data.data) {
          setTokens(data.data.accessToken, data.data.refreshToken);
          onTokenRefreshed(data.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return apiClient(originalRequest);
        }
        flushTokenRefreshWaiters(null);
        if (refreshRejectedAuthoritatively(refreshResponse.status, data)) {
          invalidateBrowserSession();
        }
      } catch (refreshErr) {
        flushTokenRefreshWaiters(null);
        const refreshStatus = axios.isAxiosError(refreshErr) ? refreshErr.response?.status : undefined;
        const refreshBody = axios.isAxiosError(refreshErr)
          ? (refreshErr.response?.data as ApiResponse<unknown> | undefined)
          : undefined;
        if (refreshRejectedAuthoritatively(refreshStatus, refreshBody)) {
          invalidateBrowserSession();
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
