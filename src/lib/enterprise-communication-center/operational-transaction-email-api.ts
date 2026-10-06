import type { EmailRecipientSelections } from "@/lib/enterprise-communication-center/recipient-selection";
/**
 * CO-C1-COMMUNICATION-001 — Client API for unified transaction operational email.
 */

import { authenticatedJsonFetch } from "@/lib/api-client";
import type {
  CustomerFacingRecipientEvent,
  RecipientRouterResult,
  TransactionPrimaryToRole,
} from "@/lib/enterprise-communication-center/recipient-router";

export type OperationalEmailDeliveryStatus =
  | "sent"
  | "failed"
  | "disabled"
  | "recipient_unresolved";

export type TransactionOperationalEmailPreview = {
  initiatingSender?: { id: string; name: string; email: string };
  operationalDeliveryEnabled: boolean;
  enceExternalDeliveryEnabled: false;
  eventType: CustomerFacingRecipientEvent;
  primaryToRole: TransactionPrimaryToRole;
  recipientResolution: RecipientRouterResult;
  sender: {
    profileCode: "CUSTOMERS";
    senderEmail: string | null;
    replyToEmail: string | null;
    displayName: string | null;
  } | null;
};

export type TransactionOperationalEmailResult = {
  ok: boolean;
  deliveryStatus: OperationalEmailDeliveryStatus;
  eventType: CustomerFacingRecipientEvent;
  opportunityId: string;
  dealId: string | null;
  senderProfileCode: "CUSTOMERS";
  senderEmail: string | null;
  replyToEmail: string | null;
  to: string[];
  cc: string[];
  subject: string;
  message: string;
  smtpResponse: string | null;
  failureCode: string | null;
  sourceEventId: string;
  messageId: string | null;
};

export async function previewTransactionOperationalEmail(input: {
  opportunityId: string;
  dealId?: string | null;
  eventType?: CustomerFacingRecipientEvent;
  primaryToRole?: TransactionPrimaryToRole;
  internalUserId?: string | null;
  includePrimaryTo?: EmailRecipientSelections["includePrimaryTo"];
  toRecipients?: EmailRecipientSelections["toRecipients"];
  ccRecipients?: EmailRecipientSelections["ccRecipients"];
}): Promise<TransactionOperationalEmailPreview> {
  const res = await authenticatedJsonFetch("/api/enterprise-transaction-email/preview", {
    method: "POST",
    body: JSON.stringify({
      opportunityId: input.opportunityId,
      dealId: input.dealId ?? null,
      eventType: input.eventType ?? "customer_communication",
      primaryToRole: input.primaryToRole ?? "customer",
      internalUserId: input.internalUserId ?? null,
      includePrimaryTo: input.includePrimaryTo,
      toRecipients: input.toRecipients,
      ccRecipients: input.ccRecipients,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || "Failed to preview recipients");
  }
  return (json?.data ?? json) as TransactionOperationalEmailPreview;
}

export async function sendTransactionOperationalEmail(input: {
  opportunityId: string;
  dealId?: string | null;
  eventType?: CustomerFacingRecipientEvent;
  primaryToRole?: TransactionPrimaryToRole;
  internalUserId?: string | null;
  includePrimaryTo?: EmailRecipientSelections["includePrimaryTo"];
  toRecipients?: EmailRecipientSelections["toRecipients"];
  ccRecipients?: EmailRecipientSelections["ccRecipients"];
  subject: string;
  textBody: string;
  customerDisplayName?: string | null;
  opportunityReference?: string | null;
  documentIds?: string[];
}): Promise<TransactionOperationalEmailResult> {
  const res = await authenticatedJsonFetch("/api/enterprise-transaction-email/send", {
    method: "POST",
    body: JSON.stringify({
      opportunityId: input.opportunityId,
      dealId: input.dealId ?? null,
      eventType: input.eventType ?? "customer_communication",
      primaryToRole: input.primaryToRole ?? "customer",
      internalUserId: input.internalUserId ?? null,
      includePrimaryTo: input.includePrimaryTo,
      toRecipients: input.toRecipients,
      ccRecipients: input.ccRecipients,
      subject: input.subject,
      textBody: input.textBody,
      customerDisplayName: input.customerDisplayName ?? null,
      opportunityReference: input.opportunityReference ?? null,
      documentIds: input.documentIds ?? [],
    }),
  });
  const json = await res.json().catch(() => ({}));
  const data = (json?.data ?? json) as TransactionOperationalEmailResult;
  if (!res.ok) {
    throw new Error(json?.error?.message || "Failed to send transaction email");
  }
  return data;
}

export async function searchTransactionEmailRecipients(input: { opportunityId: string; dealId?: string | null; search: string }): Promise<import("./recipient-selection").EmailRecipientOption[]> {
  const params = new URLSearchParams({ opportunityId: input.opportunityId, search: input.search });
  if (input.dealId) params.set("dealId", input.dealId);
  const response = await authenticatedJsonFetch(`/api/enterprise-transaction-email/recipients?${params}`, { method: "GET" });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.error?.message || "Recipient search failed");
  return json.data ?? json;
}
