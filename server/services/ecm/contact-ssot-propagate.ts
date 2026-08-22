/**
 * CO-C1-SSOT-CONTACT-001 — Refresh denormalized Contact identity on linked transactions.
 * ECM Contact Registry remains identity SSOT; Opportunity/Deal fields are refreshed mirrors.
 */

import { prisma } from "@server/lib/prisma";

export type ContactIdentitySnapshot = {
  name: string;
  mobilePrimary: string;
  officialEmail?: string | null;
  personalEmail?: string | null;
  city?: string | null;
  state?: string | null;
};

function resolveContactEmail(contact: ContactIdentitySnapshot): string | null {
  const official = contact.officialEmail?.trim();
  if (official) return official;
  const personal = contact.personalEmail?.trim();
  return personal || null;
}

export async function propagateContactIdentityToTransactions(input: {
  organizationId: string;
  contactId: string;
  contact: ContactIdentitySnapshot;
  modifiedBy: string;
}): Promise<{ opportunitiesUpdated: number; dealsUpdated: number }> {
  const email = resolveContactEmail(input.contact);
  const data = {
    primaryContactName: input.contact.name,
    primaryContactMobile: input.contact.mobilePrimary,
    primaryContactEmail: email,
    cityLabel: input.contact.city?.trim() || null,
    stateLabel: input.contact.state?.trim() || null,
    modifiedBy: input.modifiedBy,
  };

  const [opp, deal] = await prisma.$transaction([
    prisma.enterpriseOpportunity.updateMany({
      where: {
        organizationId: input.organizationId,
        primaryContactId: input.contactId,
        isDeleted: false,
      },
      data,
    }),
    prisma.enterpriseDeal.updateMany({
      where: {
        organizationId: input.organizationId,
        primaryContactId: input.contactId,
        isDeleted: false,
      },
      data,
    }),
  ]);

  return { opportunitiesUpdated: opp.count, dealsUpdated: deal.count };
}
