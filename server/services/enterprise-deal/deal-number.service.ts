/**
 * CO-ARCH-002-W1 — Deal Number allocator (DEAL-YYYY-######).
 */
import { prisma } from "@server/lib/prisma";

export function formatDealNumber(year: number, sequence: number): string {
  return `DEAL-${year}-${String(sequence).padStart(6, "0")}`;
}

/** Allocates the next Deal Number for an organization (UTC calendar year). */
export async function allocateDealNumber(organizationId: string): Promise<string> {
  const year = new Date().getUTCFullYear();

  const issued = await prisma.$transaction(async (tx) => {
    const existing = await tx.enterpriseDealNumberSequence.findUnique({
      where: { organizationId_year: { organizationId, year } },
    });

    if (!existing) {
      await tx.enterpriseDealNumberSequence.create({
        data: { organizationId, year, nextValue: 2 },
      });
      return 1;
    }

    const updated = await tx.enterpriseDealNumberSequence.update({
      where: { organizationId_year: { organizationId, year } },
      data: { nextValue: { increment: 1 } },
    });
    return updated.nextValue - 1;
  });

  return formatDealNumber(year, issued);
}
