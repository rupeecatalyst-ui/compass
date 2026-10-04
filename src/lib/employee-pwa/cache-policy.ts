/**
 * CO-C1-EMPLOYEE-PWA-001 — Service worker cache allowlist.
 * Shell and static icons only. Never document binaries, OTPs, tokens,
 * customer payloads, protected reports, or unrestricted API responses.
 */

import {
  EMPLOYEE_PWA_APPLE_TOUCH_ICON,
  EMPLOYEE_PWA_ICON_192,
  EMPLOYEE_PWA_ICON_512,
  EMPLOYEE_PWA_MANIFEST_PATH,
  EMPLOYEE_PWA_OFFLINE_PATH,
} from "@/constants/employee-pwa";

export const EMPLOYEE_PWA_SHELL_CACHE_URLS = [
  EMPLOYEE_PWA_OFFLINE_PATH,
  EMPLOYEE_PWA_MANIFEST_PATH,
  EMPLOYEE_PWA_ICON_192,
  EMPLOYEE_PWA_ICON_512,
  EMPLOYEE_PWA_APPLE_TOUCH_ICON,
] as const;

export const EMPLOYEE_PWA_NEVER_CACHE_PATH_PREFIXES = [
  "/api/",
  "/document-workspace",
  "/login",
] as const;

export function employeePwaMayCacheRequest(url: string): boolean {
  try {
    const parsed = new URL(url, "https://catalyst-one.local");
    if (EMPLOYEE_PWA_NEVER_CACHE_PATH_PREFIXES.some((prefix) => parsed.pathname.startsWith(prefix))) {
      return false;
    }
    return (EMPLOYEE_PWA_SHELL_CACHE_URLS as readonly string[]).includes(parsed.pathname);
  } catch {
    return false;
  }
}

export function employeePwaIsSensitiveApiPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.includes("otp") ||
    pathname.includes("token") ||
    pathname.includes("binary")
  );
}
