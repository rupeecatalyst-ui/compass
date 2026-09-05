/**
 * CO-MARKETING-REDESIGN-002 — Durability composition.
 * Memory is never the implicit production adapter.
 */

import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import type { MarketingDurabilityPorts } from "@/types/enterprise-marketing-durability-ports";
import { marketingDurabilityUnavailable, marketingMemoryFallbackForbidden } from "./errors";
import { MARKETING_MEMORY_FIXTURE_KIND } from "./repositories/memory";

let configuredPorts: MarketingDurabilityPorts | null = null;
let testFixtureExplicit = false;

export function configureMarketingDurabilityTestFixture(ports: MarketingDurabilityPorts): void {
  if (ports.kind !== MARKETING_MEMORY_FIXTURE_KIND && ports.kind !== "prisma") {
    throw marketingDurabilityUnavailable("Unknown durability adapter kind");
  }
  configuredPorts = ports;
  testFixtureExplicit = ports.kind === MARKETING_MEMORY_FIXTURE_KIND;
}

export function configureMarketingDurabilityPrismaPorts(ports: MarketingDurabilityPorts): void {
  if (ports.kind !== "prisma") {
    throw marketingMemoryFallbackForbidden();
  }
  configuredPorts = ports;
  testFixtureExplicit = false;
}

export function resetMarketingDurabilityComposition(): void {
  configuredPorts = null;
  testFixtureExplicit = false;
}

export function isMarketingDurabilityTestFixtureActive(): boolean {
  return testFixtureExplicit && configuredPorts?.kind === MARKETING_MEMORY_FIXTURE_KIND;
}

export function getConfiguredMarketingDurabilityPorts(): MarketingDurabilityPorts | null {
  return configuredPorts;
}

/**
 * Production / runtime resolver. Never returns memory unless a test fixture was
 * configured explicitly via configureMarketingDurabilityTestFixture.
 */
export function resolveMarketingDurabilityPorts(): MarketingDurabilityPorts {
  if (configuredPorts) {
    if (configuredPorts.kind === MARKETING_MEMORY_FIXTURE_KIND && !testFixtureExplicit) {
      throw marketingMemoryFallbackForbidden();
    }
    return configuredPorts;
  }
  if (isEnterprisePersistencePrisma()) {
    throw marketingDurabilityUnavailable(
      "Prisma Marketing durability ports are not configured. Refusing in-memory fallback.",
    );
  }
  throw marketingDurabilityUnavailable(
    "Marketing durable persistence is unavailable. In-memory adapters are test fixtures only.",
  );
}
