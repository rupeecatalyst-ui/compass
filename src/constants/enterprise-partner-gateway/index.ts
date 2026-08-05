/**
 * CO-WP-102 — Partner API Gateway constants.
 */
export const CO_WP_102_VERSION = "CO-WP-102" as const;

export const PARTNER_API_PREFIX = "/api/partner" as const;

/** Forbidden employee/admin surfaces for Wealth Partner App clients. */
export const PARTNER_FORBIDDEN_API_PREFIXES = [
  "/api/admin",
  "/api/wealth-partner-registry",
  "/api/employee",
] as const;

export const PARTNER_DEFAULT_ALLOWED_ORIGINS = [
  "https://wealth-partner-app.vercel.app",
  "https://wealth-partner-app-rupee-catalyst.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
] as const;
