/**
 * CO-C1-COMMUNICATION-002 — Load SSOT context for inbound transaction matching.
 */
import "server-only";

import { normalizeMessageId } from "@/constants/enterprise-inbound-email";
import type { InboundMatchContext } from "@/lib/enterprise-inbound-email/transaction-matcher";
import { prisma } from "@server/lib/prisma";

async function findOutboundThread(args: {
  organizationId: string;
  inReplyTo: string | null;
  referencesHeader: string | null;
}) {
  const needles = new Set<string>();
  for (const raw of [args.inReplyTo, args.referencesHeader]) {
    if (!raw) continue;
    for (const part of raw.split(/\s+/)) {
      const n = normalizeMessageId(part);
      if (n) needles.add(n);
    }
  }
  if (!needles.size) return null;

  const events = await prisma.enterpriseActivityEvent.findMany({
    where: {
      organizationId: args.organizationId,
      sourceSystem: { in: ["operational_email", "document_request"] },
      eventKind: "communications",
    },
    orderBy: { occurredAt: "desc" },
    take: 200,
    select: {
      sourceEventId: true,
      opportunityId: true,
      dealId: true,
      contactId: true,
      payload: true,
    },
  });

  for (const event of events) {
    const payload = event.payload as Record<string, unknown> | null;
    const messageId = normalizeMessageId(
      typeof payload?.messageId === "string" ? payload.messageId : null,
    );
    if (messageId && needles.has(messageId)) {
      return {
        sourceEventId: event.sourceEventId ?? "",
        opportunityId: event.opportunityId,
        dealId: event.dealId,
        contactId: event.contactId,
        messageId,
      };
    }
  }
  return null;
}

export async function buildInboundMatchContext(args: {
  organizationId: string;
  fromEmail: string;
  subject: string;
  textBody: string | null;
  inReplyTo: string | null;
  referencesHeader: string | null;
  internalDomains?: string[];
}): Promise<InboundMatchContext> {
  const email = args.fromEmail.trim().toLowerCase();

  const [contacts, lenderContacts, partners, internalUser, outboundThread] =
    await Promise.all([
      prisma.ecmContact.findMany({
        where: {
          organizationId: args.organizationId,
          isDeleted: false,
          OR: [
            { officialEmail: { equals: email, mode: "insensitive" } },
            { personalEmail: { equals: email, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      }),
      prisma.enterpriseLenderContact.findMany({
        where: {
          organizationId: args.organizationId,
          isDeleted: false,
          enabled: true,
          email: { equals: email, mode: "insensitive" },
        },
        select: { id: true, lenderId: true },
      }),
      prisma.enterpriseWealthPartner.findMany({
        where: {
          organizationId: args.organizationId,
          isDeleted: false,
          email: { equals: email, mode: "insensitive" },
        },
        select: { id: true },
      }),
      prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" }, isActive: true },
        select: { id: true },
      }),
      findOutboundThread({
        organizationId: args.organizationId,
        inReplyTo: args.inReplyTo,
        referencesHeader: args.referencesHeader,
      }),
    ]);

  const contactIds = contacts.map((c) => c.id);
  const haystack = `${args.subject}\n${args.textBody ?? ""}`;
  const oppRefs = [...new Set(haystack.match(/\bOPP-\d{4}-\d{6}\b/gi) ?? [])].map(
    (r) => r.toUpperCase(),
  );
  const dealRefs = [...new Set(haystack.match(/\bDEAL-\d{4}-\d{6}\b/gi) ?? [])].map(
    (r) => r.toUpperCase(),
  );

  const [opportunities, deals] = await Promise.all([
    oppRefs.length
      ? prisma.enterpriseOpportunity.findMany({
          where: {
            organizationId: args.organizationId,
            isDeleted: false,
            opportunityNumber: { in: oppRefs },
          },
          select: {
            id: true,
            opportunityNumber: true,
            primaryContactId: true,
          },
        })
      : [],
    dealRefs.length
      ? prisma.enterpriseDeal.findMany({
          where: {
            organizationId: args.organizationId,
            isDeleted: false,
            dealNumber: { in: dealRefs },
          },
          select: {
            id: true,
            dealNumber: true,
            opportunityId: true,
            primaryContactId: true,
          },
        })
      : [],
  ]);

  const opportunitiesByNumber = Object.fromEntries(
    opportunities.map((o) => [
      (o.opportunityNumber ?? "").toUpperCase(),
      {
        opportunityId: o.id,
        opportunityNumber: o.opportunityNumber,
        primaryContactId: o.primaryContactId,
      },
    ]),
  );

  const dealsByNumber = Object.fromEntries(
    deals.map((d) => [
      (d.dealNumber ?? "").toUpperCase(),
      {
        opportunityId: d.opportunityId ?? d.id,
        opportunityNumber: null,
        dealId: d.id,
        dealNumber: d.dealNumber,
        primaryContactId: d.primaryContactId,
      },
    ]),
  );

  let openTransactionsByContact: InboundMatchContext["openTransactionsByContact"] = [];
  if (contactIds.length) {
    const openOpps = await prisma.enterpriseOpportunity.findMany({
      where: {
        organizationId: args.organizationId,
        isDeleted: false,
        primaryContactId: { in: contactIds },
        lifecycleStatus: { in: ["requirement_captured", "active", "on_hold"] },
      },
      select: {
        id: true,
        opportunityNumber: true,
        primaryContactId: true,
      },
    });
    openTransactionsByContact = openOpps.map((o) => ({
      opportunityId: o.id,
      opportunityNumber: o.opportunityNumber,
      primaryContactId: o.primaryContactId,
    }));
  }

  return {
    fromEmail: email,
    subject: args.subject,
    textBody: args.textBody,
    inReplyTo: args.inReplyTo,
    referencesHeader: args.referencesHeader,
    internalDomains: args.internalDomains,
    outboundThread,
    referenceMatches: { opportunitiesByNumber, dealsByNumber },
    senderContacts: {
      contactIds,
      lenderContactIds: lenderContacts.map((l) => l.id),
      wealthPartnerIds: partners.map((p) => p.id),
      isInternalUser: Boolean(internalUser),
    },
    openTransactionsByContact,
  };
}
