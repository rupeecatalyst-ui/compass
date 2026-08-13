/**
 * CO-ECC-001 — Communication Profile seed catalogue (configuration data only).
 * Runtime callers must resolve via Enterprise Communication Center — never import
 * sender emails into module business logic.
 */
import type {
  EnterpriseCommunicationProfileCode,
  EnterpriseCommunicationSmtpProvider,
} from "@/types/enterprise-communication-center";

export const CO_ECC_001_VERSION = 1;

export interface CommunicationProfileSeed {
  profileCode: EnterpriseCommunicationProfileCode;
  displayName: string;
  senderEmail: string;
  replyToEmail: string;
  supportEmail: string;
  supportPhone: string;
  smtpProvider: EnterpriseCommunicationSmtpProvider;
  signature: string;
  footer: string;
  usedFor: string[];
  active: boolean;
}

export const ECC_COMMUNICATION_PROFILE_SEEDS: readonly CommunicationProfileSeed[] = [
  {
    profileCode: "CHANNEL_PARTNERS",
    displayName: "Rupee Catalyst Champion",
    senderEmail: "champion@rupeecatalyst.com",
    replyToEmail: "champion@rupeecatalyst.com",
    supportEmail: "champion@rupeecatalyst.com",
    supportPhone: "+91 98219 84181",
    smtpProvider: "none",
    signature: "Rupee Catalyst Champion Desk",
    footer: "Rupee Catalyst — Funding Growth. Building Wealth.",
    usedFor: [
      "Wealth Partner Invitations",
      "Wealth Partner Activation",
      "Channel Partner Communication",
      "Referral Partner Communication",
      "Partner Announcements",
    ],
    active: true,
  },
  {
    profileCode: "CUSTOMERS",
    displayName: "Rupee Catalyst Connect",
    senderEmail: "connect@rupeecatalyst.com",
    replyToEmail: "connect@rupeecatalyst.com",
    supportEmail: "connect@rupeecatalyst.com",
    supportPhone: "+91 98219 84181",
    smtpProvider: "none",
    signature:
      "Rupee Catalyst Connect\nFunding Growth. Building Wealth.\nhttps://www.rupeecatalyst.com",
    footer:
      "Rupee Catalyst — Official operational communication. Corporate signature is centrally managed.",
    usedFor: [
      "Customer Invitations",
      "Customer Notifications",
      "Loan Status Updates",
      "Document Requests",
      "Customer Communications",
      "Operational Follow-ups",
    ],
    active: true,
  },
] as const;

export function getCommunicationProfileSeed(
  profileCode: EnterpriseCommunicationProfileCode,
): CommunicationProfileSeed {
  const row = ECC_COMMUNICATION_PROFILE_SEEDS.find((p) => p.profileCode === profileCode);
  if (!row) {
    throw new Error(`Unknown communication profile seed: ${profileCode}`);
  }
  return row;
}
