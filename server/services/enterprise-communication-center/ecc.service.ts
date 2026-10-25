/**
 * CO-ECC-001 — Enterprise Communication Center service.
 */
import { ECC_COMMUNICATION_PROFILE_SEEDS, ECC_EVENT_MAPPINGS } from "@/constants/enterprise-communication-center";
import {
  identityFromProfileRecord,
  identityFromProfileSeed,
  resolveProfileCode,
} from "@/lib/enterprise-communication-center";
import type {
  EnterpriseCommunicationEventType,
  EnterpriseCommunicationProfileCode,
  UpdateCommunicationProfileInput,
} from "@/types/enterprise-communication-center";
import { isDatabaseAvailable } from "@server/lib/prisma";
import { mailboxProfileCode } from "@/lib/enterprise-communication-center/mailbox-profile";
import { smtpSecretEnvName } from "@/lib/enterprise-communication-center/smtp-secret-resolver";
import { marketingSenderIdentityStore } from "@server/services/enterprise-marketing-engine/sender-identity-store";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  enterpriseCommunicationCenterRepository,
  mapProfileRow,
} from "@server/repositories/enterprise-communication-center/ecc.repository";

export class EccError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = "EccError";
  }
}

function requireDb() {
  if (!isDatabaseAvailable()) {
    throw new EccError("Enterprise Communication Center requires database", "SERVICE_UNAVAILABLE", 503);
  }
}

