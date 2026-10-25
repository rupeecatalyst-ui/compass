/**
 * Projects an Enterprise Communication Center profile into the existing Marketing
 * SMTP transport for one controlled send. The password stays in the profile's
 * server environment variable and is never returned to the client.
 */

import { MARKETING_SMTP_ENV } from "@/constants/enterprise-marketing-engine/hostinger-smtp";
import { resolveSmtpSecret } from "@/lib/enterprise-communication-center/smtp-secret-resolver";
import { enterpriseCommunicationCenterRepository } from "@server/repositories/enterprise-communication-center/ecc.repository";
import { resolveMarketingOrganizationId } from "./organization";

export async function projectSenderSmtpEnv(sender: {
  fromAddress: string;
  displayName: string;
  replyTo?: string | null;
  providerProfileId?: string | null;
}): Promise<Record<string, string | undefined> | null> {
  try {
    const organizationId = await resolveMarketingOrganizationId();
    const requested = sender.fromAddress.trim().toLowerCase();
    const code = sender.providerProfileId?.trim();
    const row = code
      ? await enterpriseCommunicationCenterRepository.getByCode(organizationId, code)
      : (await enterpriseCommunicationCenterRepository.listProfiles(organizationId)).find(
          (profile) => profile.senderEmail.trim().toLowerCase() === requested,
        ) ?? null;
    if (!row?.active || row.smtpProvider !== "smtp") return null;
    if (row.senderEmail.trim().toLowerCase() !== requested) return null;
    const host = row.smtpHost?.trim() || "";
    const port = row.smtpPort ?? null;
    const username = row.smtpUsername?.trim() || "";
    const secret = resolveSmtpSecret(row.profileCode);
    if (!host || !port || !username || !secret) return null;
    const replyTo = sender.replyTo?.trim() || row.replyToEmail?.trim() || requested;
    return {
      [MARKETING_SMTP_ENV.host]: host,
      [MARKETING_SMTP_ENV.port]: String(port),
      [MARKETING_SMTP_ENV.secure]: port === 465 ? "true" : "false",
      [MARKETING_SMTP_ENV.username]: username,
      [MARKETING_SMTP_ENV.password]: secret,
      [MARKETING_SMTP_ENV.fromEmail]: requested,
      [MARKETING_SMTP_ENV.fromName]: sender.displayName.trim(),
      [MARKETING_SMTP_ENV.replyTo]: replyTo,
    };
  } catch {
    return null;
  }
}
