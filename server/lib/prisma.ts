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

type PrismaClientConstructor = new (
  options?: ConstructorParameters<typeof PrismaClient>[0],
) => PrismaClient;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  ppoBatPrismaCtor?: PrismaClientConstructor;
};

function batIsolationRequested(): boolean {
  return process.env.CATALYST_BAT_ISOLATED_PRISMA === "1";
}

function assertBatIsolationAllowed(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("CATALYST_BAT_ISOLATED_PRISMA is not allowed in production.");
  }
  if (process.env.VERCEL === "1") {
    throw new Error("CATALYST_BAT_ISOLATED_PRISMA is not allowed on Vercel/Hostinger production.");
  }
  const url = process.env.DATABASE_URL ?? "";
  if (url && !/127\.0\.0\.1|localhost/i.test(url)) {
    throw new Error("BAT isolated Prisma may only use a loopback DATABASE_URL.");
  }
}

/**
 * BAT-only: inject the isolated generated Prisma Client constructor.
 * Must run before the first query. Production never calls this.
 */
export function configureBatPrismaClient(ctor: PrismaClientConstructor): void {
  assertBatIsolationAllowed();
  if (typeof ctor !== "function") {
    throw new Error("configureBatPrismaClient requires a PrismaClient constructor.");
  }
  if (globalForPrisma.prisma) {
    throw new Error("configureBatPrismaClient must run before prisma is first used.");
  }
  globalForPrisma.ppoBatPrismaCtor = ctor;
}

function resolvePrismaClientCtor(): PrismaClientConstructor {
  if (globalForPrisma.ppoBatPrismaCtor) return globalForPrisma.ppoBatPrismaCtor;
  if (!batIsolationRequested()) return PrismaClient;
  assertBatIsolationAllowed();
  if (process.env.NEXT_RUNTIME || process.env.NEXT_PHASE) {
    return PrismaClient;
  }
  throw new Error(
    "CATALYST_BAT_ISOLATED_PRISMA=1 in Node requires configureBatPrismaClient() with the isolated constructor.",
  );
}

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

function createPrisma(): PrismaClient {
  const Client = resolvePrismaClientCtor();
  const runtimeDatabaseUrl = resolvePrismaRuntimeUrl(process.env.DATABASE_URL);
  return new Client({
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
}

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrisma();
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma() as unknown as Record<PropertyKey, unknown>;
    const value = client[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});

export function isDatabaseAvailable(): boolean {
  return Boolean(serverEnv.DATABASE_URL);
}

