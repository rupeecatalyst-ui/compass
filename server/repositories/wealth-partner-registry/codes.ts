/** CO-WP-001 — immutable WPT###### allocator. */

import { prisma } from "@server/lib/prisma";
import { WEALTH_PARTNER_CODE_PREFIX } from "@/constants/enterprise-wealth-partner-registry";

export async function allocateNextWealthPartnerCode(
  organizationId: string,
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
  return `${WEALTH_PARTNER_CODE_PREFIX}${String(next).padStart(6, "0")}`;
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
