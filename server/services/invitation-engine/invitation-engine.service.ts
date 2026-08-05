/**
 * CO-INV-001 — Enterprise Invitation Engine service.
 * Generic invite lifecycle; adapters supply entity-specific activation side effects.
 */
import { ENCE_EXTERNAL_DELIVERY_ENABLED } from "@/constants/enterprise-notification-communication-engine";
import {
  ENTERPRISE_INVITATION_DEFAULT_TTL_DAYS,
  ENTERPRISE_INVITATION_INVITEE_KIND_LABELS,
} from "@/constants/enterprise-invitation-engine";
import { buildInvitationEmail } from "@/lib/enterprise-invitation-engine/email-template";
import {
  buildAbsoluteActivationUrl,
  generateEnterpriseInvitationToken,
  hashEnterpriseInvitationToken,
  invitationExpiresAt,
} from "@/lib/enterprise-invitation-engine/security";
import { resolveCatalystConnectRedirectUrl } from "@/lib/enterprise-communication/resolve-sender";
import { simulateEnceCommunication } from "@/lib/enterprise-notification-communication-engine";
import type {
  ActivateInvitationInput,
  ActivateInvitationResult,
  EnterpriseInvitationInviteeKind,
  EnterpriseInvitationRecord,
  InvitationEmailPayload,
} from "@/types/enterprise-invitation-engine";
import { isDatabaseAvailable, prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  invitationEngineRepository,
  mapInvitationRow,
} from "@server/repositories/invitation-engine/invitation-engine.repository";
import { enterpriseCommunicationCenterService } from "@server/services/enterprise-communication-center/ecc.service";
import { hashPassword } from "@server/utils/password";

export class InvitationEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = "InvitationEngineError";
  }
}

export type InvitationActivationAdapter = {
  inviteeKind: EnterpriseInvitationInviteeKind;
  resolveRecipient: (entityId: string) => Promise<{
    email: string;
    name: string;
    label?: string | null;
  }>;
  onActivated: (input: {
    entityId: string;
    invitationId: string;
    userId: string;
    email: string;
    fullName: string;
    mobile?: string | null;
    profileCity?: string | null;
    actorUserId: string;
  }) => Promise<void>;
};

const adapters = new Map<EnterpriseInvitationInviteeKind, InvitationActivationAdapter>();

export function registerInvitationAdapter(adapter: InvitationActivationAdapter) {
  adapters.set(adapter.inviteeKind, adapter);
}

function requireDb() {
  if (!isDatabaseAvailable()) {
    throw new InvitationEngineError(
      "Enterprise Invitation Engine requires database persistence",
      "SERVICE_UNAVAILABLE",
      503,
    );
  }
}

async function markExpiredIfNeeded(row: {
  id: string;
  organizationId: string;
  status: string;
  expiresAt: Date;
}) {
  if (
    (row.status === "link_generated" || row.status === "invite_sent" || row.status === "draft") &&
    row.expiresAt.getTime() <= Date.now()
  ) {
    await invitationEngineRepository.updateInvitation(row.id, {
      status: "expired",
      modifiedBy: "system",
    });
    await invitationEngineRepository.appendAudit({
      organizationId: row.organizationId,
      invitationId: row.id,
      eventType: "expired",
      actorLabel: "system",
      detail: "Invitation expired",
    });
    return true;
  }
  return false;
}

/** CO-ECC-001 — Wealth Partner invites resolve via CHANNEL_PARTNERS profile. */
async function resolveInvitationSender() {
  const identity = await enterpriseCommunicationCenterService.resolveIdentity({
    eventType: "wealth_partner_invitation",
  });
  return {
    displayName: identity.displayName,
    senderEmail: identity.senderEmail,
    supportEmail: identity.supportEmail || identity.senderEmail,
    supportPhone: identity.supportPhone,
    replyToEmail: identity.replyToEmail,
    profileCode: identity.profileCode,
    source: identity.source,
  };
}

function publicInvitation(
  row: Parameters<typeof mapInvitationRow>[0],
  activationToken?: string,
): EnterpriseInvitationRecord {
  return {
    ...mapInvitationRow(row),
    activationToken: activationToken ?? null,
  };
}

