/**
 * CO-ARCH-003 — Opportunity Number allocator (OPP-YYYY-######).
 */
import { prisma } from "@server/lib/prisma";

export function formatOpportunityNumber(year: number, sequence: number): string {
  return `OPP-${year}-${String(sequence).padStart(6, "0")}`;
}

/** Allocates the next Opportunity Number for an organization (UTC calendar year). */
export async function allocateOpportunityNumber(organizationId: string): Promise<string> {
  const year = new Date().getUTCFullYear();

  const issued = await prisma.$transaction(async (tx) => {
    const existing = await tx.enterpriseOpportunityNumberSequence.findUnique({
      where: { organizationId_year: { organizationId, year } },
    });

    if (!existing) {
      await tx.enterpriseOpportunityNumberSequence.create({
        data: { organizationId, year, nextValue: 2 },
      });
      return 1;
    }

    const updated = await tx.enterpriseOpportunityNumberSequence.update({
      where: { organizationId_year: { organizationId, year } },
      data: { nextValue: { increment: 1 } },
    });
    return updated.nextValue - 1;
  });

  return formatOpportunityNumber(year, issued);
}
