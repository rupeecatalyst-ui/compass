/**
 * CO-NOTIFICATION-001 — Enterprise Notification Engine service.
 * Fail-open fan-out from domain writers. Durable when prisma mode.
 */
import "server-only";

import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { prisma } from "@server/lib/prisma";
import {
  enterpriseNotificationRepository,
  type EneCreateRow,
} from "@server/repositories/enterprise-notification/enterprise-notification.repository";
import {
  buildRecipientRows,
  resolveNotificationRecipients,
} from "@server/services/enterprise-notification/recipients";
import { buildExplicitAssigneeRecipients } from "@/lib/enterprise-notification-engine/recipients-pure";
import type {
  EnterpriseNotificationItem,
  FanOutEnterpriseNotificationInput,
} from "@/types/enterprise-notification-engine";

async function resolveOrganizationId(fallback?: string): Promise<string> {
  if (fallback?.trim()) return fallback.trim();
  const org = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!org) {
    throw Object.assign(new Error("No organization found"), {
      statusCode: 503,
      code: "ORG_MISSING",
    });
  }
  return org.id;
}

/** Soft in-memory fallback when durable store unavailable (process local). */
const softStore = new Map<string, EnterpriseNotificationItem>();

function softUpsert(rows: EneCreateRow[]): EnterpriseNotificationItem[] {
  const out: EnterpriseNotificationItem[] = [];
  for (const row of rows) {
    const existing = [...softStore.values()].find(
      (n) =>
        n.organizationId === row.organizationId && n.dedupeKey === row.dedupeKey,
    );
    if (existing) {
      out.push(existing);
      continue;
    }
    const item: EnterpriseNotificationItem = {
      id: crypto.randomUUID(),
      organizationId: row.organizationId,
      eventType: row.eventType,
      dedupeKey: row.dedupeKey,
      sourceEventId: row.sourceEventId,
      sourceSystem: row.sourceSystem,
      title: row.title,
      body: row.body,
      description: row.description ?? null,
      actorUserId: row.actorUserId ?? null,
      actorName: row.actorName ?? null,
      recipientKind: row.recipientKind === "partner" ? "partner" : "user",
      recipientUserId: row.recipientUserId ?? null,
      recipientPartnerId: row.recipientPartnerId ?? null,
      opportunityId: row.opportunityId ?? null,
      dealId: row.dealId ?? null,
      contactId: row.contactId ?? null,
      customerName: row.customerName ?? null,
      productLabel: row.productLabel ?? null,
      amountLabel: row.amountLabel ?? null,
      previousValue: row.previousValue ?? null,
      newValue: row.newValue ?? null,
      href: row.href,
      readState: "UNREAD",
      readAt: null,
      toastPresentedAt: null,
      occurredAt: row.occurredAt.toISOString(),
      createdAt: new Date().toISOString(),
    };
    softStore.set(item.id, item);
    out.push(item);
  }
  return out;
}

