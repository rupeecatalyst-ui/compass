/**
 * CO-C1-OPERATIONAL-EMAIL-002 — Client API for server-side document request email.
 */

import { authenticatedJsonFetch } from "@/lib/api-client";
import type { RecipientRouterResult } from "@/lib/enterprise-communication-center/recipient-router";

export type DocumentRequestOperationalEmailPreview = {
  operationalDeliveryEnabled: boolean;
  enceExternalDeliveryEnabled: false;
  eventType: "document_request";
  recipientResolution: RecipientRouterResult;
  sender: {
    profileCode: "CUSTOMERS";
    senderEmail: string | null;
    replyToEmail: string | null;
    displayName: string | null;
  } | null;
};

export type DocumentRequestOperationalEmailResult = {
  ok: boolean;
  deliveryStatus: "sent" | "failed" | "disabled" | "recipient_unresolved";
  eventType: "document_request";
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
};

export async function previewDocumentRequestOperationalEmail(
  opportunityId: string,
  dealId?: string | null,
): Promise<DocumentRequestOperationalEmailPreview> {
  const res = await authenticatedJsonFetch(
    `/api/enterprise-opportunities/${encodeURIComponent(opportunityId)}/document-request/operational-email/preview`,
    {
      method: "POST",
      body: JSON.stringify({ dealId: dealId ?? null }),
    },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || "Failed to preview recipients");
  }
  return (json?.data ?? json) as DocumentRequestOperationalEmailPreview;
}

export async function sendDocumentRequestOperationalEmail(input: {
  opportunityId: string;
  uploadUrl: string;
  customerDisplayName: string;
  loanProduct: string;
  borrowerType: string;
  constitution: string;
  opportunityReference: string;
  asReminder?: boolean;
  testSubject?: string;
  documentSummary?: string;
  dealId?: string | null;
}): Promise<DocumentRequestOperationalEmailResult> {
  const res = await authenticatedJsonFetch(
    `/api/enterprise-opportunities/${encodeURIComponent(input.opportunityId)}/document-request/operational-email/send`,
    {
      method: "POST",
      body: JSON.stringify({
        uploadUrl: input.uploadUrl,
        customerDisplayName: input.customerDisplayName,
        loanProduct: input.loanProduct,
        borrowerType: input.borrowerType,
        constitution: input.constitution,
        asReminder: input.asReminder ?? false,
        testSubject: input.testSubject,
        documentSummary: input.documentSummary,
        dealId: input.dealId ?? null,
      }),
    },
  );
  const json = await res.json().catch(() => ({}));
  const data = (json?.data ?? json) as DocumentRequestOperationalEmailResult;
  if (!res.ok && !data?.deliveryStatus) {
    throw new Error(json?.error?.message || "Failed to send document request email");
  }
  return data;
}
