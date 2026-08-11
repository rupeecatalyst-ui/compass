/**
 * CO-WP-NOTIFY-001 — Partner Notification Center service.
 * CO-WP-PERF-005 — Center path reuses pipeline store projections (Home parity):
 * no N× getOpportunity hydrate, no searchCustomers(""), no duplicate ECM fan-out.
 */

import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import { Prisma } from "@prisma/client";
import { PARTNER_NOTIFICATION_READ_STATE_KEY } from "@/constants/enterprise-partner-notification-center";
import { PARTNER_HOME_FEED_CATALOG } from "@/constants/enterprise-partner-home";
import type { PartnerNotificationCenterDto } from "@/types/enterprise-partner-notification-center";
import type { PartnerHomeNotificationDto } from "@/types/enterprise-partner-gateway";
import type { PartnerOpportunityDetailDto } from "@/types/enterprise-partner-business";
import {
  PartnerGatewayError,
  resolvePartnerBindingForUser,
} from "./partner-binding.service";
import { partnerBusinessService } from "./partner-business.service";
import { partnerOwnershipService } from "./partner-ownership.service";
import {
  buildPartnerNotificationCenterDto,
  projectPartnerNotifications,
  type PartnerNotificationBirthdayContact,
} from "./partner-notification-center.compose";

type ReadState = { readIds: string[] };

async function loadReadState(partnerId: string): Promise<Set<string>> {
  if (!isDatabaseAvailable()) return new Set();
  try {
    const row = await prisma.enterpriseWealthPartner.findUnique({
      where: { id: partnerId },
      select: { profileJson: true },
    });
    const profile =
      row?.profileJson && typeof row.profileJson === "object" && !Array.isArray(row.profileJson)
        ? (row.profileJson as Record<string, unknown>)
        : {};
    const slice = profile[PARTNER_NOTIFICATION_READ_STATE_KEY];
    if (!slice || typeof slice !== "object" || Array.isArray(slice)) return new Set();
    const ids = (slice as ReadState).readIds;
    return new Set(Array.isArray(ids) ? ids.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

async function saveReadState(partnerId: string, readIds: Set<string>): Promise<void> {
  if (!isDatabaseAvailable()) return;
  const row = await prisma.enterpriseWealthPartner.findUnique({
    where: { id: partnerId },
    select: { profileJson: true },
  });
  const prev =
    row?.profileJson && typeof row.profileJson === "object" && !Array.isArray(row.profileJson)
      ? { ...(row.profileJson as Record<string, unknown>) }
      : {};
  prev[PARTNER_NOTIFICATION_READ_STATE_KEY] = {
    readIds: [...readIds].slice(-500),
    updatedAt: new Date().toISOString(),
  };
  await prisma.enterpriseWealthPartner.update({
    where: { id: partnerId },
    data: { profileJson: prev as Prisma.InputJsonValue },
  });
}

/**
 * Opportunity details for notifications — pipeline store only (no docs/notes hydrate).
 */
async function loadOpportunityDetailsForNotifications(
  userId: string,
  limit = 40,
): Promise<PartnerOpportunityDetailDto[]> {
  try {
    const pipeline = await partnerBusinessService.getBusinessPipeline(userId);
    const ids = pipeline.opportunities
      .slice(0, Math.max(1, limit))
      .map((row) => row.opportunityId)
      .filter(Boolean);
    if (ids.length === 0) return [];
    return partnerBusinessService.listCachedOpportunityDetailsForHome(userId, ids);
  } catch {
    return [];
  }
}

/** Birthday enrichment — one batched ECM read for owned customer ids (no searchCustomers). */
async function loadBirthdayContacts(input: {
  organizationId: string;
  wealthPartnerId: string;
  limit?: number;
}): Promise<PartnerNotificationBirthdayContact[]> {
  if (!isDatabaseAvailable()) return [];
  try {
    const owned = await partnerOwnershipService.listOwnedCustomerIds({
      organizationId: input.organizationId,
      wealthPartnerId: input.wealthPartnerId,
      limit: input.limit ?? 40,
    });
    const ids = owned
      .slice(0, Math.max(1, input.limit ?? 40))
      .map((c) => c.customerId)
      .filter(Boolean);
    if (ids.length === 0) return [];

    const rows = await prisma.ecmContact.findMany({
      where: {
        id: { in: ids },
        isDeleted: false,
        dateOfBirth: { not: null },
      },
      select: {
        id: true,
        name: true,
        dateOfBirth: true,
      },
    });

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      dateOfBirth: r.dateOfBirth ?? undefined,
    }));
  } catch {
    return [];
  }
}

function campaignAnnouncementsFromExperience() {
  return PARTNER_HOME_FEED_CATALOG.filter((item) =>
    String(item.contentType || "")
      .toLowerCase()
      .includes("campaign"),
  ).map((item, index) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle || "Campaign announcement from Enterprise.",
    deepLink: item.deepLink || "/app/campaigns",
    publishedAt:
      item.publishedAt ||
      new Date(Date.now() - (index + 1) * 3_600_000 * 6).toISOString(),
  }));
}

function withUpdatedReadFlags(
  center: PartnerNotificationCenterDto,
  readIds: Set<string>,
): PartnerNotificationCenterDto {
  const items = center.items.map((item) => ({
    ...item,
    read: readIds.has(item.id),
  }));
  return {
    ...center,
    items,
    unreadCount: items.filter((i) => !i.read).length,
    generatedAt: new Date().toISOString(),
  };
}

