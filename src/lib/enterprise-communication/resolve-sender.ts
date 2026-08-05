/**
 * CO-ECC-001 / CO-INV-001 — Compatibility resolve for legacy invitation callers.
 * Prefer `enterpriseCommunicationCenterService.resolveIdentity({ eventType })`.
 */
import { ENTERPRISE_COMMUNICATION_ENV } from "@/constants/enterprise-communication/sender-config";
import { identityFromProfileSeed } from "@/lib/enterprise-communication-center";
import type { EnterpriseCommunicationSenderConfig } from "@/types/enterprise-invitation-engine";

export type ResolvedCommunicationSender = {
  displayName: string;
  senderEmail: string;
  supportEmail: string;
  supportPhone: string | null;
  replyToEmail?: string | null;
  profileCode?: string;
  source: "org_config" | "org_profile" | "env" | "seed" | "profile_seed";
};

/**
 * @deprecated Prefer ECC resolveIdentity with an event type.
 * Kept for INV-001 compatibility; CHANNEL_PARTNERS profile is the default partner sender.
 */
export function resolveSenderFromLayers(input?: {
  orgConfig?: Pick<
    EnterpriseCommunicationSenderConfig,
    "displayName" | "senderEmail" | "supportEmail" | "supportPhone"
  > | null;
  env?: NodeJS.ProcessEnv;
}): ResolvedCommunicationSender {
  const env = input?.env ?? process.env;
  const org = input?.orgConfig;

  if (org?.senderEmail?.trim() && org.displayName?.trim()) {
    return {
      displayName: org.displayName.trim(),
      senderEmail: org.senderEmail.trim().toLowerCase(),
      supportEmail: (org.supportEmail || org.senderEmail).trim().toLowerCase(),
      supportPhone: org.supportPhone?.trim() || null,
      source: "org_config",
    };
  }

  const envEmail = env[ENTERPRISE_COMMUNICATION_ENV.fromEmail]?.trim();
  const envName = env[ENTERPRISE_COMMUNICATION_ENV.fromName]?.trim();
  if (envEmail) {
    const seed = identityFromProfileSeed("CHANNEL_PARTNERS");
    return {
      displayName: envName || seed.displayName,
      senderEmail: envEmail.toLowerCase(),
      supportEmail: (
        env[ENTERPRISE_COMMUNICATION_ENV.supportEmail]?.trim() || envEmail
      ).toLowerCase(),
      supportPhone: env[ENTERPRISE_COMMUNICATION_ENV.supportPhone]?.trim() || null,
      source: "env",
    };
  }

  const seed = identityFromProfileSeed("CHANNEL_PARTNERS");
  return {
    displayName: seed.displayName,
    senderEmail: seed.senderEmail,
    supportEmail: seed.supportEmail || seed.senderEmail,
    supportPhone: seed.supportPhone,
    replyToEmail: seed.replyToEmail,
    profileCode: seed.profileCode,
    source: "profile_seed",
  };
}

export function resolveCatalystConnectRedirectUrl(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env[ENTERPRISE_COMMUNICATION_ENV.catalystConnectUrl]?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return "/login?portal=catalyst-connect";
}
