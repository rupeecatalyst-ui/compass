/**
 * CO-ECC-RECIPIENT-001 — Phase 1 RecipientRouter Prisma loader.
 * Loads Opportunity/Deal/Contact/User/WealthPartner SSOT, then calls pure resolver.
 * Does not send email. Does not enable ENCE. Does not touch CHANNEL_PARTNERS.
 */

import {
  resolveTransactionOperationalRecipients,
  type RecipientContactSnapshot,
  type RecipientDealSnapshot,
  type RecipientLenderContactSnapshot,
  type RecipientOpportunitySnapshot,
  type RecipientRouterResolveInput,
  type RecipientRouterResult,
  type RecipientUserSnapshot,
  type RecipientWealthPartnerSnapshot,
  type TransactionPrimaryToRole,
} from "@/lib/enterprise-communication-center/recipient-router";
import type { EnterpriseCommunicationEventType } from "@/types/enterprise-communication-center";
import { prisma } from "@server/lib/prisma";

export type LoadRecipientRouterInput = {
  organizationId: string;
  eventType: EnterpriseCommunicationEventType;
  opportunityId?: string | null;
  dealId?: string | null;
  primaryToRole?: TransactionPrimaryToRole;
  internalUserId?: string | null;
};

function mapContact(row: {
  id: string;
  officialEmail: string | null;
  personalEmail: string | null;
  isDeleted: boolean;
}): RecipientContactSnapshot {
  return {
    id: row.id,
    officialEmail: row.officialEmail,
    personalEmail: row.personalEmail,
    isDeleted: row.isDeleted,
  };
}

/**
 * Unified transaction email recipient resolution (all primary TO roles).
 * Browser must not supply TO/CC — only ids, eventType, and primaryToRole.
 */
