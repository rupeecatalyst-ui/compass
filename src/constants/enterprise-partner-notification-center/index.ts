/**
 * CO-WP-NOTIFY-001 — Partner Notification Center catalog (labels only).
 */

import type {
  PartnerNotificationKind,
  PartnerNotificationPriority,
} from "@/types/enterprise-partner-notification-center";

export const PARTNER_NOTIFICATION_CENTER_VERSION = "CO-WP-NOTIFY-001";

export const PARTNER_NOTIFICATION_KIND_META: ReadonlyArray<{
  id: PartnerNotificationKind;
  label: string;
  category: string;
  theme: string;
  icon: string;
}> = [
  {
    id: "opportunity_update",
    label: "Opportunity Updates",
    category: "business",
    theme: "teal",
    icon: "opportunity",
  },
  {
    id: "missing_documents",
    label: "Missing Documents",
    category: "business",
    theme: "amber",
    icon: "upload",
  },
  {
    id: "approval",
    label: "Approval",
    category: "business",
    theme: "mint",
    icon: "trophy",
  },
  {
    id: "rejection",
    label: "Rejection",
    category: "business",
    theme: "crimson",
    icon: "target",
  },
  {
    id: "commission_released",
    label: "Commission Released",
    category: "business",
    theme: "gold",
    icon: "gift",
  },
  {
    id: "task_reminder",
    label: "Task Reminder",
    category: "business",
    theme: "indigo",
    icon: "phone",
  },
  {
    id: "birthday_reminder",
    label: "Birthday Reminder",
    category: "customers",
    theme: "rose",
    icon: "ceo",
  },
  {
    id: "campaign_announcement",
    label: "Campaign Announcement",
    category: "campaigns",
    theme: "navy",
    icon: "campaign",
  },
];

export const PARTNER_NOTIFICATION_PRIORITY_META: ReadonlyArray<{
  id: PartnerNotificationPriority;
  label: string;
}> = [
  { id: "critical", label: "Critical" },
  { id: "high", label: "High" },
  { id: "normal", label: "Normal" },
  { id: "low", label: "Low" },
];

export const PARTNER_NOTIFICATION_READ_STATE_KEY = "partnerNotificationCenter";
