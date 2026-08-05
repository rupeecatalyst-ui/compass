/**
 * CO-WP-NOTIFY-001 — Partner Notification Center service.
 */

import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import { Prisma } from "@prisma/client";
import { PARTNER_NOTIFICATION_READ_STATE_KEY } from "@/constants/enterprise-partner-notification-center";
import { PARTNER_HOME_FEED_CATALOG } from "@/constants/enterprise-partner-home";
import type { PartnerNotificationCenterDto } from "@/types/enterprise-partner-notification-center";
import type { PartnerHomeNotificationDto } from "@/types/enterprise-partner-gateway";
import {
  PartnerGatewayError,
  resolvePartnerBindingForUser,
} from "./partner-binding.service";
import { partnerBusinessService } from "./partner-business.service";
import { loadEcmContactForPartner } from "./partner-customer-workspace.compose";
import {
  buildPartnerNotificationCenterDto,
  projectPartnerNotifications,
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

async function loadOpportunityDetails(userId: string, limit = 40) {
  try {
    const pipeline = await partnerBusinessService.getBusinessPipeline(userId);
    const rows = pipeline.opportunities.slice(0, Math.max(1, limit));
    const details = await Promise.all(
      rows.map(async (row) => {
        try {
          return await partnerBusinessService.getOpportunity(userId, row.opportunityId);
        } catch {
          return null;
        }
      }),
    );
    return details.filter(Boolean) as NonNullable<(typeof details)[number]>[];
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

export const partnerNotificationCenterService = {
  async getCenter(userId: string): Promise<PartnerNotificationCenterDto> {
    const binding = await resolvePartnerBindingForUser(userId);
    const partnerId = binding.partner.id;
    const readIds = await loadReadState(partnerId);
    const opportunities = await loadOpportunityDetails(userId);
    let customers: Awaited<ReturnType<typeof partnerBusinessService.searchCustomers>> = [];
    try {
      customers = await partnerBusinessService.searchCustomers(userId, "");
    } catch {
      customers = [];
    }

    const ecmContacts = await Promise.all(
      customers.slice(0, 40).map((c) => loadEcmContactForPartner(c.customerId)),
    );

    const items = projectPartnerNotifications({
      opportunities,
      customers,
      ecmContacts,
      partnerProfileJson:
        (binding.partner.profileJson as Record<string, unknown> | null) ?? null,
      campaignAnnouncements: campaignAnnouncementsFromExperience(),
      readIds,
    });

    return buildPartnerNotificationCenterDto(items);
  },

  /** Map to home panel DTO shape (backward compatible). */
  async listForHome(userId: string): Promise<PartnerHomeNotificationDto[]> {
    return this.listForHomeFast(userId);
  },

  /**
   * CO-PERF — Home-only notification projection.
   * Avoids full Notification Center cost (ECM×40 + second opportunity fan-out).
   */
  async listForHomeFast(
    userId: string,
    preloadedOpportunities?: Awaited<ReturnType<typeof loadOpportunityDetails>>,
  ): Promise<PartnerHomeNotificationDto[]> {
    const binding = await resolvePartnerBindingForUser(userId);
    const partnerId = binding.partner.id;
    const [readIds, opportunities] = await Promise.all([
      loadReadState(partnerId),
      preloadedOpportunities
        ? Promise.resolve(preloadedOpportunities)
        : loadOpportunityDetails(userId, 12),
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
    const center = await this.getCenter(userId);
    const hit = center.items.find((i) => i.id === notificationId);
    if (!hit) {
      throw new PartnerGatewayError("Notification not found", "NOT_FOUND", 404);
    }
    const readIds = await loadReadState(partnerId);
    readIds.add(notificationId);
    await saveReadState(partnerId, readIds);
    return this.getCenter(userId);
  },

  async markAllRead(userId: string): Promise<PartnerNotificationCenterDto> {
    const binding = await resolvePartnerBindingForUser(userId);
    const partnerId = binding.partner.id;
    const center = await this.getCenter(userId);
    const readIds = await loadReadState(partnerId);
    for (const item of center.items) readIds.add(item.id);
    await saveReadState(partnerId, readIds);
    return this.getCenter(userId);
  },
};
