import { PrismaClient } from "@prisma/client";
import { serverEnv } from "../config/env";

/**
 * CO-ARCH-009 — Prisma is server-only. Shared with Express (`tsx`), so use a
 * runtime guard rather than the `server-only` package.
 */
if (typeof window !== "undefined") {
  throw new Error(
    "[CO-ARCH-009] server/lib/prisma.ts is server-only and must not run in the browser.",
  );
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * Prisma Client uses DATABASE_URL (schema `url`). DIRECT_URL is migrations only.
 *
 * Supabase transaction pooler (host contains `pooler` and/or port 6543) is
 * PgBouncer/Supavisor transaction mode. Prisma's query engine still emits
 * named prepared statements (`s4`, …) unless `pgbouncer=true` is on the URL,
 * which yields Postgres 42P05 "prepared statement already exists".
 *
 * Do not rewrite Hostinger env values; append the Prisma-supported flag when
 * the runtime URL is a transaction pooler and the flag is missing.
 */
export function resolvePrismaRuntimeUrl(raw: string | undefined): string | undefined {
  const url = raw?.trim();
  if (!url) return raw;
  const isTransactionPooler =
    /:6543(?:\/|\?|$)/.test(url) || /pooler\.supabase\.com/i.test(url);
  if (!isTransactionPooler) return url;
  if (/[?&]pgbouncer=true(?:&|$)/i.test(url)) return url;
  return url.includes("?") ? `${url}&pgbouncer=true` : `${url}?pgbouncer=true`;
}

const runtimeDatabaseUrl = resolvePrismaRuntimeUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: serverEnv.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(runtimeDatabaseUrl ? { datasources: { db: { url: runtimeDatabaseUrl } } } : {}),
    /**
     * CO-QA-005 — Align interactive transaction maxWait with Postgres pool_timeout
     * (Prisma default maxWait=2s < pool_timeout=10s → false "Unable to start a transaction").
     * Root cause is connection checkout under Supabase pooler :6543, not slow SQL.
     * Do not treat this as a substitute for reducing sequential $transaction calls.
     */
    transactionOptions: {
      maxWait: 10_000,
      timeout: 20_000,
    },
  });

if (serverEnv.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function isDatabaseAvailable(): boolean {
  return Boolean(serverEnv.DATABASE_URL);
}
