import "server-only";

import type { Prisma } from "@prisma/client";
import { creditNoteNumberFromParts } from "@/constants/enterprise-accounting-credit-note";

type Tx = Prisma.TransactionClient;

export async function allocateAccountingCreditNoteNumberInTransaction(
  tx: Tx,
  input: {
    organizationId: string;
    financialYearKey: string;
  },
): Promise<{ sequenceNumber: number; creditNoteNumber: string }> {
  const existing = await tx.enterpriseAccountingCreditNoteNumberSequence.findUnique({
    where: {
      organizationId_financialYearKey: {
        organizationId: input.organizationId,
        financialYearKey: input.financialYearKey,
      },
    },
  });

  if (!existing) {
    await tx.enterpriseAccountingCreditNoteNumberSequence.create({
      data: {
        organizationId: input.organizationId,
        financialYearKey: input.financialYearKey,
        nextValue: 2,
      },
    });
    return {
      sequenceNumber: 1,
      creditNoteNumber: creditNoteNumberFromParts(input.financialYearKey, 1),
    };
  }

  const updated = await tx.enterpriseAccountingCreditNoteNumberSequence.update({
    where: {
      organizationId_financialYearKey: {
        organizationId: input.organizationId,
        financialYearKey: input.financialYearKey,
      },
    },
    data: { nextValue: { increment: 1 } },
  });
  const sequenceNumber = updated.nextValue - 1;
  return {
    sequenceNumber,
    creditNoteNumber: creditNoteNumberFromParts(input.financialYearKey, sequenceNumber),
  };
}
