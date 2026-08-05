/** CO-WP-001 / CO-WP-006 — immutable WPT###### allocator with uniqueness retries. */

import { prisma } from "@server/lib/prisma";
import { WEALTH_PARTNER_CODE_PREFIX } from "@/constants/enterprise-wealth-partner-registry";

const MAX_CODE_ATTEMPTS = 12;

function formatWealthPartnerCode(sequence: number): string {
  return `${WEALTH_PARTNER_CODE_PREFIX}${String(Math.max(1, sequence)).padStart(6, "0")}`;
}

/**
 * Peek the next sequential candidate from the highest existing WPT###### (including soft-deleted).
 * Does not claim the code — callers must verify uniqueness / retry on collision.
 */
export async function allocateNextWealthPartnerCode(
  organizationId: string,
  offset = 0,
): Promise<string> {
  const latest = await prisma.enterpriseWealthPartner.findFirst({
    where: {
      organizationId,
      code: { startsWith: WEALTH_PARTNER_CODE_PREFIX },
    },
    orderBy: { code: "desc" },
    select: { code: true },
  });

  let next = 1;
  if (latest?.code) {
    const numeric = Number(latest.code.replace(/\D/g, ""));
    if (Number.isFinite(numeric) && numeric >= 0) next = numeric + 1;
  }
  return formatWealthPartnerCode(next + offset);
}

/**
 * Guaranteed-unique allocator: sequential candidate → existence check → retry.
 * Never renumbers existing partners. Soft-deleted codes remain reserved.
 */
export async function allocateUniqueWealthPartnerCode(
  organizationId: string,
  maxAttempts = MAX_CODE_ATTEMPTS,
): Promise<{ code: string; collisionRetries: number }> {
  let collisionRetries = 0;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = await allocateNextWealthPartnerCode(organizationId, attempt);
    const exists = await prisma.enterpriseWealthPartner.findFirst({
      where: { organizationId, code: candidate },
      select: { id: true },
    });
    if (!exists) {
      return { code: candidate, collisionRetries };
    }
    collisionRetries += 1;
  }
  throw new Error("Unable to generate a unique Wealth Partner code.");
}

export async function allocateNextCommissionCode(
  organizationId: string,
  partnerCode: string,
): Promise<string> {
  const prefix = `${partnerCode}-COM`;
  const latest = await prisma.enterpriseWealthPartnerCommission.findFirst({
    where: { organizationId, code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  let next = 1;
  if (latest?.code) {
    const parts = latest.code.split("-");
    const n = Number(parts[parts.length - 1]);
    if (Number.isFinite(n) && n >= 0) next = n + 1;
  }
  return `${prefix}-${String(next).padStart(3, "0")}`;
}
