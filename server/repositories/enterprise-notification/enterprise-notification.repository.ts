/**
 * CO-NOTIFICATION-001 — Durable notification repository (prisma mode).
 */
import "server-only";

import { prisma } from "@server/lib/prisma";
import type { EnterpriseNotificationItem } from "@/types/enterprise-notification-engine";

export type EneCreateRow = {
  id?: string;
  organizationId: string;
  eventType: string;
  dedupeKey: string;
  sourceEventId: string;
  sourceSystem: string;
  title: string;
  body: string;
  description?: string | null;
  actorUserId?: string | null;
  actorName?: string | null;
  recipientKind: string;
  recipientUserId?: string | null;
  recipientPartnerId?: string | null;
  opportunityId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  customerName?: string | null;
  productLabel?: string | null;
  amountLabel?: string | null;
  previousValue?: string | null;
  newValue?: string | null;
  href: string;
  occurredAt: Date;
};

function toDomain(row: {
  id: string;
  organizationId: string;
  eventType: string;
  dedupeKey: string;
  sourceEventId: string;
  sourceSystem: string;
  title: string;
  body: string;
  description: string | null;
  actorUserId: string | null;
  actorName: string | null;
  recipientKind: string;
  recipientUserId: string | null;
  recipientPartnerId: string | null;
  opportunityId: string | null;
  dealId: string | null;
  contactId: string | null;
  customerName: string | null;
  productLabel: string | null;
  amountLabel: string | null;
  previousValue: string | null;
  newValue: string | null;
  href: string;
  readState: string;
  readAt: Date | null;
  occurredAt: Date;
  createdAt: Date;
}): EnterpriseNotificationItem {
  return {
    id: row.id,
    organizationId: row.organizationId,
    eventType: row.eventType,
    dedupeKey: row.dedupeKey,
    sourceEventId: row.sourceEventId,
    sourceSystem: row.sourceSystem,
    title: row.title,
    body: row.body,
    description: row.description,
    actorUserId: row.actorUserId,
    actorName: row.actorName,
    recipientKind: row.recipientKind === "partner" ? "partner" : "user",
    recipientUserId: row.recipientUserId,
    recipientPartnerId: row.recipientPartnerId,
    opportunityId: row.opportunityId,
    dealId: row.dealId,
    contactId: row.contactId,
    customerName: row.customerName,
    productLabel: row.productLabel,
    amountLabel: row.amountLabel,
    previousValue: row.previousValue,
    newValue: row.newValue,
    href: row.href,
    readState: row.readState === "READ" ? "READ" : "UNREAD",
    readAt: row.readAt ? row.readAt.toISOString() : null,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export const enterpriseNotificationRepository = {
  async upsertMany(rows: EneCreateRow[]): Promise<EnterpriseNotificationItem[]> {
    const out: EnterpriseNotificationItem[] = [];
    for (const input of rows) {
      try {
        const row = await prisma.enterpriseNotification.upsert({
          where: {
            organizationId_dedupeKey: {
              organizationId: input.organizationId,
              dedupeKey: input.dedupeKey,
            },
          },
          create: {
            id: input.id,
            organizationId: input.organizationId,
            eventType: input.eventType,
            dedupeKey: input.dedupeKey,
            sourceEventId: input.sourceEventId,
            sourceSystem: input.sourceSystem,
            title: input.title,
            body: input.body,
            description: input.description ?? null,
            actorUserId: input.actorUserId ?? null,
            actorName: input.actorName ?? null,
            recipientKind: input.recipientKind,
            recipientUserId: input.recipientUserId ?? null,
            recipientPartnerId: input.recipientPartnerId ?? null,
            opportunityId: input.opportunityId ?? null,
            dealId: input.dealId ?? null,
            contactId: input.contactId ?? null,
            customerName: input.customerName ?? null,
            productLabel: input.productLabel ?? null,
            amountLabel: input.amountLabel ?? null,
            previousValue: input.previousValue ?? null,
            newValue: input.newValue ?? null,
            href: input.href,
            occurredAt: input.occurredAt,
          },
          update: {},
        });
        out.push(toDomain(row));
      } catch {
        const existing = await prisma.enterpriseNotification.findUnique({
          where: {
            organizationId_dedupeKey: {
              organizationId: input.organizationId,
              dedupeKey: input.dedupeKey,
            },
          },
        });
        if (existing) out.push(toDomain(existing));
      }
    }
    return out;
  },

  async listForUser(input: {
    organizationId: string;
    userId: string;
    limit?: number;
    since?: Date;
    unreadOnly?: boolean;
  }): Promise<EnterpriseNotificationItem[]> {
    const rows = await prisma.enterpriseNotification.findMany({
      where: {
        organizationId: input.organizationId,
        recipientKind: "user",
        recipientUserId: input.userId,
        ...(input.unreadOnly ? { readState: "UNREAD" } : {}),
        ...(input.since ? { occurredAt: { gt: input.since } } : {}),
      },
      orderBy: { occurredAt: "desc" },
      take: Math.min(Math.max(input.limit ?? 40, 1), 100),
    });
    return rows.map(toDomain);
  },

  async listForPartner(input: {
    organizationId: string;
    partnerId: string;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<EnterpriseNotificationItem[]> {
    const rows = await prisma.enterpriseNotification.findMany({
      where: {
        organizationId: input.organizationId,
        recipientKind: "partner",
        recipientPartnerId: input.partnerId,
        ...(input.unreadOnly ? { readState: "UNREAD" } : {}),
      },
      orderBy: { occurredAt: "desc" },
      take: Math.min(Math.max(input.limit ?? 40, 1), 100),
    });
    return rows.map(toDomain);
  },

  async markRead(input: {
    id: string;
    organizationId: string;
    userId?: string;
    partnerId?: string;
  }): Promise<EnterpriseNotificationItem | null> {
    const existing = await prisma.enterpriseNotification.findFirst({
      where: {
        id: input.id,
        organizationId: input.organizationId,
        ...(input.userId
          ? { recipientKind: "user", recipientUserId: input.userId }
          : {}),
        ...(input.partnerId
          ? { recipientKind: "partner", recipientPartnerId: input.partnerId }
          : {}),
      },
    });
    if (!existing) return null;
    if (existing.readState === "READ") return toDomain(existing);
    const row = await prisma.enterpriseNotification.update({
      where: { id: existing.id },
      data: { readState: "READ", readAt: new Date() },
    });
    return toDomain(row);
  },
};
