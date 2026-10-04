/**
 * CO-C1-SSOT-CONTACT-001 — Contact identity SSOT for linked transactions.
 * ECM Contact Registry owns identity; Opportunity/Deal fields are refreshed mirrors.
 */

import type { Prisma } from "@prisma/client";
import { ecmContactService } from "@server/services/ecm/contact.service";
import { prisma } from "@server/lib/prisma";

export type ContactIdentitySnapshot = {
  name: string;
  mobilePrimary: string;
  officialEmail?: string | null;
  personalEmail?: string | null;
  city?: string | null;
  state?: string | null;
};

export type TransactionContactIdentityFields = {
  primaryContactName?: string | null;
  primaryContactMobile?: string | null;
  primaryContactEmail?: string | null;
  cityLabel?: string | null;
  stateLabel?: string | null;
};

function resolveContactEmail(contact: ContactIdentitySnapshot): string | null {
  const official = contact.officialEmail?.trim();
  if (official) return official;
  const personal = contact.personalEmail?.trim();
  return personal || null;
}

function isIndividualBorrower(primaryBorrowerKind?: string | null): boolean {
  return primaryBorrowerKind !== "company";
}

export async function loadEcmContactIdentitySnapshot(input: {
  organizationId: string;
  contactId: string;
}): Promise<ContactIdentitySnapshot | null> {
  const row = await prisma.ecmContact.findFirst({
    where: {
      id: input.contactId,
      organizationId: input.organizationId,
      isDeleted: false,
    },
    select: {
      name: true,
      mobilePrimary: true,
      officialEmail: true,
      personalEmail: true,
      city: true,
      state: true,
    },
  });
  if (!row) return null;
  return {
    name: row.name,
    mobilePrimary: row.mobilePrimary,
    officialEmail: row.officialEmail,
    personalEmail: row.personalEmail,
    city: row.city,
    state: row.state,
  };
}

/** Resolve current ECM identity for API responses (Contact SSOT over stale denorm). */
export async function hydrateTransactionContactIdentity(input: {
  organizationId: string;
  primaryContactId: string | null;
  denorm: TransactionContactIdentityFields;
}): Promise<TransactionContactIdentityFields> {
  if (!input.primaryContactId) return input.denorm;
  const contact = await loadEcmContactIdentitySnapshot({
    organizationId: input.organizationId,
    contactId: input.primaryContactId,
  });
  if (!contact) return input.denorm;
  return {
    primaryContactName: contact.name,
    primaryContactMobile: contact.mobilePrimary,
    primaryContactEmail: resolveContactEmail(contact),
    cityLabel: contact.city?.trim() || null,
    stateLabel: contact.state?.trim() || null,
  };
}

export async function propagateContactIdentityToTransactions(
  input: {
    organizationId: string;
    contactId: string;
    contact: ContactIdentitySnapshot;
    modifiedBy: string;
  },
  db?: Prisma.TransactionClient,
): Promise<{ opportunitiesUpdated: number; dealsUpdated: number }> {
  const email = resolveContactEmail(input.contact);
  const data = {
    primaryContactName: input.contact.name,
    primaryContactMobile: input.contact.mobilePrimary,
    primaryContactEmail: email,
    cityLabel: input.contact.city?.trim() || null,
    stateLabel: input.contact.state?.trim() || null,
    updatedBy: input.modifiedBy,
  };
  const opportunityWhere = {
    organizationId: input.organizationId,
    primaryContactId: input.contactId,
    isDeleted: false,
  };
  const dealWhere = {
    organizationId: input.organizationId,
    primaryContactId: input.contactId,
    isDeleted: false,
  };

  if (db) {
    const opp = await db.enterpriseOpportunity.updateMany({ where: opportunityWhere, data });
    const deal = await db.enterpriseDeal.updateMany({ where: dealWhere, data });
    return { opportunitiesUpdated: opp.count, dealsUpdated: deal.count };
  }

  const [opp, deal] = await prisma.$transaction([
    prisma.enterpriseOpportunity.updateMany({ where: opportunityWhere, data }),
    prisma.enterpriseDeal.updateMany({ where: dealWhere, data }),
  ]);

  return { opportunitiesUpdated: opp.count, dealsUpdated: deal.count };
}

/**
 * When Opportunity/Deal PATCH includes Contact-owned identity fields,
 * write through to ECM (which propagates mirrors back to transactions).
 */
export async function syncContactIdentityPatchToEcm(input: {
  organizationId: string;
  primaryContactId: string | null;
  primaryBorrowerKind?: string | null;
  body: Record<string, unknown>;
  actorUserId: string;
  db?: Prisma.TransactionClient;
}): Promise<boolean> {
  if (!input.primaryContactId || !isIndividualBorrower(input.primaryBorrowerKind)) {
    return false;
  }

  const patch: Record<string, string> = {};
  if (input.body.primaryContactName !== undefined) {
    patch.name = String(input.body.primaryContactName ?? "").trim();
  }
  if (input.body.primaryContactMobile !== undefined) {
    patch.mobilePrimary = String(input.body.primaryContactMobile ?? "").trim();
  }
  if (input.body.primaryContactEmail !== undefined) {
    patch.officialEmail = String(input.body.primaryContactEmail ?? "").trim();
  }
  if (input.body.cityLabel !== undefined) {
    patch.city = String(input.body.cityLabel ?? "").trim();
  }
  if (input.body.stateLabel !== undefined) {
    patch.state = String(input.body.stateLabel ?? "").trim();
  }

  if (!Object.keys(patch).length) return false;
  if (patch.name !== undefined && !patch.name) {
    throw new Error("Contact name is required.");
  }
  if (patch.mobilePrimary !== undefined && !patch.mobilePrimary) {
    throw new Error("Primary mobile is required.");
  }

  await ecmContactService.update(input.primaryContactId, patch, input.actorUserId, input.db);
  return true;
}
