import { prisma } from "@server/lib/prisma";
import { ENTERPRISE_PERSISTENCE_ORG_SLUG } from "@/constants/enterprise-persistence";

let cachedOrgId: string | null = null;

export async function resolvePilotOrganizationId(): Promise<string> {
  if (cachedOrgId) {
    const cached = await prisma.organization.findUnique({ where: { id: cachedOrgId }, select: { id: true, slug: true, isActive: true } });
    if (!cached?.isActive || cached.slug !== ENTERPRISE_PERSISTENCE_ORG_SLUG) throw new Error("Configured organization is unavailable");
    return cached.id;
  }
  const org = await prisma.organization.findUnique({
    where: { slug: ENTERPRISE_PERSISTENCE_ORG_SLUG },
  });
  if (!org || !org.isActive) {
    throw new Error(
      `Pilot organization "${ENTERPRISE_PERSISTENCE_ORG_SLUG}" not found. Run prisma db seed.`,
    );
  }
  cachedOrgId = org.id;
  return org.id;
}

export function clearPilotOrganizationCache(): void {
  cachedOrgId = null;
}