export const invitationEngineService = {
  async getSenderConfig() {
    requireDb();
    return resolveInvitationSender();
  },

  async updateSenderConfig(input: {
    displayName: string;
    senderEmail: string;
    supportEmail: string;
    supportPhone?: string | null;
    actorUserId: string;
  }) {
    requireDb();
    /** Admin updates go to CHANNEL_PARTNERS profile (ECC SSOT). */
    await enterpriseCommunicationCenterService.updateProfile("CHANNEL_PARTNERS", {
      displayName: input.displayName,
      senderEmail: input.senderEmail,
      supportEmail: input.supportEmail,
      supportPhone: input.supportPhone,
      modifiedBy: input.actorUserId,
    });
    return resolveInvitationSender();
  },

  async getEntityInvitationState(
    inviteeKind: EnterpriseInvitationInviteeKind,
    entityId: string,
  ) {
    requireDb();
    const organizationId = await resolvePilotOrganizationId();
    const rows = await invitationEngineRepository.listForEntity(
      organizationId,
      inviteeKind,
      entityId,
    );
    for (const row of rows) {
      await markExpiredIfNeeded(row);
    }
    const refreshed = await invitationEngineRepository.listForEntity(
      organizationId,
      inviteeKind,
      entityId,
    );
    const current = refreshed[0] ? publicInvitation(refreshed[0]) : null;
    const audits = current
      ? (
          await invitationEngineRepository.listAudits(organizationId, current.id)
        ).map((a) => ({
          id: a.id,
          organizationId: a.organizationId,
          invitationId: a.invitationId,
          eventType: a.eventType,
          actorUserId: a.actorUserId,
          actorLabel: a.actorLabel,
          detail: a.detail,
          createdAt: a.createdAt.toISOString(),
        }))
      : [];
    const sender = await resolveInvitationSender();
    return { current, history: refreshed.map((r) => publicInvitation(r)), audits, sender };
  },

  async generateLink(input: {
    inviteeKind: EnterpriseInvitationInviteeKind;
    entityId: string;
    actorUserId: string;
    actorLabel: string;
    ttlDays?: number;
    origin?: string;
  }) {
    requireDb();
    const adapter = adapters.get(input.inviteeKind);
    if (!adapter) {
      throw new InvitationEngineError(
        `No invitation adapter registered for ${input.inviteeKind}`,
        "ADAPTER_MISSING",
        501,
      );
    }

    const organizationId = await resolvePilotOrganizationId();
    await enterpriseCommunicationCenterService.ensureProfilesSeeded(input.actorUserId);
    const recipient = await adapter.resolveRecipient(input.entityId);
    if (!recipient.email?.trim()) {
      throw new InvitationEngineError(
        "Recipient email is required before generating an activation link",
        "EMAIL_REQUIRED",
      );
    }

    const previous = await invitationEngineRepository.findActiveForEntity(
      organizationId,
      input.inviteeKind,
      input.entityId,
    );
    if (previous) {
      await invitationEngineRepository.updateInvitation(previous.id, {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: input.actorUserId,
        modifiedBy: input.actorUserId,
      });
      await invitationEngineRepository.appendAudit({
        organizationId,
        invitationId: previous.id,
        eventType: "cancelled",
        actorUserId: input.actorUserId,
        actorLabel: input.actorLabel,
        detail: "Superseded by regenerated activation link",
      });
    }

    const token = generateEnterpriseInvitationToken();
    const expiresAt = invitationExpiresAt(input.ttlDays ?? ENTERPRISE_INVITATION_DEFAULT_TTL_DAYS);
    const created = await invitationEngineRepository.createInvitation({
      organizationId,
      inviteeKind: input.inviteeKind,
      entityId: input.entityId,
      entityLabel: recipient.label ?? recipient.name,
      recipientEmail: recipient.email.trim().toLowerCase(),
      recipientName: recipient.name.trim(),
      status: "link_generated",
      token,
      tokenHash: hashEnterpriseInvitationToken(token),
      expiresAt,
      previousInvitationId: previous?.id ?? null,
      createdBy: input.actorUserId,
    });

    await invitationEngineRepository.appendAudit({
      organizationId,
      invitationId: created.id,
      eventType: "link_generated",
      actorUserId: input.actorUserId,
      actorLabel: input.actorLabel,
      detail: `Expires ${expiresAt.toISOString()}`,
    });

    const activationUrl = buildAbsoluteActivationUrl(token, input.origin);
    return {
      invitation: publicInvitation(created, token),
      activationUrl,
      activationToken: token,
    };
  },

  async sendInvitation(input: {
    inviteeKind: EnterpriseInvitationInviteeKind;
    entityId: string;
    actorUserId: string;
    actorLabel: string;
    origin?: string;
    resend?: boolean;
  }) {
    requireDb();
    const organizationId = await resolvePilotOrganizationId();
    let active = await invitationEngineRepository.findActiveForEntity(
      organizationId,
      input.inviteeKind,
      input.entityId,
    );

    if (!active || (await markExpiredIfNeeded(active))) {
      const generated = await this.generateLink({
        inviteeKind: input.inviteeKind,
        entityId: input.entityId,
        actorUserId: input.actorUserId,
        actorLabel: input.actorLabel,
        origin: input.origin,
      });
      active = await invitationEngineRepository.findById(
        organizationId,
        generated.invitation.id,
      );
      if (!active) {
        throw new InvitationEngineError("Failed to create invitation", "CREATE_FAILED", 500);
      }
    }

    const sender = await resolveInvitationSender();
    const activationUrl = buildAbsoluteActivationUrl(active.token, input.origin);
    const email: InvitationEmailPayload = buildInvitationEmail({
      recipientName: active.recipientName,
      recipientEmail: active.recipientEmail,
      inviteeKindLabel: ENTERPRISE_INVITATION_INVITEE_KIND_LABELS[active.inviteeKind],
      activationUrl,
      expiresAtIso: active.expiresAt.toISOString(),
      fromDisplayName: sender.displayName,
      fromEmail: sender.senderEmail,
      supportEmail: sender.supportEmail,
      supportPhone: sender.supportPhone,
      brandLogoUrl: undefined,
      organizationName: "Rupee Catalyst",
    });

    /** Phase 1 — ENCE external delivery remains disabled; record simulated send + audit. */
    const deliveryMode = "simulated" as const;
    try {
      if (!ENCE_EXTERNAL_DELIVERY_ENABLED) {
        simulateEnceCommunication({
          channel: "email",
          templateRef: "enterprise_invitation_activation",
          recipientRef: email.toEmail,
          contextRef: active.id,
          payload: {
            subject: email.subject,
            bodyPreview: email.text.slice(0, 280),
            invitationId: active.id,
            inviteeKind: active.inviteeKind,
            from: email.fromEmail,
            deliveryMode,
          },
          simulatedBy: input.actorUserId,
        });
      }
    } catch {
      /* ENCE may be uninitialized — invitation status still advances */
    }

    const updated = await invitationEngineRepository.updateInvitation(active.id, {
      status: "invite_sent",
      lastSentAt: new Date(),
      deliveryMode,
      modifiedBy: input.actorUserId,
    });

    await invitationEngineRepository.appendAudit({
      organizationId,
      invitationId: active.id,
      eventType: input.resend ? "resent" : "invite_sent",
      actorUserId: input.actorUserId,
      actorLabel: input.actorLabel,
      detail: `From ${email.fromEmail} (${deliveryMode})`,
    });

    return {
      invitation: publicInvitation(updated, active.token),
      activationUrl,
      activationToken: active.token,
      email: {
        subject: email.subject,
        fromEmail: email.fromEmail,
        fromDisplayName: email.fromDisplayName,
        toEmail: email.toEmail,
        deliveryMode,
      },
    };
  },

  async cancelInvitation(input: {
    inviteeKind: EnterpriseInvitationInviteeKind;
    entityId: string;
    actorUserId: string;
    actorLabel: string;
  }) {
    requireDb();
    const organizationId = await resolvePilotOrganizationId();
    const active = await invitationEngineRepository.findActiveForEntity(
      organizationId,
      input.inviteeKind,
      input.entityId,
    );
    if (!active) {
      throw new InvitationEngineError("No cancellable invitation found", "NOT_FOUND", 404);
    }
    if (active.status === "activated") {
      throw new InvitationEngineError("Activated invitations cannot be cancelled", "ALREADY_ACTIVATED");
    }
    const updated = await invitationEngineRepository.updateInvitation(active.id, {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledBy: input.actorUserId,
      modifiedBy: input.actorUserId,
    });
    await invitationEngineRepository.appendAudit({
      organizationId,
      invitationId: active.id,
      eventType: "cancelled",
      actorUserId: input.actorUserId,
      actorLabel: input.actorLabel,
      detail: "Cancelled before activation",
    });
    return { invitation: publicInvitation(updated) };
  },

  async previewByToken(token: string) {
    requireDb();
    const row = await invitationEngineRepository.findByToken(token.trim());
    if (!row) {
      throw new InvitationEngineError("Invitation link is invalid", "INVALID_TOKEN", 404);
    }
    if (await markExpiredIfNeeded(row)) {
      throw new InvitationEngineError("Invitation link has expired", "EXPIRED", 410);
    }
    if (row.status === "cancelled") {
      throw new InvitationEngineError("Invitation was cancelled", "CANCELLED", 410);
    }
    if (row.status === "activated" || row.useCount >= row.maxUses) {
      throw new InvitationEngineError("Invitation has already been used", "ALREADY_USED", 410);
    }
    return {
      invitationId: row.id,
      inviteeKind: row.inviteeKind,
      recipientName: row.recipientName,
      recipientEmail: row.recipientEmail,
      entityLabel: row.entityLabel,
      expiresAt: row.expiresAt.toISOString(),
      status: row.status,
    };
  },

  async activate(input: ActivateInvitationInput): Promise<ActivateInvitationResult> {
    requireDb();
    if (!input.acceptTerms) {
      throw new InvitationEngineError("Terms & Conditions must be accepted", "TERMS_REQUIRED");
    }
    if (input.password.length < 8) {
      throw new InvitationEngineError("Password must be at least 8 characters", "WEAK_PASSWORD");
    }
    if (input.password !== input.confirmPassword) {
      throw new InvitationEngineError("Passwords do not match", "PASSWORD_MISMATCH");
    }

    const row = await invitationEngineRepository.findByToken(input.token.trim());
    if (!row) {
      throw new InvitationEngineError("Invitation link is invalid", "INVALID_TOKEN", 404);
    }
    if (await markExpiredIfNeeded(row)) {
      throw new InvitationEngineError("Invitation link has expired", "EXPIRED", 410);
    }
    if (row.status === "cancelled") {
      throw new InvitationEngineError("Invitation was cancelled", "CANCELLED", 410);
    }
    if (row.status === "activated" || row.useCount >= row.maxUses) {
      throw new InvitationEngineError("Invitation has already been used", "ALREADY_USED", 410);
    }

    const adapter = adapters.get(row.inviteeKind);
    if (!adapter) {
      throw new InvitationEngineError(
        `No invitation adapter registered for ${row.inviteeKind}`,
        "ADAPTER_MISSING",
        501,
      );
    }

    const email = row.recipientEmail.trim().toLowerCase();
    const fullName =
      input.fullName?.trim() ||
      row.recipientName.trim() ||
      email.split("@")[0] ||
      "Partner";
    const parts = fullName.split(/\s+/);
    const firstName = parts[0] || "Partner";
    const lastName = parts.slice(1).join(" ") || "User";

    const existing = await prisma.user.findUnique({ where: { email } });
    let userId: string;
    if (existing) {
      /** Reuse identity — never create a duplicate login for the same email. */
      userId = existing.id;
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash: await hashPassword(input.password),
          mustChangePassword: false,
          isActive: true,
          firstName: existing.firstName || firstName,
          lastName: existing.lastName || lastName,
          mobile: input.mobile?.trim() || existing.mobile,
        },
      });
    } else {
      const created = await prisma.user.create({
        data: {
          email,
          passwordHash: await hashPassword(input.password),
          firstName,
          lastName,
          mobile: input.mobile?.trim() || null,
          role: "VIEWER",
          isActive: true,
          mustChangePassword: false,
          employeeId: null,
        },
      });
      userId = created.id;
    }

    await adapter.onActivated({
      entityId: row.entityId,
      invitationId: row.id,
      userId,
      email,
      fullName,
      mobile: input.mobile?.trim() || null,
      profileCity: input.profileCity?.trim() || null,
      actorUserId: userId,
    });

    await invitationEngineRepository.updateInvitation(row.id, {
      status: "activated",
      activatedAt: new Date(),
      useCount: row.useCount + 1,
      modifiedBy: userId,
    });
    await invitationEngineRepository.appendAudit({
      organizationId: row.organizationId,
      invitationId: row.id,
      eventType: "activated",
      actorUserId: userId,
      actorLabel: fullName,
      detail: `Activated ${row.inviteeKind} ${row.entityId}`,
    });

    const redirectUrl =
      row.redirectTarget === "custom" && row.customRedirectUrl
        ? row.customRedirectUrl
        : row.redirectTarget === "catalyst_one"
          ? "/dashboard"
          : resolveCatalystConnectRedirectUrl();

    return {
      invitationId: row.id,
      inviteeKind: row.inviteeKind,
      entityId: row.entityId,
      redirectUrl,
      recipientEmail: email,
    };
  },
};
