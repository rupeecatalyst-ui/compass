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
};
