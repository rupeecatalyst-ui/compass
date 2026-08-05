/**
 * CO-ECC-001 — Resolve Communication Profile for an event or profile code.
 * Modules never choose raw email addresses.
 */
import {
  getCommunicationProfileSeed,
  resolveProfileCodeForEvent,
} from "@/constants/enterprise-communication-center";
import type {
  EnterpriseCommunicationEventType,
  EnterpriseCommunicationProfileCode,
  EnterpriseCommunicationProfileRecord,
  ResolvedCommunicationIdentity,
} from "@/types/enterprise-communication-center";

export function identityFromProfileRecord(
  profile: EnterpriseCommunicationProfileRecord,
  eventType?: EnterpriseCommunicationEventType,
): ResolvedCommunicationIdentity {
  return {
    eventType,
    profileCode: profile.profileCode,
    displayName: profile.displayName,
    senderEmail: profile.senderEmail,
    replyToEmail: profile.replyToEmail ?? null,
    supportEmail: profile.supportEmail ?? null,
    supportPhone: profile.supportPhone ?? null,
    signature: profile.signature ?? null,
    footer: profile.footer ?? null,
    logoUrl: profile.logoUrl ?? null,
    active: profile.active,
    source: "org_profile",
  };
}

export function identityFromProfileSeed(
  profileCode: EnterpriseCommunicationProfileCode,
  eventType?: EnterpriseCommunicationEventType,
): ResolvedCommunicationIdentity {
  const seed = getCommunicationProfileSeed(profileCode);
  return {
    eventType,
    profileCode: seed.profileCode,
    displayName: seed.displayName,
    senderEmail: seed.senderEmail,
    replyToEmail: seed.replyToEmail,
    supportEmail: seed.supportEmail,
    supportPhone: seed.supportPhone,
    signature: seed.signature,
    footer: seed.footer,
    logoUrl: null,
    active: seed.active,
    source: "profile_seed",
  };
}

export function resolveProfileCode(
  input:
    | { eventType: EnterpriseCommunicationEventType; profileCode?: never }
    | { profileCode: EnterpriseCommunicationProfileCode; eventType?: never },
): EnterpriseCommunicationProfileCode {
  if ("eventType" in input && input.eventType) {
    return resolveProfileCodeForEvent(input.eventType);
  }
  return input.profileCode;
}