export const partnerNotificationCenterService = {
  async getCenter(userId: string): Promise<PartnerNotificationCenterDto> {
    const binding = await resolvePartnerBindingForUser(userId);
    const partnerId = binding.partner.id;
    const organizationId = binding.partner.organizationId;

    const [readIds, opportunities, ecmContacts, eneItems] = await Promise.all([
      loadReadState(partnerId),
      loadOpportunityDetailsForNotifications(userId, 40),
      loadBirthdayContacts({ organizationId, wealthPartnerId: partnerId, limit: 40 }),
      (async () => {
        try {
          const { enterpriseNotificationService } = await import(
            "@server/services/enterprise-notification/enterprise-notification.service"
          );
          return enterpriseNotificationService.listForPartner({
            organizationId,
            partnerId,
            limit: 40,
          });
        } catch {
          return [];
        }
      })(),
    ]);

    const projected = projectPartnerNotifications({
      opportunities,
      customers: [],
      ecmContacts,
      partnerProfileJson:
        (binding.partner.profileJson as Record<string, unknown> | null) ?? null,
      campaignAnnouncements: campaignAnnouncementsFromExperience(),
      readIds,
    });

    // CO-NOTIFICATION-001 — merge Gateway-authorized ENE partner rows (never unrestricted)
    const eneMapped = eneItems.map((n, index) => {
      const deepLink = n.dealId
        ? `/app/deals/${encodeURIComponent(n.dealId)}`
        : n.opportunityId
          ? `/app/opportunities/${encodeURIComponent(n.opportunityId)}`
          : "/app/notifications";
      return {
        id: n.id,
        kind: "opportunity_update" as const,
        kindLabel: "Opportunity update",
        title: n.title,
        body: n.body,
        priority: "high" as const,
        read: n.readState === "READ" || readIds.has(n.id),
        deepLink,
        occurredAt: n.occurredAt,
        theme: "teal",
        icon: "bell",
        category: "opportunity",
        sortOrder: index,
        eventSource: "enterprise_notification_engine",
      };
    });

    const byId = new Map<string, (typeof projected)[number]>();
    for (const item of [...eneMapped, ...projected]) byId.set(item.id, item);
    const items = [...byId.values()].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );

    return buildPartnerNotificationCenterDto(items);
  },

  /** Map to home panel DTO shape (backward compatible). */
  async listForHome(userId: string): Promise<PartnerHomeNotificationDto[]> {
    return this.listForHomeFast(userId);
  },

  /**
   * CO-PERF — Home-only notification projection.
   * Avoids full Notification Center cost (ECM scan + opportunity fan-out).
   */
  async listForHomeFast(
    userId: string,
    preloadedOpportunities?: PartnerOpportunityDetailDto[],
  ): Promise<PartnerHomeNotificationDto[]> {
    const binding = await resolvePartnerBindingForUser(userId);
    const partnerId = binding.partner.id;
    const [readIds, opportunities] = await Promise.all([
      loadReadState(partnerId),
      preloadedOpportunities
        ? Promise.resolve(preloadedOpportunities)
        : loadOpportunityDetailsForNotifications(userId, 12),
    ]);

    const items = projectPartnerNotifications({
      opportunities,
      customers: [],
      ecmContacts: [],
      partnerProfileJson:
        (binding.partner.profileJson as Record<string, unknown> | null) ?? null,
      campaignAnnouncements: campaignAnnouncementsFromExperience(),
      readIds,
    });

    return items.slice(0, 12).map((n) => ({
      id: n.id,
      category: n.category,
      icon: n.icon,
      title: n.title,
      subtitle: n.body,
      publishedAt: n.occurredAt,
      priority: n.priority,
      read: n.read,
      deepLink: n.deepLink,
      theme: n.theme,
      sortOrder: n.sortOrder,
    }));
  },

  async markRead(userId: string, notificationId: string): Promise<PartnerNotificationCenterDto> {
    const binding = await resolvePartnerBindingForUser(userId);
    const partnerId = binding.partner.id;
    const organizationId = binding.partner.organizationId;
    try {
      const { enterpriseNotificationService } = await import(
        "@server/services/enterprise-notification/enterprise-notification.service"
      );
      await enterpriseNotificationService.markReadForPartner({
        id: notificationId,
        partnerId,
        organizationId,
      });
    } catch {
      /* projected ids still use profileJson read state */
    }
    const center = await this.getCenter(userId);
    const hit = center.items.find((i) => i.id === notificationId);
    if (!hit) {
      throw new PartnerGatewayError("Notification not found", "NOT_FOUND", 404);
    }
    const readIds = await loadReadState(partnerId);
    readIds.add(notificationId);
    await saveReadState(partnerId, readIds);
    return withUpdatedReadFlags(center, readIds);
  },

  async markAllRead(userId: string): Promise<PartnerNotificationCenterDto> {
    const binding = await resolvePartnerBindingForUser(userId);
    const partnerId = binding.partner.id;
    const center = await this.getCenter(userId);
    const readIds = await loadReadState(partnerId);
    for (const item of center.items) readIds.add(item.id);
    await saveReadState(partnerId, readIds);
    return withUpdatedReadFlags(center, readIds);
  },
};
