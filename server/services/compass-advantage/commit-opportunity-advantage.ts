/**
 * Persist a calculated COMPASS Advantage onto the canonical Opportunity
 * Advantage Committed columns. Recalculation updates that same row.
 */

import "server-only";

import { prisma } from "@server/lib/prisma";
import { ADVANTAGE_COMMITTED_CURRENCY } from "@/constants/advantage-committed";
import { isAdvantageCommittedApplicableProduct } from "@/lib/advantage-committed/applicability";
import { compassAdvantageToCommitmentAmount } from "@/lib/advantage-committed/compass-propagation";
import { committedAmountsEqual } from "@/lib/advantage-committed/money";
import type { CompassAdvantageDto } from "@/types/compass-customer-gateway";

const ACTOR = "compass-customer-gateway";

export async function persistCompassAdvantageCommitment(input: {
  organizationId: string;
  opportunityId: string;
  productCode: string;
  advantage: CompassAdvantageDto | null;
}): Promise<{ amount: string | null; updated: boolean }> {
  if (!isAdvantageCommittedApplicableProduct(input.productCode)) {
    return { amount: null, updated: false };
  }
  const amount = compassAdvantageToCommitmentAmount({
    eligible: input.advantage?.eligible,
    status: input.advantage?.status,
    totalAdvantageAmount: input.advantage?.totalAdvantageAmount,
    amount: input.advantage?.amount,
  });
  if (!amount) return { amount: null, updated: false };

  const existing = await prisma.enterpriseOpportunity.findFirst({
    where: { id: input.opportunityId, organizationId: input.organizationId, isDeleted: false },
    select: {
      advantageCommittedAmount: true,
      advantageCommitmentVersion: true,
    },
  });
  if (!existing) return { amount: null, updated: false };
  if (committedAmountsEqual(existing.advantageCommittedAmount, amount)) {
    return { amount, updated: false };
  }

  const now = new Date();
  await prisma.enterpriseOpportunity.update({
    where: { id: input.opportunityId },
    data: {
      advantageCommittedAmount: amount,
      advantageCommittedCurrency: ADVANTAGE_COMMITTED_CURRENCY,
      advantageCommittedAt: now,
      advantageCommittedByUserId: ACTOR,
      advantageCommittedProductCode: input.productCode,
      advantageCommitmentId: input.opportunityId,
      advantageCommitmentVersion: (existing.advantageCommitmentVersion ?? 0) + 1,
      updatedBy: ACTOR,
    },
  });
  return { amount, updated: true };
}
