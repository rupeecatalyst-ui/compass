import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("COMPASS"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  /**
   * Empty = same-origin /api (App Router). Set explicitly to proxy to Express
   * (e.g. http://localhost:4000 for local dual-server mode).
   */
  NEXT_PUBLIC_API_URL: z
    .union([z.string().url(), z.literal("")])
    .optional()
    .transform((v) => v ?? ""),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

/** Resolved API base URL for axios — empty uses same-origin /api */
export function getApiBaseUrl(): string {
  if (env.NEXT_PUBLIC_API_URL) return env.NEXT_PUBLIC_API_URL;
  return "";
}
