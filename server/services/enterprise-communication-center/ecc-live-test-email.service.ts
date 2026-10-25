/**
 * One live ECC mailbox test. Uses the same SMTP transport as Deal Workspace email.
 * Does not enable organisation-wide operational delivery and does not retry.
 */

import type { EnterpriseCommunicationProfileRecord } from "@/types/enterprise-communication-center";
import { resolveSmtpSecret } from "@/lib/enterprise-communication-center/smtp-secret-resolver";
import {
  sendOperationalSmtpMessage,
  type OperationalSmtpSendResult,
} from "@server/services/enterprise-communication-center/smtp-transport.service";

export const ECC_LIVE_TEST_CONFIRMATION = "SEND TEST" as const;

export type EccLiveTestOutcome = "submitted" | "failed" | "ambiguous";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function assessEccLiveTestRequest(input: {
  role?: string | null;
  confirmationPhrase?: string | null;
  recipientEmail?: string | null;
}): { ok: true; recipientEmail: string } | { ok: false; code: string; message: string } {
  if (input.role !== "SUPER_ADMIN") {
    return { ok: false, code: "FORBIDDEN", message: "Super Admin confirmation is required." };
  }
  if ((input.confirmationPhrase ?? "").trim() !== ECC_LIVE_TEST_CONFIRMATION) {
    return {
      ok: false,
      code: "CONFIRMATION_REQUIRED",
      message: "Type SEND TEST to send one live test email.",
    };
  }
  const recipientEmail = (input.recipientEmail ?? "").trim().toLowerCase();
  if (!recipientEmail || !EMAIL_RE.test(recipientEmail) || recipientEmail.includes(",") || recipientEmail.includes(";")) {
    return { ok: false, code: "RECIPIENT_REQUIRED", message: "Enter exactly one test recipient email address." };
  }
  return { ok: true, recipientEmail };
}

export function classifyOperationalSmtpSubmission(
  result: Pick<OperationalSmtpSendResult, "ok" | "message" | "smtpResponse">,
): EccLiveTestOutcome {
  if (result.ok && (result.smtpResponse ?? "").startsWith("250")) return "submitted";
  const message = result.message.toLowerCase();
  if (
    message.includes("timed out") ||
    message.includes("connection error") ||
    message.includes("socket") ||
    (result.ok && !(result.smtpResponse ?? "").startsWith("250"))
  ) {
    return "ambiguous";
  }
  return "failed";
}

export async function runEccLiveTestEmail(input: {
  profile: Pick<
    EnterpriseCommunicationProfileRecord,
    | "profileCode"
    | "displayName"
    | "senderEmail"
    | "replyToEmail"
    | "smtpProvider"
    | "smtpHost"
    | "smtpPort"
    | "smtpUsername"
    | "active"
  >;
  recipientEmail: string;
  send?: typeof sendOperationalSmtpMessage;
}): Promise<{
  outcome: EccLiveTestOutcome;
  message: string;
  smtpResponse: string | null;
  senderEmail: string | null;
}> {
  const host = input.profile.smtpHost?.trim() || "";
  const port = input.profile.smtpPort ?? null;
  const username = input.profile.smtpUsername?.trim() || "";
  const senderEmail = input.profile.senderEmail?.trim() || "";
  const replyTo = input.profile.replyToEmail?.trim() || senderEmail;
  const secret = resolveSmtpSecret(input.profile.profileCode);
  if (!input.profile.active || input.profile.smtpProvider !== "smtp" || !host || !port || !username || !senderEmail || !secret) {
    return {
      outcome: "failed",
      message: "The selected mailbox is missing SMTP host, port, username, From address, or its server credential.",
      smtpResponse: null,
      senderEmail: senderEmail || null,
    };
  }
  const send = input.send ?? sendOperationalSmtpMessage;
  let result: OperationalSmtpSendResult;
  try {
    result = await send({
      host,
      port,
      username,
      password: secret,
      fromEmail: senderEmail,
      fromName: input.profile.displayName?.trim() || senderEmail,
      replyToEmail: replyTo,
      to: [input.recipientEmail],
      cc: [],
      subject: "Catalyst One — mailbox live test",
      textBody: `This is one controlled test from ${senderEmail}. It confirms provider submission only.`,
      ehloName: "catalyst-one-ecc-live-test",
    });
  } catch (err) {
    return {
      outcome: "ambiguous",
      message: err instanceof Error ? err.message : "SMTP submission ended without a provider response.",
      smtpResponse: null,
      senderEmail,
    };
  }
  const outcome = classifyOperationalSmtpSubmission(result);
  return {
    outcome,
    message:
      outcome === "submitted"
        ? "The provider accepted the message. Inbox delivery is not confirmed."
        : outcome === "ambiguous"
          ? "The provider result is ambiguous. The test was not retried."
          : result.message,
    smtpResponse: result.smtpResponse,
    senderEmail,
  };
}
