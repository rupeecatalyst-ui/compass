/**
 * CO-INV-001 — Enterprise Invitation Engine repository (Prisma).
 */
import type {
  EnterpriseInvitationAuditEvent,
  EnterpriseInvitationInviteeKind,
  EnterpriseInvitationStatus,
} from "@prisma/client";
import { prisma } from "@server/lib/prisma";

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export function mapInvitationRow(row: {
  id: string;
  organizationId: string;
  inviteeKind: EnterpriseInvitationInviteeKind;
  entityId: string;
  entityLabel: string | null;
  recipientEmail: string;
  recipientName: string;
  status: EnterpriseInvitationStatus;
  expiresAt: Date;
  activatedAt: Date | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  maxUses: number;
  useCount: number;
  previousInvitationId: string | null;
  redirectTarget: string;
  customRedirectUrl: string | null;
  lastSentAt: Date | null;
  deliveryMode: string | null;
  createdBy: string;
  modifiedBy: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    inviteeKind: row.inviteeKind,
    entityId: row.entityId,
    entityLabel: row.entityLabel,
    recipientEmail: row.recipientEmail,
    recipientName: row.recipientName,
    status: row.status,
    expiresAt: row.expiresAt.toISOString(),
    activatedAt: iso(row.activatedAt),
    cancelledAt: iso(row.cancelledAt),
    cancelledBy: row.cancelledBy,
    maxUses: row.maxUses,
    useCount: row.useCount,
    previousInvitationId: row.previousInvitationId,
    redirectTarget: row.redirectTarget as "catalyst_connect" | "catalyst_one" | "custom",
    customRedirectUrl: row.customRedirectUrl,
    lastSentAt: iso(row.lastSentAt),
    deliveryMode: (row.deliveryMode as "simulated" | "queued" | "live" | null) ?? null,
    createdBy: row.createdBy,
    modifiedBy: row.modifiedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const invitationEngineRepository = {
  async getCommunicationConfig(organizationId: string) {
    return prisma.enterpriseCommunicationConfig.findUnique({ where: { organizationId } });
  },

  async upsertCommunicationConfig(input: {
    organizationId: string;
    displayName: string;
    senderEmail: string;
    supportEmail: string;
    supportPhone?: string | null;
    modifiedBy: string;
  }) {
    return prisma.enterpriseCommunicationConfig.upsert({
      where: { organizationId: input.organizationId },
      create: {
        organizationId: input.organizationId,
        defaultSenderDisplayName: input.displayName,
        defaultSenderEmail: input.senderEmail,
        supportContactEmail: input.supportEmail,
        supportContactPhone: input.supportPhone ?? null,
        modifiedBy: input.modifiedBy,
      },
      update: {
        defaultSenderDisplayName: input.displayName,
        defaultSenderEmail: input.senderEmail,
        supportContactEmail: input.supportEmail,
        supportContactPhone: input.supportPhone ?? null,
        modifiedBy: input.modifiedBy,
      },
    });
  },

  async findActiveForEntity(
    organizationId: string,
    inviteeKind: EnterpriseInvitationInviteeKind,
    entityId: string,
  ) {
    return prisma.enterpriseInvitation.findFirst({
      where: {
        organizationId,
        inviteeKind,
        entityId,
        status: { in: ["draft", "link_generated", "invite_sent"] },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async listForEntity(
    organizationId: string,
    inviteeKind: EnterpriseInvitationInviteeKind,
    entityId: string,
  ) {
    return prisma.enterpriseInvitation.findMany({
      where: { organizationId, inviteeKind, entityId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  },

  async findByToken(token: string) {
    return prisma.enterpriseInvitation.findUnique({ where: { token } });
  },

  async findById(organizationId: string, id: string) {
    return prisma.enterpriseInvitation.findFirst({ where: { id, organizationId } });
  },

  async createInvitation(data: {
    organizationId: string;
    inviteeKind: EnterpriseInvitationInviteeKind;
    entityId: string;
    entityLabel?: string | null;
    recipientEmail: string;
    recipientName: string;
    status: EnterpriseInvitationStatus;
    token: string;
    tokenHash: string;
    expiresAt: Date;
    previousInvitationId?: string | null;
    redirectTarget?: string;
    createdBy: string;
  }) {
    return prisma.enterpriseInvitation.create({
      data: {
        organizationId: data.organizationId,
        inviteeKind: data.inviteeKind,
        entityId: data.entityId,
        entityLabel: data.entityLabel ?? null,
        recipientEmail: data.recipientEmail,
        recipientName: data.recipientName,
        status: data.status,
        token: data.token,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        previousInvitationId: data.previousInvitationId ?? null,
        redirectTarget: data.redirectTarget ?? "catalyst_connect",
        createdBy: data.createdBy,
        modifiedBy: data.createdBy,
      },
    });
  },

  async updateInvitation(
    id: string,
    data: {
      status?: EnterpriseInvitationStatus;
      expiresAt?: Date;
      token?: string;
      tokenHash?: string;
      activatedAt?: Date | null;
      cancelledAt?: Date | null;
      cancelledBy?: string | null;
      useCount?: number;
      lastSentAt?: Date | null;
      deliveryMode?: string | null;
      previousInvitationId?: string | null;
      modifiedBy: string;
    },
  ) {
    return prisma.enterpriseInvitation.update({ where: { id }, data });
  },

  async appendAudit(input: {
    organizationId: string;
    invitationId: string;
    eventType: EnterpriseInvitationAuditEvent;
    actorUserId?: string | null;
    actorLabel: string;
    detail?: string | null;
  }) {
    return prisma.enterpriseInvitationAudit.create({
      data: {
        organizationId: input.organizationId,
        invitationId: input.invitationId,
        eventType: input.eventType,
        actorUserId: input.actorUserId ?? null,
        actorLabel: input.actorLabel,
        detail: input.detail ?? null,
      },
    });
  },

  async listAudits(organizationId: string, invitationId: string) {
    return prisma.enterpriseInvitationAudit.findMany({
      where: { organizationId, invitationId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  },
};
