/**
 * CO-WP-NOTIFY-001 — Project Partner notifications from Catalyst One events.
 */

import {
  PARTNER_NOTIFICATION_CENTER_VERSION,
  PARTNER_NOTIFICATION_KIND_META,
  PARTNER_NOTIFICATION_PRIORITY_META,
} from "@/constants/enterprise-partner-notification-center";
import type { PartnerOpportunityDetailDto } from "@/types/enterprise-partner-business";
import type { PartnerCustomerSearchHitDto } from "@/types/enterprise-partner-business";
import type {
  PartnerNotificationCenterDto,
  PartnerNotificationItemDto,
  PartnerNotificationKind,
  PartnerNotificationPriority,
} from "@/types/enterprise-partner-notification-center";
/** Minimal ECM fields required for birthday notification projection. */
export type PartnerNotificationBirthdayContact = {
  id: string;
  name: string;
  dateOfBirth?: string;
};

function kindMeta(kind: PartnerNotificationKind) {
  return PARTNER_NOTIFICATION_KIND_META.find((k) => k.id === kind)!;
}

function priorityRank(p: PartnerNotificationPriority): number {
  if (p === "critical") return 0;
  if (p === "high") return 1;
  if (p === "normal") return 2;
  return 3;
}

function stageLooksApproved(stage: string, life: string): boolean {
  const s = stage.toLowerCase();
  const l = life.toLowerCase();
  return (
    s.includes("sanction") ||
    s.includes("approved") ||
    s.includes("decision") ||
    l === "won"
  );
}

function stageLooksRejected(stage: string, life: string): boolean {
  const s = stage.toLowerCase();
  const l = life.toLowerCase();
  return s.includes("reject") || s.includes("declin") || l === "lost";
}

function birthdayWindow(dob: string | undefined, now = new Date()): "today" | "tomorrow" | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) {
    // Accept YYYY-MM-DD without timezone issues
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob);
    if (!m) return null;
    const month = Number(m[2]) - 1;
    const day = Number(m[3]);
    const todayM = now.getMonth();
    const todayD = now.getDate();
    if (month === todayM && day === todayD) return "today";
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (month === tomorrow.getMonth() && day === tomorrow.getDate()) return "tomorrow";
    return null;
  }
  const month = d.getMonth();
  const day = d.getDate();
  if (month === now.getMonth() && day === now.getDate()) return "today";
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (month === tomorrow.getMonth() && day === tomorrow.getDate()) return "tomorrow";
  return null;
}