export const enterpriseCommunicationCenterService = {
  async ensureProfilesSeeded(actor = "co-ecc-001") {
    requireDb();
    const organizationId = await resolvePilotOrganizationId();
    for (const seed of ECC_COMMUNICATION_PROFILE_SEEDS) {
      await enterpriseCommunicationCenterRepository.upsertFromSeed({
        organizationId,
        profileCode: seed.profileCode,
        displayName: seed.displayName,
        senderEmail: seed.senderEmail,
        replyToEmail: seed.replyToEmail,
        supportEmail: seed.supportEmail,
        supportPhone: seed.supportPhone,
        smtpProvider: seed.smtpProvider,
        signature: seed.signature,
        footer: seed.footer,
        usedFor: [...seed.usedFor],
        active: seed.active,
        modifiedBy: actor,
      });
    }
    return organizationId;
  },

  async listProfiles() {
    const organizationId = await this.ensureProfilesSeeded();
    const rows = await enterpriseCommunicationCenterRepository.listProfiles(organizationId);
    return rows.map(mapProfileRow);
  },

  /** Read one stored profile. Does not seed or create missing profiles. */
  async getStoredProfile(profileCode: string) {
    requireDb();
    const organizationId = await resolvePilotOrganizationId();
    const row = await enterpriseCommunicationCenterRepository.getByCode(
      organizationId,
      profileCode.trim(),
    );
    return row ? mapProfileRow(row) : null;
  },

  async getEventMappings() {
    return ECC_EVENT_MAPPINGS.map((m) => ({ ...m }));
  },

  async updateProfile(
    profileCode: EnterpriseCommunicationProfileCode,
    input: UpdateCommunicationProfileInput,
  ) {
    requireDb();
    const organizationId = await this.ensureProfilesSeeded(input.modifiedBy);
    if (input.senderEmail !== undefined && !input.senderEmail.trim()) {
      throw new EccError("Sender email is required", "SENDER_REQUIRED");
    }
    if (input.displayName !== undefined && !input.displayName.trim()) {
      throw new EccError("Display name is required", "DISPLAY_NAME_REQUIRED");
    }
    if (input.smtpPassword !== undefined) {
      throw new EccError(
        "SMTP credentials must be configured via server environment secrets (ECC_CUSTOMERS_SMTP_PASSWORD).",
        "SMTP_SECRET_ENV_ONLY",
        400,
      );
    }
    const row = await enterpriseCommunicationCenterRepository.updateProfile(
      organizationId,
      profileCode,
      input,
    );
    return mapProfileRow(row);
  },

  /**
   * Primary resolve API — modules pass an event type (preferred) or profile code.
   */
  async resolveIdentity(
    input:
      | { eventType: EnterpriseCommunicationEventType }
      | { profileCode: EnterpriseCommunicationProfileCode },
  ) {
    const profileCode = resolveProfileCode(input);
    const eventType = "eventType" in input ? input.eventType : undefined;

    if (!isDatabaseAvailable()) {
      return identityFromProfileSeed(profileCode, eventType);
    }

    try {
      const organizationId = await this.ensureProfilesSeeded();
      const row = await enterpriseCommunicationCenterRepository.getByCode(
        organizationId,
        profileCode,
      );
      if (row && row.active) {
        return identityFromProfileRecord(mapProfileRow(row), eventType);
      }
      if (row && !row.active) {
        throw new EccError(
          `Communication Profile ${profileCode} is inactive`,
          "PROFILE_INACTIVE",
          409,
        );
      }
    } catch (err) {
      if (err instanceof EccError) throw err;
      /* fall through to seed */
    }

    return identityFromProfileSeed(profileCode, eventType);
  },

  async createMailbox(input: {
    displayName: string;
    senderEmail: string;
    replyToEmail?: string | null;
    smtpHost: string;
    smtpPort: number;
    smtpUsername: string;
    modifiedBy: string;
  }) {
    requireDb();
    if (input.smtpPort !== 465 && input.smtpPort !== 587) {
      throw new EccError("SMTP port must be 465 or 587", "INVALID_PORT");
    }
    const senderEmail = input.senderEmail.trim().toLowerCase();
    if (!senderEmail.includes("@")) throw new EccError("A sender email is required", "SENDER_REQUIRED");
    const organizationId = await this.ensureProfilesSeeded(input.modifiedBy);
    const existing = await enterpriseCommunicationCenterRepository.listProfiles(organizationId);
    if (existing.some((row) => row.senderEmail.trim().toLowerCase() === senderEmail)) {
      throw new EccError("That sender address is already configured", "SENDER_EXISTS", 409);
    }
    const profileCode = mailboxProfileCode(senderEmail);
    if (existing.some((row) => row.profileCode === profileCode)) {
      throw new EccError("A mailbox profile for that address already exists", "SENDER_EXISTS", 409);
    }
    const row = await enterpriseCommunicationCenterRepository.createMailbox({
      organizationId,
      profileCode,
      displayName: input.displayName,
      senderEmail,
      replyToEmail: input.replyToEmail?.trim() || senderEmail,
      smtpHost: input.smtpHost,
      smtpPort: input.smtpPort,
      smtpUsername: input.smtpUsername,
      modifiedBy: input.modifiedBy,
    });
    const identity = await this.registerSender(profileCode, input.modifiedBy);
    return { profile: mapProfileRow(row), identity, credentialEnvName: smtpSecretEnvName(profileCode) };
  },

  async registerSender(profileCode: string, actorUserId: string) {
    requireDb();
    const organizationId = await resolvePilotOrganizationId();
    const row = await enterpriseCommunicationCenterRepository.getByCode(organizationId, profileCode);
    if (!row?.active) throw new EccError("Communication profile was not found", "PROFILE_NOT_FOUND", 404);
    if (row.smtpProvider !== "smtp" || !row.smtpHost || !row.smtpPort || !row.smtpUsername) {
      throw new EccError("Configure SMTP host, port, and username before registering this sender", "SMTP_NOT_CONFIGURED");
    }
    const listed = await marketingSenderIdentityStore.list(organizationId);
    const senderEmail = row.senderEmail.trim().toLowerCase();
    const existing = listed.find(
      (identity) =>
        identity.providerMapping.providerProfileId === row.profileCode ||
        identity.fromAddress.trim().toLowerCase() === senderEmail,
    );
    const sameAddress = existing?.fromAddress.trim().toLowerCase() === senderEmail;
    const saved = await marketingSenderIdentityStore.upsert({
      organizationId,
      id: existing?.id,
      displayName: row.displayName,
      fromAddress: senderEmail,
      replyTo: row.replyToEmail,
      active: true,
      simulated: false,
      providerType: "smtp",
      providerProfileId: row.profileCode,
      verificationStatus: sameAddress ? existing?.verificationStatus : "PENDING",
      approvalStatus: sameAddress ? existing?.approvalStatus : "DRAFT",
      createdByUserId: actorUserId,
    });
    return marketingSenderIdentityStore.toPublicDto(saved);
  },
};
