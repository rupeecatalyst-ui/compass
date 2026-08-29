import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";

let cachedCompassE2eOrgId: string | null = null;

/**
 * COMPASS gateway organization resolution.
 * When COMPASS_E2E_ORG_SLUG is set (local/staging E2E only), resolve that slug explicitly.
 * Otherwise use the canonical pilot organization — no production fallback to the E2E org.
 */
export async function resolveCompassGatewayOrganizationId(): Promise<string> {
  const e2eSlug = process.env.COMPASS_E2E_ORG_SLUG?.trim();
  if (!e2eSlug) {
    return resolvePilotOrganizationId();
  }

  if (cachedCompassE2eOrgId) return cachedCompassE2eOrgId;

  const org = await prisma.organization.findUnique({ where: { slug: e2eSlug } });
  if (!org) {
    throw new Error(
      `COMPASS E2E organization "${e2eSlug}" not found. Seed the isolated test database before running E2E.`,
    );
  }

  cachedCompassE2eOrgId = org.id;
  return org.id;
}

export function clearCompassGatewayOrganizationCache(): void {
  cachedCompassE2eOrgId = null;
}
