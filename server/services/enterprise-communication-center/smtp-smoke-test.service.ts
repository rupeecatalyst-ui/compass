/**
 * CO-C1-OPERATIONAL-EMAIL-001C — Super Admin SMTP smoke test.
 * Sends exactly one message to an explicitly entered recipient via CUSTOMERS profile.
 * Does not enable ENCE or unrestricted operational email.
 */

import type { EnterpriseCommunicationProfileRecord } from "@/types/enterprise-communication-center";
import { resolveSmtpSecret } from "@/lib/enterprise-communication-center/smtp-secret-resolver";
import { sendOperationalSmtpMessage } from "@server/services/enterprise-communication-center/smtp-transport.service";

export type SmtpSmokeTestResult = {
  ok: boolean;
  profileCode: string;
  recipientEmail: string;
  senderEmail: string | null;
  host: string | null;
  port: number | null;
  credentialSource: "env" | "missing";
  message: string;
  smtpResponse: string | null;
};

const SUBJECT = "Catalyst One — Connect SMTP Live Test";

export async function runCustomersSmtpSmokeTest(input: {
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
}): Promise<SmtpSmokeTestResult> {
  const recipientEmail = input.recipientEmail.trim().toLowerCase();
  const host = input.profile.smtpHost?.trim() || null;
  const port = input.profile.smtpPort ?? null;
  const username = input.profile.smtpUsername?.trim() || null;
  const senderEmail = input.profile.senderEmail?.trim() || null;
  const replyToEmail =
    input.profile.replyToEmail?.trim() || input.profile.senderEmail?.trim() || null;
  const secret = resolveSmtpSecret(input.profile.profileCode);
  const credentialSource = secret ? ("env" as const) : ("missing" as const);

  if (input.profile.profileCode !== "CUSTOMERS") {
    return {
      ok: false,
      profileCode: input.profile.profileCode,
      recipientEmail,
      senderEmail,
      host,
      port,
      credentialSource,
      message: "Smoke test is limited to the CUSTOMERS profile.",
      smtpResponse: null,
    };
  }

  if (!input.profile.active || input.profile.smtpProvider !== "smtp") {
    return {
      ok: false,
      profileCode: input.profile.profileCode,
      recipientEmail,
      senderEmail,
      host,
      port,
      credentialSource,
      message: "CUSTOMERS profile is inactive or SMTP provider is not configured.",
      smtpResponse: null,
    };
  }

  if (!host || !port || !username || !senderEmail || !replyToEmail) {
    return {
      ok: false,
      profileCode: input.profile.profileCode,
      recipientEmail,
      senderEmail,
      host,
      port,
      credentialSource,
      message: "SMTP host, port, username, sender email, and reply-to must be configured.",
      smtpResponse: null,
    };
  }

  if (!secret) {
    return {
      ok: false,
      profileCode: input.profile.profileCode,
      recipientEmail,
      senderEmail,
      host,
      port,
      credentialSource,
      message: "Hostinger SMTP credential is not configured (ECC_CUSTOMERS_SMTP_PASSWORD).",
      smtpResponse: null,
    };
  }

  const send = await sendOperationalSmtpMessage({
    host,
    port,
    username,
    password: secret,
    fromEmail: senderEmail,
    fromName: input.profile.displayName?.trim() || "Rupee Catalyst Connect",
    replyToEmail,
    to: [recipientEmail],
    cc: [],
    subject: SUBJECT,
    textBody:
      "This is a controlled Catalyst One operational email test from connect@rupeecatalyst.com.",
    ehloName: "catalyst-one-smoke-test",
  });

  return {
    ok: send.ok,
    profileCode: input.profile.profileCode,
    recipientEmail,
    senderEmail,
    host,
    port,
    credentialSource,
    message: send.ok ? "SMTP smoke test message accepted by server." : send.message,
    smtpResponse: send.smtpResponse,
  };
}
