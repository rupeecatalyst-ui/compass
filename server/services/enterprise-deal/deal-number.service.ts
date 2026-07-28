/**
 * CO-ARCH-002-W1 — Deal Number allocator (DEAL-YYYY-######).
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";

export function formatDealNumber(year: number, sequence: number): string {
  return `DEAL-${year}-${String(sequence).padStart(6, "0")}`;
}

type Tx = Prisma.TransactionClient;

/** Allocate next Deal Number using an existing interactive transaction client. */
export async function allocateDealNumberInTransaction(
  tx: Tx,
  organizationId: string,
): Promise<string> {
  const year = new Date().getUTCFullYear();

  const existing = await tx.enterpriseDealNumberSequence.findUnique({
    where: { organizationId_year: { organizationId, year } },
  });

  if (!existing) {
    await tx.enterpriseDealNumberSequence.create({
      data: { organizationId, year, nextValue: 2 },
    });
    return formatDealNumber(year, 1);
  }

  const updated = await tx.enterpriseDealNumberSequence.update({
    where: { organizationId_year: { organizationId, year } },
    data: { nextValue: { increment: 1 } },
  });
  return formatDealNumber(year, updated.nextValue - 1);
}

/**
 * Allocates the next Deal Number for an organization (UTC calendar year).
 * Prefer {@link allocateDealNumberInTransaction} inside Deal create to avoid
 * a second interactive transaction (CO-QA-005).
 */
export async function allocateDealNumber(organizationId: string): Promise<string> {
  return prisma.$transaction(async (tx) =>
    allocateDealNumberInTransaction(tx, organizationId),
  );
}
