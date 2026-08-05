/**
 * CO-ECC-001 — Sender seed re-exports from Communication Profiles (configuration data).
 * Application modules must not hardcode addresses — resolve via ECC event mapping.
 */
import { getCommunicationProfileSeed } from "@/constants/enterprise-communication-center";

export const ENTERPRISE_COMMUNICATION_CONFIG_KEY = "enterprise_communication_sender";

/** @deprecated Use ECC_COMMUNICATION_PROFILE_SEEDS / CHANNEL_PARTNERS profile. */
export const ENTERPRISE_COMMUNICATION_SENDER_SEED = (() => {
  const p = getCommunicationProfileSeed("CHANNEL_PARTNERS");
  return {
    displayName: p.displayName,
    senderEmail: p.senderEmail,
    supportEmail: p.supportEmail,
    supportPhone: p.supportPhone,
  } as const;
})();

export const ENTERPRISE_COMMUNICATION_ENV = {
  fromEmail: "ENTERPRISE_TRANSACTIONAL_FROM_EMAIL",
  fromName: "ENTERPRISE_TRANSACTIONAL_FROM_NAME",
  supportEmail: "ENTERPRISE_SUPPORT_EMAIL",
  supportPhone: "ENTERPRISE_SUPPORT_PHONE",
  catalystConnectUrl: "NEXT_PUBLIC_CATALYST_CONNECT_URL",
} as const;
