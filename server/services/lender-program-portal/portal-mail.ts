/**
 * Lender portal mail uses the existing CUSTOMERS operational SMTP transport.
 * Credentials stay in the transport call and are not returned.
 */
import { isOperationalSmtpDeliveryEnabled } from "@/constants/enterprise-communication-center/operational-delivery";
import { resolveSmtpSecret } from "@/lib/enterprise-communication-center/smtp-secret-resolver";
import { enterpriseCommunicationCenterService } from "@server/services/enterprise-communication-center/ecc.service";
import { sendOperationalSmtpMessage } from "@server/services/enterprise-communication-center/smtp-transport.service";

export type PortalEmailDelivery = {
  ok: boolean;
  deliveryStatus: "sent" | "failed" | "disabled";
};

export async function sendLenderPortalEmail(input: {
  to: string;
  subject: string;
  textBody: string;
}): Promise<PortalEmailDelivery> {
  if (!isOperationalSmtpDeliveryEnabled()) {
    return { ok: false, deliveryStatus: "disabled" };
  }
  const profiles = await enterpriseCommunicationCenterService.listProfiles();
  const profile = profiles.find((item) => item.profileCode === "CUSTOMERS") ?? null;
  const host = profile?.smtpHost?.trim() || "";
  const port = profile?.smtpPort ?? null;
  const username = profile?.smtpUsername?.trim() || "";
  const fromEmail = profile?.senderEmail?.trim() || "";
  const replyTo = profile?.replyToEmail?.trim() || fromEmail;
  const secret = resolveSmtpSecret("CUSTOMERS");
  if (!profile?.active || profile.smtpProvider !== "smtp" || !host || !port || !username || !fromEmail || !replyTo || !secret) {
    return { ok: false, deliveryStatus: "failed" };
  }
  const sent = await sendOperationalSmtpMessage({
    host,
    port,
    username,
    password: secret,
    fromEmail,
    fromName: profile.displayName?.trim() || "Rupee Catalyst",
    replyToEmail: replyTo,
    to: [input.to],
    subject: input.subject,
    textBody: input.textBody,
    ehloName: "catalyst-one-lender-portal",
  });
  return sent.ok ? { ok: true, deliveryStatus: "sent" } : { ok: false, deliveryStatus: "failed" };
}
