import { env } from "@/config/env";

export const siteConfig = {
  name: env.NEXT_PUBLIC_APP_NAME,
  description: "Catalyst One — Enterprise Operating System by Rupee Catalyst",
  url: env.NEXT_PUBLIC_APP_URL,
  company: "Rupee Catalyst",
  /** Prefer build-baked NEXT_PUBLIC_APP_VERSION (CO-OPS-001); falls back to package baseline. */
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.9.0-internal",
} as const;