export async function loadAndResolveTransactionOperationalRecipients(
  input: LoadRecipientRouterInput,
): Promise<RecipientRouterResult> {
  const organizationId = input.organizationId.trim();
  const opportunityId = input.opportunityId?.trim() || null;
  const dealId = input.dealId?.trim() || null;

  let deal: RecipientDealSnapshot | null = null;
  let dealLenderId: string | null = null;

  if (dealId) {
    const dealRow = await prisma.enterpriseDeal.findFirst({
      where: { id: dealId, organizationId, isDeleted: false },
      select: {
        id: true,
        opportunityId: true,
        primaryContactId: true,
        primaryContactEmail: true,
        relationshipManagerUserId: true,
        primaryOwnerUserId: true,
        lenderId: true,
      },
    });
    if (dealRow) {
      deal = {
        id: dealRow.id,
        opportunityId: dealRow.opportunityId,
        primaryContactId: dealRow.primaryContactId,
        primaryContactEmail: dealRow.primaryContactEmail,
        relationshipManagerUserId: dealRow.relationshipManagerUserId,
        primaryOwnerUserId: dealRow.primaryOwnerUserId,
      };
      dealLenderId = dealRow.lenderId?.trim() || null;
    }
  }

  const oppIdToLoad = opportunityId || deal?.opportunityId || null;
  let opportunity: RecipientOpportunitySnapshot | null = null;
  if (oppIdToLoad) {
    const oppRow = await prisma.enterpriseOpportunity.findFirst({
      where: { id: oppIdToLoad, organizationId, isDeleted: false },
      select: {
        id: true,
        primaryContactId: true,
        primaryContactEmail: true,
        relationshipManagerUserId: true,
        primaryOwnerUserId: true,
        sourceWealthPartnerId: true,
      },
    });
    if (oppRow) {
      opportunity = {
        id: oppRow.id,
        primaryContactId: oppRow.primaryContactId,
        primaryContactEmail: oppRow.primaryContactEmail,
        relationshipManagerUserId: oppRow.relationshipManagerUserId,
        primaryOwnerUserId: oppRow.primaryOwnerUserId,
        sourceWealthPartnerId: oppRow.sourceWealthPartnerId,
      };
    }
  }

  const contactIds = new Set<string>();
  const userIds = new Set<string>();
  const wpIds = new Set<string>();

  if (deal?.primaryContactId) contactIds.add(deal.primaryContactId);
  if (opportunity?.primaryContactId) contactIds.add(opportunity.primaryContactId);
  if (deal?.relationshipManagerUserId) userIds.add(deal.relationshipManagerUserId);
  if (deal?.primaryOwnerUserId) userIds.add(deal.primaryOwnerUserId);
  if (opportunity?.relationshipManagerUserId) {
    userIds.add(opportunity.relationshipManagerUserId);
  }
  if (opportunity?.primaryOwnerUserId) userIds.add(opportunity.primaryOwnerUserId);
  if (opportunity?.sourceWealthPartnerId) wpIds.add(opportunity.sourceWealthPartnerId);

  const primaryToRole = input.primaryToRole ?? "customer";
  const internalUserId = input.internalUserId?.trim() || null;
  if (primaryToRole === "internal_employee" && internalUserId) {
    userIds.add(internalUserId);
  }

  const contactsById: Record<string, RecipientContactSnapshot | undefined> = {};
  const usersById: Record<string, RecipientUserSnapshot | undefined> = {};
  const wealthPartnersById: Record<string, RecipientWealthPartnerSnapshot | undefined> =
    {};

  if (contactIds.size > 0) {
    const contacts = await prisma.ecmContact.findMany({
      where: { organizationId, id: { in: [...contactIds] } },
      select: {
        id: true,
        officialEmail: true,
        personalEmail: true,
        isDeleted: true,
      },
    });
    for (const c of contacts) {
      contactsById[c.id] = mapContact(c);
    }
  }

  if (userIds.size > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, email: true, isActive: true },
    });
    for (const u of users) {
      usersById[u.id] = {
        id: u.id,
        email: u.email,
        isActive: u.isActive,
      };
    }
  }

  if (wpIds.size > 0) {
    const partners = await prisma.enterpriseWealthPartner.findMany({
      where: { organizationId, id: { in: [...wpIds] }, isDeleted: false },
      select: {
        id: true,
        email: true,
        contactId: true,
        isDeleted: true,
      },
    });

    const linkedContactIds = partners
      .map((p) => p.contactId)
      .filter((id): id is string => Boolean(id));

    const linkedContactsById: Record<string, RecipientContactSnapshot | undefined> = {
      ...contactsById,
    };
    if (linkedContactIds.length > 0) {
      const linked = await prisma.ecmContact.findMany({
        where: { organizationId, id: { in: linkedContactIds } },
        select: {
          id: true,
          officialEmail: true,
          personalEmail: true,
          isDeleted: true,
        },
      });
      for (const c of linked) {
        linkedContactsById[c.id] = mapContact(c);
      }
    }

    for (const p of partners) {
      wealthPartnersById[p.id] = {
        id: p.id,
        email: p.email,
        contactId: p.contactId,
        isDeleted: p.isDeleted,
        contact: p.contactId ? linkedContactsById[p.contactId] ?? null : null,
      };
    }
  }

  const resolveInput: RecipientRouterResolveInput = {
    eventType: input.eventType,
    opportunity,
    deal,
    contactsById,
    usersById,
    wealthPartnersById,
  };

  let lenderContact: RecipientLenderContactSnapshot | null = null;
  if (primaryToRole === "lender" && dealLenderId) {
    const contactRow = await prisma.enterpriseLenderContact.findFirst({
      where: {
        organizationId,
        lenderId: dealLenderId,
        isDeleted: false,
        enabled: true,
        email: { not: null },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { lenderId: true, email: true },
    });
    if (contactRow?.email?.trim()) {
      lenderContact = {
        lenderId: contactRow.lenderId,
        email: contactRow.email.trim(),
      };
    } else {
      lenderContact = { lenderId: dealLenderId, email: null };
    }
  }

  const internalUser =
    primaryToRole === "internal_employee" && internalUserId
      ? usersById[internalUserId] ?? null
      : null;

  return resolveTransactionOperationalRecipients({
    ...resolveInput,
    primaryToRole,
    lenderContact,
    internalUser,
  });
}

/** Customer-primary TO — convenience wrapper for document_request and similar. */
export async function loadAndResolveCustomerFacingRecipients(
  input: LoadRecipientRouterInput,
): Promise<RecipientRouterResult> {
  return loadAndResolveTransactionOperationalRecipients({
    ...input,
    primaryToRole: "customer",
  });
}
