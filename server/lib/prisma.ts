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

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: serverEnv.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (serverEnv.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function isDatabaseAvailable(): boolean {
  return Boolean(serverEnv.DATABASE_URL);
}
