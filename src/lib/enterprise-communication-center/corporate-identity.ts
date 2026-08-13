/**
 * CO-C1-FOLLOWUP-002 — Corporate signature / channel identity builders.
 * Reuses ECC profile identity + centrally managed brand defaults.
 * Does not invent Marketing campaign senders.
 */

import { RUPEE_CATALYST_CORPORATE_BRAND } from "@/constants/enterprise-communication-center/corporate-branding";
import { identityFromProfileSeed } from "@/lib/enterprise-communication-center/resolve-profile";
import type { EnterpriseCommunicationProfileCode } from "@/types/enterprise-communication-center";

const EMAIL_SIG_MARKER = "— Rupee Catalyst Corporate Signature —";
const WA_ID_MARKER = "— Rupee Catalyst —";

export function buildCorporateEmailSignature(input: {
  senderDisplayName: string;
  profileCode?: EnterpriseCommunicationProfileCode;
}): string {
  const profile = identityFromProfileSeed(input.profileCode ?? "CUSTOMERS");
  const brand = RUPEE_CATALYST_CORPORATE_BRAND;
  const sender = input.senderDisplayName.trim() || profile.displayName;
  const channels = brand.marketingChannels
    .map((c) => `${c.label}: ${c.url}`)
    .join("\n");
  const address = brand.addressLines.join("\n");
  const profileSig = (profile.signature || "").trim();
  const profileFooter = (profile.footer || "").trim();

  return [
    EMAIL_SIG_MARKER,
    sender,
    brand.legalName,
    profileSig || brand.tagline,
    address,
    `Website: ${brand.websiteUrl}`,
    channels,
    profile.supportPhone || brand.supportPhone
      ? `Support: ${profile.supportPhone || brand.supportPhone}`
      : "",
    profileFooter,
    `[Logo: ${profile.logoUrl || brand.logoPath}]`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Plain-text WhatsApp identity — never paste HTML email signature blocks. */
export function buildCorporateWhatsAppIdentity(input: {
  senderDisplayName: string;
}): string {
  const brand = RUPEE_CATALYST_CORPORATE_BRAND;
  const sender = input.senderDisplayName.trim() || brand.legalName;
  return [
    WA_ID_MARKER,
    `${sender} · ${brand.legalName}`,
    brand.websiteUrl,
    brand.supportPhone,
  ].join("\n");
}

export function appendCorporateEmailSignature(
  body: string,
  input: { senderDisplayName: string; profileCode?: EnterpriseCommunicationProfileCode },
): string {
  const trimmed = body.trimEnd();
  if (trimmed.includes(EMAIL_SIG_MARKER)) return trimmed;
  return `${trimmed}\n\n${buildCorporateEmailSignature(input)}`;
}

export function appendCorporateWhatsAppIdentity(
  body: string,
  input: { senderDisplayName: string },
): string {
  const trimmed = body.trimEnd();
  if (trimmed.includes(WA_ID_MARKER)) return trimmed;
  return `${trimmed}\n\n${buildCorporateWhatsAppIdentity(input)}`;
}
