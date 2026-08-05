/**
 * CO-WP-NOTIFY-001 — Partner Enterprise Notification Center.
 * Notifications originate from Catalyst One events wherever applicable.
 */

export type PartnerNotificationKind =
  | "opportunity_update"
  | "missing_documents"
  | "approval"
  | "rejection"
  | "commission_released"
  | "task_reminder"
  | "birthday_reminder"
  | "campaign_announcement";

export type PartnerNotificationPriority = "critical" | "high" | "normal" | "low";

export type PartnerNotificationItemDto = {
  id: string;
  kind: PartnerNotificationKind;
  kindLabel: string;
  title: string;
  body: string;
  priority: PartnerNotificationPriority;
  read: boolean;
  deepLink: string;
  occurredAt: string;
  /** Presentation theme token */
  theme: string;
  icon: string;
  /** Compatible category for home notification panel filters */
  category: string;
  sortOrder: number;
  eventSource: string;
};

export type PartnerNotificationKindMetaDto = {
  id: PartnerNotificationKind;
  label: string;
};

export type PartnerNotificationCenterDto = {
  version: string;
  dtoSource: "enterprise_partner_notification_center";
  dtoNotice: string;
  generatedAt: string;
  unreadCount: number;
  items: PartnerNotificationItemDto[];
  kinds: PartnerNotificationKindMetaDto[];
  priorities: Array<{ id: PartnerNotificationPriority; label: string }>;
  markReadLabel: string;
  markAllReadLabel: string;
  emptyTitle: string;
  emptySubtitle: string;
};
