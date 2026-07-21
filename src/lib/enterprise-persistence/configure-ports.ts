/**
 * CO-SPRINT-117 — Prisma persistence wiring for ECM ports.
 *
 * Architecture (ENTERPRISE_PERSISTENCE_MODE=prisma):
 *   UI → REST API → Service → Repository → Prisma → PostgreSQL
 *
 * Source of truth:
 * - PostgreSQL via Prisma-backed REST APIs is AUTHORITATIVE.
 * - In-memory ECM ports are a same-process cache/UI hydration layer only.
 * - Writes must go through REST (Service → Repository → Prisma), never invent
 *   durable state solely in memory while prisma mode is active.
 * - syncEcmPortsFromPrisma() refreshes the cache after API reads/mutations.
 *
 * Memory mode (local only): in-memory ports remain the working store; demo seeds may apply.
 */

import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { configureEcmPorts, getEcmPorts } from "@/lib/enterprise-contact-master/composition";
import { ecmContactRepository } from "@server/repositories/ecm/contact.repository";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";

let persistenceConfigured = false;

export function isEcmPrismaPersistenceActive(): boolean {
  return isEnterprisePersistencePrisma();
}

/** Call once on server boot / first API request when mode=prisma. */
export function configureEcmPersistencePorts(): void {
  if (persistenceConfigured) return;
  if (isEnterprisePersistencePrisma() && typeof window === "undefined") {
    // Ports remain the in-memory adapter; Prisma is authoritative via REST + syncEcmPortsFromPrisma.
    configureEcmPorts(getEcmPorts());
  }
  persistenceConfigured = true;
}

/** Hydrate sync in-memory contact ports from PostgreSQL (post-mutation / initial load). */
export async function syncEcmPortsFromPrisma(): Promise<number> {
  if (!isEnterprisePersistencePrisma()) return 0;
  configureEcmPersistencePorts();
  const organizationId = await resolvePilotOrganizationId();
  const result = await ecmContactRepository.query(organizationId, {
    page: 1,
    pageSize: 5000,
    status: "all",
    sortBy: "modifiedOn",
    sortDir: "desc",
  });
  getEcmPorts().contacts.replaceAll(result.items);
  return result.items.length;
}
