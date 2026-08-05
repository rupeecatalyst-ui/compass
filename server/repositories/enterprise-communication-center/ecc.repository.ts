/**
 * CO-ECC-001 — Communication Profile repository.
 */
import { prisma } from "@server/lib/prisma";
import type {
  EnterpriseCommunicationProfileCode,
  EnterpriseCommunicationProfileRecord,
  EnterpriseCommunicationSmtpProvider,
  UpdateCommunicationProfileInput,
} from "@/types/enterprise-communication-center";

function usedForFromJson(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

export function mapProfileRow(row: {
  id: string;
  organizationId: string;
  profileCode: string;
  displayName: string;
  senderEmail: string;
  replyToEmail: string | null;
  smtpProvider: string;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUsername: string | null;
  smtpPasswordEnc: string | null;
  signature: string | null;
  footer: string | null;
  logoUrl: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  usedForJson: unknown;
  active: boolean;
  modifiedBy: string;
  createdAt: Date;
  updatedAt: Date;
}): EnterpriseCommunicationProfileRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    profileCode: row.profileCode as EnterpriseCommunicationProfileCode,
    displayName: row.displayName,
    senderEmail: row.senderEmail,
    replyToEmail: row.replyToEmail,
    smtpProvider: row.smtpProvider as EnterpriseCommunicationSmtpProvider,
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort,
    smtpUsername: row.smtpUsername,
    smtpCredentialConfigured: Boolean(row.smtpPasswordEnc),
    signature: row.signature,
    footer: row.footer,
    logoUrl: row.logoUrl,
    supportEmail: row.supportEmail,
    supportPhone: row.supportPhone,
    usedFor: usedForFromJson(row.usedForJson),
    active: row.active,
    modifiedBy: row.modifiedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const enterpriseCommunicationCenterRepository = {
  async listProfiles(organizationId: string) {
    return prisma.enterpriseCommunicationProfile.findMany({
      where: { organizationId },
      orderBy: { profileCode: "asc" },
    });
  },

  async getByCode(organizationId: string, profileCode: string) {
    return prisma.enterpriseCommunicationProfile.findUnique({
      where: {
        organizationId_profileCode: { organizationId, profileCode },
      },
    });
  },

  async upsertFromSeed(input: {
    organizationId: string;
    profileCode: string;
    displayName: string;
    senderEmail: string;
    replyToEmail: string;
    supportEmail: string;
    supportPhone: string;
    smtpProvider: string;
    signature: string;
    footer: string;
    usedFor: string[];
    active: boolean;
    modifiedBy: string;
  }) {
    return prisma.enterpriseCommunicationProfile.upsert({
      where: {
        organizationId_profileCode: {
          organizationId: input.organizationId,
          profileCode: input.profileCode,
        },
      },
      create: {
        organizationId: input.organizationId,
        profileCode: input.profileCode,
        displayName: input.displayName,
        senderEmail: input.senderEmail,
        replyToEmail: input.replyToEmail,
        supportEmail: input.supportEmail,
        supportPhone: input.supportPhone,
        smtpProvider: input.smtpProvider,
        signature: input.signature,
        footer: input.footer,
        usedForJson: input.usedFor,
        active: input.active,
        modifiedBy: input.modifiedBy,
      },
      update: {},
    });
  },

  async updateProfile(
    organizationId: string,
    profileCode: string,
    input: UpdateCommunicationProfileInput,
  ) {
    const data: Record<string, unknown> = {
      modifiedBy: input.modifiedBy,
    };
    if (input.displayName !== undefined) data.displayName = input.displayName.trim();
    if (input.senderEmail !== undefined) {
      data.senderEmail = input.senderEmail.trim().toLowerCase();
    }
    if (input.replyToEmail !== undefined) {
      data.replyToEmail = input.replyToEmail?.trim().toLowerCase() || null;
    }
    if (input.smtpProvider !== undefined) data.smtpProvider = input.smtpProvider;
    if (input.smtpHost !== undefined) data.smtpHost = input.smtpHost?.trim() || null;
    if (input.smtpPort !== undefined) data.smtpPort = input.smtpPort;
    if (input.smtpUsername !== undefined) {
      data.smtpUsername = input.smtpUsername?.trim() || null;
    }
    if (input.smtpPassword !== undefined) {
      data.smtpPasswordEnc = input.smtpPassword?.trim()
        ? Buffer.from(input.smtpPassword.trim(), "utf8").toString("base64")
        : null;
    }
    if (input.signature !== undefined) data.signature = input.signature;
    if (input.footer !== undefined) data.footer = input.footer;
    if (input.logoUrl !== undefined) data.logoUrl = input.logoUrl?.trim() || null;
    if (input.supportEmail !== undefined) {
      data.supportEmail = input.supportEmail?.trim().toLowerCase() || null;
    }
    if (input.supportPhone !== undefined) {
      data.supportPhone = input.supportPhone?.trim() || null;
    }
    if (input.usedFor !== undefined) data.usedForJson = input.usedFor;
    if (input.active !== undefined) data.active = input.active;

    return prisma.enterpriseCommunicationProfile.update({
      where: {
        organizationId_profileCode: { organizationId, profileCode },
      },
      data,
    });
  },
};
