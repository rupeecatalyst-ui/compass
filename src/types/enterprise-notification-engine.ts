/**
 * CO-NOTIFICATION-001 — Enterprise Notification Engine types.
 * In-app notification delivery SSOT (not EAR chronology; not ENCE outbound).
 */

export type EnterpriseNotificationEventType =
  | "CONTACT_CREATED"
  | "OPPORTUNITY_CREATED"
  | "DEAL_CREATED"
  | "DEAL_STAGE_CHANGED"
  | "DOCUMENT_REQUESTED"
  | "DOCUMENT_UPLOADED"
  | "APPROVAL_RECEIVED"
  | "DISBURSEMENT"
  | "TASK_ASSIGNED"
  | "TASK_DUE"
  | "IMPORTANT_WORKFLOW_ACTION"
  | "MARKETING_QUALIFIED_HANDOFF";

export type EnterpriseNotificationRecipientKind = "user" | "partner";

export type EnterpriseNotificationReadState = "UNREAD" | "READ";

export type EnterpriseNotificationItem = {
  id: string;
  organizationId: string;
  eventType: EnterpriseNotificationEventType | string;
  /** Idempotency: eventType + sourceEventId + recipient */
  dedupeKey: string;
  sourceEventId: string;
  sourceSystem: string;
  title: string;
  body: string;
  description: string | null;
  actorUserId: string | null;
  actorName: string | null;
  recipientKind: EnterpriseNotificationRecipientKind;
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
  readState: EnterpriseNotificationReadState;
  readAt: string | null;
  occurredAt: string;
  createdAt: string;
};

export type FanOutEnterpriseNotificationInput = {
  organizationId: string;
  eventType: EnterpriseNotificationEventType | string;
  sourceEventId: string;
  sourceSystem: string;
  title: string;
  body: string;
  description?: string | null;
  actorUserId?: string | null;
  actorName?: string | null;
  opportunityId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  customerName?: string | null;
  productLabel?: string | null;
  amountLabel?: string | null;
  previousValue?: string | null;
  newValue?: string | null;
  href: string;
  /** When set, only these users are notified — default manager/admin fan-out is skipped. */
  explicitRecipientUserIds?: string[];
  /** Optional partner who owns the transaction (for partner-visible external events). */
  sourceWealthPartnerId?: string | null;
  occurredAt?: string | Date;
};

export type ListEnterpriseNotificationsQuery = {
  limit?: number;
  since?: string;
  unreadOnly?: boolean;
};

export type EnterpriseNotificationSoundPreference = {
  soundEnabled: boolean;
  updatedAt: string;
};