export const enterpriseNotificationService = {
  isDurable(): boolean {
    return isEnterprisePersistencePrisma();
  },

  async fanOut(
    input: FanOutEnterpriseNotificationInput & { actorIsPartner?: boolean },
  ): Promise<EnterpriseNotificationItem[]> {
    const organizationId = await resolveOrganizationId(input.organizationId);
    const recipients = Array.isArray(input.explicitRecipientUserIds)
      ? buildExplicitAssigneeRecipients(input.explicitRecipientUserIds)
      : await resolveNotificationRecipients({
          organizationId,
          actorUserId: input.actorUserId,
          sourceWealthPartnerId: input.sourceWealthPartnerId,
          actorIsPartner: input.actorIsPartner,
        });
    if (recipients.length === 0) return [];

    const rows = buildRecipientRows(
      { ...input, organizationId },
      recipients,
    ) as EneCreateRow[];

    if (!this.isDurable()) {
      return softUpsert(rows);
    }
    try {
      return await enterpriseNotificationRepository.upsertMany(rows);
    } catch {
      return softUpsert(rows);
    }
  },

  async fanOutBestEffort(
    input: FanOutEnterpriseNotificationInput & { actorIsPartner?: boolean },
  ): Promise<void> {
    try {
      await this.fanOut(input);
    } catch {
      /* never block domain mutation */
    }
  },

  async listForUser(input: {
    organizationId?: string;
    userId: string;
    limit?: number;
    since?: string;
    unreadOnly?: boolean;
  }): Promise<EnterpriseNotificationItem[]> {
    const organizationId = await resolveOrganizationId(input.organizationId);
    if (!this.isDurable()) {
      return [...softStore.values()]
        .filter(
          (n) =>
            n.organizationId === organizationId &&
            n.recipientKind === "user" &&
            n.recipientUserId === input.userId &&
            (!input.unreadOnly || n.readState === "UNREAD") &&
            (!input.since ||
              new Date(n.occurredAt).getTime() > new Date(input.since).getTime()),
        )
        .sort(
          (a, b) =>
            new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
        )
        .slice(0, input.limit ?? 40);
    }
    return enterpriseNotificationRepository.listForUser({
      organizationId,
      userId: input.userId,
      limit: input.limit,
      since: input.since ? new Date(input.since) : undefined,
      unreadOnly: input.unreadOnly,
    });
  },

  async listForPartner(input: {
    organizationId?: string;
    partnerId: string;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<EnterpriseNotificationItem[]> {
    const organizationId = await resolveOrganizationId(input.organizationId);
    if (!this.isDurable()) {
      return [...softStore.values()]
        .filter(
          (n) =>
            n.organizationId === organizationId &&
            n.recipientKind === "partner" &&
            n.recipientPartnerId === input.partnerId &&
            (!input.unreadOnly || n.readState === "UNREAD"),
        )
        .sort(
          (a, b) =>
            new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
        )
        .slice(0, input.limit ?? 40);
    }
    return enterpriseNotificationRepository.listForPartner({
      organizationId,
      partnerId: input.partnerId,
      limit: input.limit,
      unreadOnly: input.unreadOnly,
    });
  },

  async markReadForUser(input: {
    id: string;
    userId: string;
    organizationId?: string;
  }): Promise<EnterpriseNotificationItem | null> {
    const organizationId = await resolveOrganizationId(input.organizationId);
    if (!this.isDurable()) {
      const row = softStore.get(input.id);
      if (!row || row.recipientUserId !== input.userId) return null;
      const next = {
        ...row,
        readState: "READ" as const,
        readAt: new Date().toISOString(),
      };
      softStore.set(input.id, next);
      return next;
    }
    return enterpriseNotificationRepository.markRead({
      id: input.id,
      organizationId,
      userId: input.userId,
    });
  },

  async markReadForPartner(input: {
    id: string;
    partnerId: string;
    organizationId?: string;
  }): Promise<EnterpriseNotificationItem | null> {
    const organizationId = await resolveOrganizationId(input.organizationId);
    if (!this.isDurable()) {
      const row = softStore.get(input.id);
      if (!row || row.recipientPartnerId !== input.partnerId) return null;
      const next = {
        ...row,
        readState: "READ" as const,
        readAt: new Date().toISOString(),
      };
      softStore.set(input.id, next);
      return next;
    }
    return enterpriseNotificationRepository.markRead({
      id: input.id,
      organizationId,
      partnerId: input.partnerId,
    });
  },

  async claimPendingToastsForUser(input: {
    userId: string;
    organizationId?: string;
    limit?: number;
  }): Promise<EnterpriseNotificationItem[]> {
    const organizationId = await resolveOrganizationId(input.organizationId);
    if (!this.isDurable()) {
      const now = new Date().toISOString();
      const pending = [...softStore.values()].filter(
        (n) =>
          n.organizationId === organizationId &&
          n.recipientKind === "user" &&
          n.recipientUserId === input.userId &&
          n.toastPresentedAt == null,
      );
      const claimed = pending
        .sort(
          (a, b) =>
            new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
        )
        .slice(0, input.limit ?? 20);
      for (const row of claimed) {
        const next = { ...row, toastPresentedAt: now };
        softStore.set(row.id, next);
      }
      return claimed.map((row) => softStore.get(row.id)!);
    }
    try {
      return await enterpriseNotificationRepository.claimPendingToastsForUser({
        organizationId,
        userId: input.userId,
        limit: input.limit,
      });
    } catch {
      return [];
    }
  },
};

/** Pure helpers exported for verification (no DB). */
export { buildRecipientRows, resolveNotificationRecipients };
