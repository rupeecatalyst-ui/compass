/**
 * CO-MARKETING-MKT-01 — Internal Notification Port (contract only).
 * Future: reuse Enterprise Notification Engine + CHANAKYA persona.
 * Must not create a second notification engine.
 */

export type MarketingAssigneeNotifyRequest = {
  organizationId: string;
  assigneeUserId: string;
  qualificationId: string;
  campaignId: string;
  campaignName?: string | null;
  sourceLabel?: string | null;
  qualificationReason: string;
  contactId?: string | null;
  contactName?: string | null;
  opportunityId?: string | null;
  requiredAction: string;
  occurredAt?: string;
  href: string;
  channels: {
    inApp: boolean;
    email: boolean;
    whatsapp: boolean;
  };
};

export type MarketingNotificationPort = {
  notifyAssignee(request: MarketingAssigneeNotifyRequest): Promise<{
    notificationId: string | null;
    duplicate: boolean;
    channelResults: Array<{ channel: "in_app" | "email" | "whatsapp"; status: string }>;
  }>;
};
