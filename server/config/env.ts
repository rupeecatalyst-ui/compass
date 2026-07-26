import { z } from "zod";

/**
 * CO-STAB-001 — Fail-closed server environment.
 * JWT secrets have no insecure defaults. Validation runs on first access
 * (not at module import) so `next build` can collect pages; authentication
 * still refuses to initialise with missing/placeholder secrets.
 *
 * CO-ARCH-009 — Must never evaluate in the browser. Shared with Express (`tsx`)
 * so we use a runtime guard instead of the `server-only` package (which throws
 * under plain Node). Next client isolation is enforced by the persistence
 * barrel split + `server-only` on configure-ports / server entry.
 */

if (typeof window !== "undefined") {
  throw new Error(
    "[CO-ARCH-009] server/config/env.ts is server-only and must not run in the browser.",
  );
}

const INSECURE_JWT_PLACEHOLDERS = new Set([
  "",
  "dev-secret-change-in-production",
  "dev-refresh-secret-change-in-production",
  "change-me-to-a-long-random-secret-in-production",
  "change-me-to-another-long-random-secret",
  "secret",
  "changeme",
]);

function requireSecureSecret(name: string, value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed.length < 32) {
    throw new Error(
      `[CO-STAB-001] ${name} is required and must be at least 32 characters. ` +
        `Set it in the environment (or .env / Vercel). Authentication will not start.`,
    );
  }
  if (INSECURE_JWT_PLACEHOLDERS.has(trimmed)) {
    throw new Error(
      `[CO-STAB-001] ${name} uses a known insecure placeholder. ` +
        `Replace it with a long random production secret before starting the application.`,
    );
  }
  return trimmed;
}

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  DEMO_AUTH_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  DEMO_AUTH_EMAIL: z.string().email().optional(),
  DEMO_AUTH_PASSWORD: z.string().optional(),
});

export type ServerEnv = {
  PORT: number;
  NODE_ENV: "development" | "production" | "test";
  DATABASE_URL?: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  CORS_ORIGIN: string;
  DEMO_AUTH_ENABLED: boolean;
  DEMO_AUTH_EMAIL?: string;
  DEMO_AUTH_PASSWORD?: string;
};

let cached: ServerEnv | null = null;

function loadServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`[CO-STAB-001] Invalid server environment: ${detail}`);
  }

  const jwtSecret = requireSecureSecret("JWT_SECRET", parsed.data.JWT_SECRET);
  const jwtRefreshSecret = requireSecureSecret(
    "JWT_REFRESH_SECRET",
    parsed.data.JWT_REFRESH_SECRET,
  );

  if (jwtSecret === jwtRefreshSecret) {
    throw new Error(
      "[CO-STAB-001] JWT_SECRET and JWT_REFRESH_SECRET must be different values.",
    );
  }

  cached = {
    ...parsed.data,
    JWT_SECRET: jwtSecret,
    JWT_REFRESH_SECRET: jwtRefreshSecret,
  };
  return cached;
}

/**
 * Lazy proxy — first property read validates secrets (fail-closed).
 * Avoids aborting `next build` page collection before runtime auth use.
 */
export const serverEnv: ServerEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: keyof ServerEnv) {
    return loadServerEnv()[prop];
  },
});

export const isDev = process.env.NODE_ENV !== "production";
