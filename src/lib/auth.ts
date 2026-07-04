import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/api-client";
import type { AuthSession, User } from "@/types/auth";

const USER_KEY = "compass:user";

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
}

function setAuthCookie(name: string, value: string, maxAgeDays = 7): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeDays * 86400}; SameSite=Lax`;
}

function clearAuthCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function persistSession(session: AuthSession): void {
  setTokens(session.accessToken, session.refreshToken);
  setStoredUser(session.user);
  setAuthCookie("compass-access-token", session.accessToken);
  setAuthCookie("compass-refresh-token", session.refreshToken);
}

export function clearSession(): void {
  clearTokens();
  clearStoredUser();
  clearAuthCookie("compass-access-token");
  clearAuthCookie("compass-refresh-token");
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken() && getStoredUser());
}

export function getSession(): AuthSession | null {
  const user = getStoredUser();
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  if (!user || !accessToken || !refreshToken) return null;
  return { user, accessToken, refreshToken };
}
