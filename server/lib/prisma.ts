import { PrismaClient } from "@prisma/client";
import { serverEnv } from "../config/env";

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
