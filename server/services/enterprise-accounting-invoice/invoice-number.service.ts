import "server-only";

import type { Prisma } from "@prisma/client";
import { invoiceNumberFromParts } from "@/constants/enterprise-accounting-invoice";

type Tx = Prisma.TransactionClient;

export async function allocateAccountingInvoiceNumberInTransaction(
  tx: Tx,
  input: {
    organizationId: string;
    invoiceProductPrefix: string;
    financialYearKey: string;
  },
): Promise<{ sequenceNumber: number; invoiceNumber: string }> {
  const existing = await tx.enterpriseAccountingInvoiceNumberSequence.findUnique({
    where: {
      organizationId_invoiceProductPrefix_financialYearKey: {
        organizationId: input.organizationId,
        invoiceProductPrefix: input.invoiceProductPrefix,
        financialYearKey: input.financialYearKey,
      },
    },
  });

  if (!existing) {
    await tx.enterpriseAccountingInvoiceNumberSequence.create({
      data: {
        organizationId: input.organizationId,
        invoiceProductPrefix: input.invoiceProductPrefix,
        financialYearKey: input.financialYearKey,
        nextValue: 2,
      },
    });
    return {
      sequenceNumber: 1,
      invoiceNumber: invoiceNumberFromParts(
        input.invoiceProductPrefix,
        input.financialYearKey,
        1,
      ),
    };
  }

  const updated = await tx.enterpriseAccountingInvoiceNumberSequence.update({
    where: {
      organizationId_invoiceProductPrefix_financialYearKey: {
        organizationId: input.organizationId,
        invoiceProductPrefix: input.invoiceProductPrefix,
        financialYearKey: input.financialYearKey,
      },
    },
    data: { nextValue: { increment: 1 } },
  });
  const sequenceNumber = updated.nextValue - 1;
  return {
    sequenceNumber,
    invoiceNumber: invoiceNumberFromParts(
      input.invoiceProductPrefix,
      input.financialYearKey,
      sequenceNumber,
    ),
  };
}
