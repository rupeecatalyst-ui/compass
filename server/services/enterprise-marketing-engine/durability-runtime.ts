/**
 * CO-MARKETING-REDESIGN-002 — Production durability wiring.
 * Fail closed when Prisma mode is on but durable delegates are missing.
 */

import { prisma } from "@server/lib/prisma";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import {
  asMarketingDurabilityPrisma,
  configureMarketingDurabilityPrismaPorts,
  createPrismaMarketingDurabilityPorts,
  getConfiguredMarketingDurabilityPorts,
  marketingDurabilityUnavailable,
  resolveMarketingDurabilityPorts,
} from "@/lib/enterprise-marketing-engine/durability";

export function ensureProductionMarketingDurabilityPorts() {
  if (!isEnterprisePersistencePrisma()) {
    throw marketingDurabilityUnavailable("Production Marketing durability requires Prisma persistence mode");
  }
  const existing = getConfiguredMarketingDurabilityPorts();
  if (existing?.kind === "prisma") return existing;
  const surface = asMarketingDurabilityPrisma(prisma);
  if (!surface) {
    throw marketingDurabilityUnavailable(
      "Prisma Marketing durability models are not available on the client. Migration is not applied / generate was not run.",
    );
  }
  const ports = createPrismaMarketingDurabilityPorts(surface);
  configureMarketingDurabilityPrismaPorts(ports);
  return resolveMarketingDurabilityPorts();
}