export function projectPartnerNotifications(input: {
  opportunities: PartnerOpportunityDetailDto[];
  customers: PartnerCustomerSearchHitDto[];
  ecmContacts?: Array<PartnerNotificationBirthdayContact | null>;
  partnerProfileJson?: Record<string, unknown> | null;
  campaignAnnouncements?: Array<{
    id: string;
    title: string;
    subtitle: string;
    deepLink: string;
    publishedAt: string;
  }>;
  readIds: Set<string>;
}): PartnerNotificationItemDto[] {
  const items: PartnerNotificationItemDto[] = [];
  let sort = 10;

  for (const o of input.opportunities) {
    const progress = o.businessTimeline?.currentLabel || o.stageLabel;
    const baseLink = `/app/opportunities/${o.opportunityId}`;

    // Opportunity Updates — recent activity / timeline
    const latestActivity = [...(o.activities ?? [])].sort((a, b) =>
      a.occurredAt < b.occurredAt ? 1 : -1,
    )[0];
    if (latestActivity) {
      const id = `evt-opp-upd-${o.opportunityId}-${latestActivity.activityId}`;
      const meta = kindMeta("opportunity_update");
      items.push({
        id,
        kind: "opportunity_update",
        kindLabel: meta.label,
        title: latestActivity.title || `Update on ${o.reference}`,
        body: `${o.customerDisplayName} · ${progress} · ${latestActivity.kindLabel}`,
        priority: "normal",
        read: input.readIds.has(id),
        deepLink: baseLink,
        occurredAt: latestActivity.occurredAt || o.updatedAt,
        theme: meta.theme,
        icon: meta.icon,
        category: meta.category,
        sortOrder: sort++,
        eventSource: "opportunity_activity",
      });
    } else if (o.updatedAt) {
      const id = `evt-opp-upd-${o.opportunityId}`;
      const meta = kindMeta("opportunity_update");
      items.push({
        id,
        kind: "opportunity_update",
        kindLabel: meta.label,
        title: `${o.reference} updated`,
        body: `${o.customerDisplayName} · ${progress}`,
        priority: "low",
        read: input.readIds.has(id),
        deepLink: baseLink,
        occurredAt: o.updatedAt,
        theme: meta.theme,
        icon: meta.icon,
        category: meta.category,
        sortOrder: sort++,
        eventSource: "opportunity_updated_at",
      });
    }

    // Missing Documents
    const missingLabels =
      o.lod?.ready && o.lod.summary.missing > 0
        ? o.lod.items.filter((i) => i.missing || i.status === "missing" || i.status === "rejected").map((i) => i.label)
        : (o.missingItems ?? []).filter((m) => m !== "Loan Amount");
    if (missingLabels.length > 0) {
      const id = `evt-docs-${o.opportunityId}`;
      const meta = kindMeta("missing_documents");
      items.push({
        id,
        kind: "missing_documents",
        kindLabel: meta.label,
        title: `Documents pending — ${o.reference}`,
        body: `${o.customerDisplayName}: ${missingLabels.slice(0, 3).join(", ")}${missingLabels.length > 3 ? "…" : ""}`,
        priority: missingLabels.length >= 3 ? "high" : "normal",
        read: input.readIds.has(id),
        deepLink: `${baseLink}/documents`,
        occurredAt: o.updatedAt,
        theme: meta.theme,
        icon: meta.icon,
        category: meta.category,
        sortOrder: sort++,
        eventSource: "enterprise_lod",
      });
    }

    // Approval / Rejection from stage events
    if (stageLooksApproved(o.stageLabel, o.lifecycleStatus)) {
      const id = `evt-approval-${o.opportunityId}`;
      const meta = kindMeta("approval");
      items.push({
        id,
        kind: "approval",
        kindLabel: meta.label,
        title: `Approval update — ${o.reference}`,
        body: `${o.customerDisplayName} · ${progress}`,
        priority: "high",
        read: input.readIds.has(id),
        deepLink: baseLink,
        occurredAt: o.updatedAt,
        theme: meta.theme,
        icon: meta.icon,
        category: meta.category,
        sortOrder: sort++,
        eventSource: "opportunity_stage",
      });
    }
    if (stageLooksRejected(o.stageLabel, o.lifecycleStatus)) {
      const id = `evt-rejection-${o.opportunityId}`;
      const meta = kindMeta("rejection");
      items.push({
        id,
        kind: "rejection",
        kindLabel: meta.label,
        title: `Rejection update — ${o.reference}`,
        body: `${o.customerDisplayName} · ${progress}`,
        priority: "high",
        read: input.readIds.has(id),
        deepLink: baseLink,
        occurredAt: o.updatedAt,
        theme: meta.theme,
        icon: meta.icon,
        category: meta.category,
        sortOrder: sort++,
        eventSource: "opportunity_stage",
      });
    }

    // Task reminders
    for (const t of o.upcomingTasks ?? []) {
      const id = `evt-task-${t.taskId}`;
      const meta = kindMeta("task_reminder");
      items.push({
        id,
        kind: "task_reminder",
        kindLabel: meta.label,
        title: t.title,
        body: `${o.customerDisplayName} · ${t.dueLabel || "Due soon"}`,
        priority: /overdue|past/i.test(t.dueLabel || "") ? "critical" : "high",
        read: input.readIds.has(id),
        deepLink: baseLink,
        occurredAt: o.updatedAt,
        theme: meta.theme,
        icon: meta.icon,
        category: meta.category,
        sortOrder: sort++,
        eventSource: "enterprise_task_engine",
      });
    }
  }

  // Commission Released — from partner commercial profile events
  const profile = input.partnerProfileJson ?? null;
  const commissionEvent = profile?.commissionReleasedAt;
  const commissionLabel = profile?.commissionReleasedLabel;
  if (typeof commissionEvent === "string" && commissionEvent) {
    const id = "evt-commission-released";
    const meta = kindMeta("commission_released");
    items.push({
      id,
      kind: "commission_released",
      kindLabel: meta.label,
      title: "Commission released",
      body:
        typeof commissionLabel === "string" && commissionLabel
          ? commissionLabel
          : "A commission payout event was recorded for your partner profile.",
      priority: "high",
      read: input.readIds.has(id),
      deepLink: "/app/business",
      occurredAt: commissionEvent,
      theme: meta.theme,
      icon: meta.icon,
      category: meta.category,
      sortOrder: sort++,
      eventSource: "wealth_partner_commercial",
    });
  }

  // Birthday reminders — ECM Contact DOB
  for (const ecm of input.ecmContacts ?? []) {
    if (!ecm?.dateOfBirth) continue;
    const window = birthdayWindow(ecm.dateOfBirth);
    if (!window) continue;
    const id = `evt-bday-${ecm.id}-${window}`;
    const meta = kindMeta("birthday_reminder");
    items.push({
      id,
      kind: "birthday_reminder",
      kindLabel: meta.label,
      title: window === "today" ? `${ecm.name}'s birthday today` : `${ecm.name}'s birthday tomorrow`,
      body: "Send a warm note — relationship moments matter.",
      priority: "normal",
      read: input.readIds.has(id),
      deepLink: `/app/customers/${ecm.id}`,
      occurredAt: new Date().toISOString(),
      theme: meta.theme,
      icon: meta.icon,
      category: meta.category,
      sortOrder: sort++,
      eventSource: "enterprise_customer_registry",
    });
  }

  // Campaign announcements — Experience Engine published campaigns (enterprise events)
  for (const c of input.campaignAnnouncements ?? []) {
    const id = `evt-campaign-${c.id}`;
    const meta = kindMeta("campaign_announcement");
    items.push({
      id,
      kind: "campaign_announcement",
      kindLabel: meta.label,
      title: c.title,
      body: c.subtitle,
      priority: "normal",
      read: input.readIds.has(id),
      deepLink: c.deepLink || "/app/campaigns",
      occurredAt: c.publishedAt,
      theme: meta.theme,
      icon: meta.icon,
      category: meta.category,
      sortOrder: sort++,
      eventSource: "experience_engine_campaign",
    });
  }

  return items.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    const pr = priorityRank(a.priority) - priorityRank(b.priority);
    if (pr !== 0) return pr;
    return a.occurredAt < b.occurredAt ? 1 : -1;
  });
}

export function buildPartnerNotificationCenterDto(
  items: PartnerNotificationItemDto[],
): PartnerNotificationCenterDto {
  return {
    version: PARTNER_NOTIFICATION_CENTER_VERSION,
    dtoSource: "enterprise_partner_notification_center",
    dtoNotice:
      "Enterprise Notification Center. Items originate from Catalyst One events wherever applicable.",
    generatedAt: new Date().toISOString(),
    unreadCount: items.filter((i) => !i.read).length,
    items,
    kinds: PARTNER_NOTIFICATION_KIND_META.map((k) => ({ id: k.id, label: k.label })),
    priorities: PARTNER_NOTIFICATION_PRIORITY_META.map((p) => ({ ...p })),
    markReadLabel: "Mark read",
    markAllReadLabel: "Mark all read",
    emptyTitle: "You're all caught up",
    emptySubtitle: "Opportunity, document, task, and campaign events from Catalyst One will appear here.",
  };
}
