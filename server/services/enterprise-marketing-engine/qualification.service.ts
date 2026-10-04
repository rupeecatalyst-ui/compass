/**
 * CO-MARKETING-MKT-11 — Qualification + controlled Catalyst One handoff.
 *
 * Raw recipients never become Contact / Opportunity / Lead.
 * Handoff is explicit, qualified-only, and never a mass conversion.
 */

import {
  ENTERPRISE_MARKETING_HANDOFF_ENABLED,
  ENTERPRISE_MARKETING_HANDOFF_MODE,
  MARKETING_DEFAULT_QUALIFICATION_POLICY,
  MARKETING_PERMISSIONS,
} from "@/constants/enterprise-marketing-engine";
import type { MarketingChannel } from "@/constants/enterprise-marketing-engine";
import { redactMarketingFingerprint } from "@/lib/enterprise-marketing-engine/analytics/redact-fingerprint";
import type {
  MarketingIdentityResolutionPort,
  MarketingOpportunityCreatePort,
} from "@/lib/enterprise-marketing-engine/ports/qualification-handoff.port";
import {
  canHandoffMarketingQualification,
  evaluateMarketingQualificationState,
} from "@/lib/enterprise-marketing-engine/qualification/evaluate";
import {
  emailsMatch,
  normalizeMarketingMatchEmail,
  normalizeMarketingMatchPhone,
  phonesMatch,
} from "@/lib/enterprise-marketing-engine/qualification/match-identity";
import { composeMarketingQualificationInbox } from "@/lib/enterprise-marketing-engine/qualification/inbox";
import { marketingEngagementOnlyIntent } from "@/lib/enterprise-marketing-engine/qualification/inbox-boundary";
import {
  assertMarketingHandoffAllowed,
  assertMarketingMassHandoffForbidden,
} from "@/lib/enterprise-marketing-engine/safety";
import {
  assertMarketingPermission,
  type MarketingPermissionActor,
} from "@/lib/enterprise-marketing-engine/permissions";
import type {
  MarketingHandoffResult,
  MarketingQualificationDuplicateMatch,
  MarketingQualificationInboxStatus,
  MarketingQualificationIntent,
  MarketingQualificationPolicy,
  MarketingQualificationPublicDto,
  MarketingQualificationRecord,
} from "@/types/enterprise-marketing-qualification";
import { recordMarketingAuditEvent } from "./audit";
import { createFixtureIdentityResolutionPort, marketingFixtureIdentityDirectory } from "./adapters/fixture-identity.adapter";
import { createFixtureOpportunityCreatePort, marketingFixtureOpportunityDirectory } from "./adapters/fixture-opportunity.adapter";
import { marketingCampaignStore } from "./campaign-store";
import { emitMarketingEngagementEvent } from "./engagement.service";
import { marketingNotificationAttemptStore } from "./notification-attempt-store";
import { marketingNotificationPolicyStore } from "./notification-policy-store";
import { marketingNotificationService } from "./notification.service";
import { marketingQualificationStore } from "./qualification-store";
import { marketingRoutingPolicyStore } from "./routing-policy-store";
import { marketingRoutingService } from "./routing.service";

function nowIso() {
  return new Date().toISOString();
}

function toPublicDto(row: MarketingQualificationRecord): MarketingQualificationPublicDto {
  const { matchEmail, matchPhone, ...rest } = row;
  return {
    ...rest,
    matchEmailPreview: matchEmail ? redactMarketingFingerprint(`email:${matchEmail}`) : null,
    matchPhonePreview: matchPhone ? redactMarketingFingerprint(`phone:${matchPhone}`) : null,
  };
}

async function notifyHandoffBestEffort(input: {
  organizationId: string;
  actorUserId?: string | null;
  qualification: MarketingQualificationRecord;
  assigneeUserId: string;
  contactName?: string | null;
  notificationPolicyId?: string | null;
  retryFailedOnly?: boolean;
}): Promise<NonNullable<MarketingHandoffResult["notification"]>> {
  const campaign = await marketingCampaignStore.getForOrg(
    input.qualification.campaignId,
    input.organizationId,
  );
  try {
    const summary = await marketingNotificationService.notifyAfterHandoff({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      qualification: input.qualification,
      assigneeUserId: input.assigneeUserId,
      contactName: input.contactName,
      sourceLabel: input.qualification.source ?? campaign?.channel ?? input.qualification.channel,
      notificationPolicyId: input.notificationPolicyId ?? input.qualification.notificationPolicyId,
      campaignChannels: campaign?.notificationPlaceholder ?? null,
      retryFailedOnly: input.retryFailedOnly,
    });
    const notificationStatus =
      summary.status === "FAILED"
        ? "FAILED"
        : summary.status === "PARTIAL"
          ? "PARTIAL"
          : summary.status === "SKIPPED"
            ? "SENT"
            : "SENT";
    marketingQualificationStore.patch(input.qualification.id, {
      notificationStatus,
      notificationPolicyId: input.notificationPolicyId ?? input.qualification.notificationPolicyId ?? null,
      lastError:
        summary.status === "FAILED"
          ? summary.attempts.find((a) => a.status === "FAILED")?.error ?? "Notification delivery failed"
          : null,
    });
    return summary;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Notification delivery failed";
    marketingQualificationStore.patch(input.qualification.id, {
      notificationStatus: "FAILED",
      lastError: `notification: ${message}`,
    });
    recordMarketingAuditEvent({
      kind: "qualification.notification.failed",
      organizationId: input.organizationId,
      actorUserId: input.actorUserId ?? null,
      detail: { qualificationId: input.qualification.id, error: message, opportunityPreserved: true },
    });
    return {
      status: "FAILED",
      duplicate: false,
      attempts: marketingNotificationAttemptStore.listForQualification(input.qualification.id),
    };
  }
}

function previewFixtureDuplicateMatch(input: {
  organizationId: string;
  campaignId: string;
  matchEmail: string | null;
  matchPhone: string | null;
}): MarketingQualificationDuplicateMatch {
  const contacts = marketingFixtureIdentityDirectory.list(input.organizationId);
  const byEmail = input.matchEmail
    ? contacts.find((row) => emailsMatch(row.email, input.matchEmail))
    : undefined;
  const byPhone = input.matchPhone
    ? contacts.find((row) => phonesMatch(row.phone, input.matchPhone))
    : undefined;
  const contact = byEmail ?? byPhone;
  if (contact) {
    const opportunity = marketingFixtureOpportunityDirectory
      .list()
      .find((row) => row.contactId === contact.id && row.campaignId === input.campaignId);
    if (opportunity) {
      return {
        result: "existing_opportunity",
        contactId: contact.id,
        opportunityId: opportunity.id,
        reused: true,
      };
    }
    return { result: "existing_contact", contactId: contact.id, reused: true };
  }
  return { result: "none", reused: false };
}

function resolveIdentityPort(): MarketingIdentityResolutionPort {
  if (ENTERPRISE_MARKETING_HANDOFF_MODE === "live") {
    // Lazy require so fixture verify does not load Prisma ECM adapters.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./adapters/live-identity.adapter") as {
      createLiveIdentityResolutionPort: () => MarketingIdentityResolutionPort;
    };
    return mod.createLiveIdentityResolutionPort();
  }
  return createFixtureIdentityResolutionPort();
}

function resolveOpportunityPort(): MarketingOpportunityCreatePort {
  if (ENTERPRISE_MARKETING_HANDOFF_MODE === "live") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./adapters/live-opportunity.adapter") as {
      createLiveOpportunityCreatePort: () => MarketingOpportunityCreatePort;
    };
    return mod.createLiveOpportunityCreatePort();
  }
  return createFixtureOpportunityCreatePort();
}

export const marketingQualificationService = {
  getMode() {
    return {
      handoffEnabled: ENTERPRISE_MARKETING_HANDOFF_ENABLED,
      handoffMode: ENTERPRISE_MARKETING_HANDOFF_MODE,
      massHandoffEnabled: false,
      noLeadEntity: true as const,
    };
  },

  list(actor: MarketingPermissionActor) {
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.COMMAND_CENTER);
    const organizationId = actor.organizationId ?? "default";
    const qualifications = marketingQualificationStore.list(organizationId);
    return {
      qualifications: qualifications.map(toPublicDto),
      inbox: composeMarketingQualificationInbox(qualifications),
      routingPolicies: marketingRoutingPolicyStore.list(organizationId),
      notificationPolicies: marketingNotificationPolicyStore.list(organizationId),
      notificationAttempts: qualifications.flatMap((q) =>
        marketingNotificationAttemptStore.listForQualification(q.id),
      ),
      mode: this.getMode(),
    };
  },

  async ingestResponse(
    actor: MarketingPermissionActor,
    input: {
      campaignId: string;
      channel?: MarketingChannel;
      recipientFingerprint: string;
      matchEmail?: string | null;
      matchPhone?: string | null;
      displayName?: string | null;
      city?: string | null;
      territory?: string | null;
      product?: string | null;
      customerCategory?: string | null;
      source?: string | null;
      partnerId?: string | null;
      teamId?: string | null;
      sourceTabName?: string | null;
      responseSummary?: string | null;
      snapshotId?: string | null;
      snapshotRecipientId?: string | null;
      intent: MarketingQualificationIntent;
      evidenceEventId?: string | null;
      operatorConfirmed?: boolean;
      policy?: MarketingQualificationPolicy;
    },
  ): Promise<MarketingQualificationPublicDto> {
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.COMMAND_CENTER);
    const organizationId = actor.organizationId ?? "default";
    const campaign = await marketingCampaignStore.getForOrg(input.campaignId, organizationId);
    if (!campaign) {
      throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const policy = input.policy ?? MARKETING_DEFAULT_QUALIFICATION_POLICY;
    const matchEmail = normalizeMarketingMatchEmail(input.matchEmail);
    const matchPhone = normalizeMarketingMatchPhone(input.matchPhone);
    const businessState = evaluateMarketingQualificationState({
      intent: input.intent,
      matchEmail,
      matchPhone,
      policy,
      operatorConfirmed: input.operatorConfirmed,
    });
    const existing = marketingQualificationStore.findByCampaignFingerprint(
      organizationId,
      campaign.id,
      input.recipientFingerprint,
    );
    const identityDuplicate = marketingQualificationStore.findByCampaignIdentity(organizationId, campaign.id, {
      matchEmail,
      matchPhone,
    });
    const previewMatch = previewFixtureDuplicateMatch({
      organizationId,
      campaignId: campaign.id,
      matchEmail,
      matchPhone,
    });
    const attributionSource = existing ?? identityDuplicate;
    const snapshotId = input.snapshotId ?? attributionSource?.snapshotId ?? null;
    const snapshotRecipientId = input.snapshotRecipientId ?? attributionSource?.snapshotRecipientId ?? null;
    const duplicateMatch: MarketingQualificationDuplicateMatch =
      existing || (identityDuplicate && identityDuplicate.recipientFingerprint !== input.recipientFingerprint)
        ? {
            result: "existing_response",
            qualificationId: (existing ?? identityDuplicate)?.id ?? null,
            contactId: previewMatch.contactId ?? null,
            reused: true,
          }
        : previewMatch;
    const inboxStatus: MarketingQualificationInboxStatus | undefined = marketingEngagementOnlyIntent(input.intent)
      ? undefined
      : duplicateMatch.result === "existing_response"
        ? "DUPLICATE"
        : businessState === "QUALIFIED"
          ? "QUALIFIED"
          : businessState === "NOT_INTERESTED"
            ? "NOT_QUALIFIED"
            : businessState === "SUPPRESSED"
              ? "CLOSED"
              : "NEW";
    if (existing) {
      if (existing.businessState === "HANDED_OFF") {
        return toPublicDto(existing);
      }
      const next = marketingQualificationStore.patch(existing.id, {
        intent: input.intent,
        businessState,
        matchEmail,
        matchPhone,
        displayName: input.displayName ?? existing.displayName,
        evidenceEventId: input.evidenceEventId ?? existing.evidenceEventId,
        sourceTabName: input.sourceTabName ?? existing.sourceTabName,
        responseSummary: input.responseSummary ?? existing.responseSummary,
        snapshotId,
        snapshotRecipientId,
        duplicateMatch,
        inboxStatus: inboxStatus ?? existing.inboxStatus,
      });
      recordMarketingAuditEvent({
        kind: "qualification.ingested",
        organizationId,
        actorUserId: actor.userId ?? null,
        detail: {
          qualificationId: existing.id,
          campaignId: campaign.id,
          businessState,
          intent: input.intent,
          fingerprint: redactMarketingFingerprint(existing.recipientFingerprint),
          duplicatePrevented: true,
        },
      });
      return toPublicDto(next ?? existing);
    }
    const row = marketingQualificationStore.create({
      organizationId,
      campaignId: campaign.id,
      campaignName: campaign.name,
      channel: input.channel ?? campaign.channel,
      recipientFingerprint: input.recipientFingerprint,
      matchEmail,
      matchPhone,
      displayName: input.displayName ?? null,
      city: input.city ?? null,
      territory: input.territory ?? null,
      product: input.product ?? campaign.product ?? null,
      customerCategory: input.customerCategory ?? null,
      source: input.source ?? campaign.channel,
      partnerId: input.partnerId ?? null,
      teamId: input.teamId ?? null,
      sourceTabName: input.sourceTabName ?? null,
      responseSummary: input.responseSummary ?? null,
      snapshotId,
      snapshotRecipientId,
      duplicateMatch,
      inboxStatus,
      intent: input.intent,
      businessState,
      processState: "NEW",
      evidenceEventId: input.evidenceEventId ?? null,
    });
    recordMarketingAuditEvent({
      kind: "qualification.ingested",
      organizationId,
      actorUserId: actor.userId ?? null,
      detail: {
        qualificationId: row.id,
        campaignId: campaign.id,
        businessState,
        intent: input.intent,
        fingerprint: redactMarketingFingerprint(row.recipientFingerprint),
      },
    });
    return toPublicDto(row);
  },

  async setBusinessState(
    actor: MarketingPermissionActor,
    qualificationId: string,
    businessState: MarketingQualificationRecord["businessState"],
    note?: string,
  ): Promise<MarketingQualificationPublicDto> {
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.COMMAND_CENTER);
    const organizationId = actor.organizationId ?? "default";
    const existing = marketingQualificationStore.getForOrg(qualificationId, organizationId);
    if (!existing) {
      throw Object.assign(new Error("Qualification not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    if (existing.businessState === "HANDED_OFF") {
      throw Object.assign(new Error("Handed-off qualifications cannot be reopened from Marketing"), {
        statusCode: 409,
        code: "ALREADY_HANDED_OFF",
      });
    }
    const next = marketingQualificationStore.patch(qualificationId, {
      businessState,
      inboxStatus:
        businessState === "QUALIFIED"
          ? "QUALIFIED"
          : businessState === "NOT_INTERESTED"
            ? "NOT_QUALIFIED"
            : businessState === "SUPPRESSED"
              ? "CLOSED"
              : existing.inboxStatus,
    });
    recordMarketingAuditEvent({
      kind: "qualification.state_changed",
      organizationId,
      actorUserId: actor.userId ?? null,
      detail: {
        qualificationId,
        from: existing.businessState,
        to: businessState,
        note: note ?? null,
      },
    });
    if (businessState === "QUALIFIED") {
      try {
        await emitMarketingEngagementEvent({
          organizationId,
          campaignId: existing.campaignId,
          channel: existing.channel,
          type: "QUALIFIED",
          recipientFingerprint: existing.recipientFingerprint,
        });
      } catch {
        /* engagement store is optional observability */
      }
    }
    return toPublicDto(next!);
  },

  async setInboxStatus(
    actor: MarketingPermissionActor,
    qualificationId: string,
    inboxStatus: MarketingQualificationInboxStatus,
  ): Promise<MarketingQualificationPublicDto> {
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.COMMAND_CENTER);
    const organizationId = actor.organizationId ?? "default";
    const existing = marketingQualificationStore.getForOrg(qualificationId, organizationId);
    if (!existing) {
      throw Object.assign(new Error("Qualification not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    if (existing.businessState === "HANDED_OFF") {
      throw Object.assign(new Error("Handed-off qualifications cannot be reopened from Marketing"), {
        statusCode: 409,
        code: "ALREADY_HANDED_OFF",
      });
    }
    const businessState =
      inboxStatus === "QUALIFIED"
        ? "QUALIFIED"
        : inboxStatus === "NOT_QUALIFIED"
          ? "NOT_INTERESTED"
          : inboxStatus === "CLOSED"
            ? "SUPPRESSED"
            : inboxStatus === "UNDER_REVIEW"
              ? existing.businessState === "UNQUALIFIED"
                ? "QUALIFICATION_REQUIRED"
                : existing.businessState
              : existing.businessState;
    const next = marketingQualificationStore.patch(qualificationId, {
      inboxStatus,
      businessState,
      processState: inboxStatus === "UNDER_REVIEW" ? "ROUTING" : existing.processState,
    });
    recordMarketingAuditEvent({
      kind: "qualification.state_changed",
      organizationId,
      actorUserId: actor.userId ?? null,
      detail: {
        qualificationId,
        from: existing.inboxStatus ?? existing.businessState,
        to: inboxStatus,
      },
    });
    return toPublicDto(next!);
  },

  async handoff(
    actor: MarketingPermissionActor,
    input: {
      qualificationId: string;
      routingPolicyId: string;
      notificationPolicyId?: string | null;
    },
  ): Promise<{
    qualification: MarketingQualificationPublicDto;
    contact: MarketingHandoffResult["contact"];
    opportunity: MarketingHandoffResult["opportunity"];
    assignment: MarketingHandoffResult["assignment"];
    notification: MarketingHandoffResult["notification"];
  }> {
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.ROUTING_MANAGE);
    assertMarketingHandoffAllowed("qualification.handoff");
    const organizationId = actor.organizationId ?? "default";
    const qualification = marketingQualificationStore.getForOrg(
      input.qualificationId,
      organizationId,
    );
    if (!qualification) {
      throw Object.assign(new Error("Qualification not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    if (!canHandoffMarketingQualification(qualification.businessState)) {
      throw Object.assign(
        new Error(
          `Handoff refused — recipient is ${qualification.businessState}, not QUALIFIED. Raw marketing recipients do not become Contacts or Opportunities.`,
        ),
        { statusCode: 409, code: "NOT_QUALIFIED" },
      );
    }

    if (qualification.processState === "HANDOFF_COMPLETE" && qualification.contactId) {
      const assignment = await marketingRoutingService.assignForQualification(
        qualification,
        input.routingPolicyId,
      );
      const notification = await notifyHandoffBestEffort({
        organizationId,
        actorUserId: actor.userId,
        qualification,
        assigneeUserId: assignment.assignment.assigneeUserId,
        contactName: qualification.displayName,
        notificationPolicyId: input.notificationPolicyId,
        retryFailedOnly: true,
      });
      const latest = marketingQualificationStore.getForOrg(qualification.id, organizationId) ?? qualification;
      return {
        qualification: toPublicDto(latest),
        contact: {
          contactId: qualification.contactId,
          created: qualification.contactCreated ?? false,
          matchedBy: "email",
          name: qualification.displayName ?? "Contact",
        },
        opportunity: qualification.opportunityId
          ? {
              opportunityId: qualification.opportunityId,
              created: qualification.opportunityCreated ?? false,
              lifecycle: "dialogue",
            }
          : null,
        assignment: assignment.assignment,
        notification,
      };
    }

    marketingQualificationStore.patch(qualification.id, { processState: "ROUTING" });
    const claimed = await marketingRoutingService.assignForQualification(
      qualification,
      input.routingPolicyId,
    );
    marketingQualificationStore.patch(qualification.id, {
      processState: "HANDOFF_IN_PROGRESS",
      assigneeUserId: claimed.assignment.assigneeUserId,
    });

    const identity = resolveIdentityPort();
    const opportunityPort = resolveOpportunityPort();
    const name = qualification.displayName?.trim() || "Marketing recipient";
    try {
      const contact = await identity.matchOrCreate({
        organizationId,
        actorUserId: actor.userId ?? claimed.assignment.assigneeUserId,
        name,
        email: qualification.matchEmail,
        phone: qualification.matchPhone,
      });

      let opportunity: MarketingHandoffResult["opportunity"] = null;
      if (MARKETING_DEFAULT_QUALIFICATION_POLICY.createOpportunityOnHandoff) {
        opportunity = await opportunityPort.createDialogue({
          organizationId,
          actorUserId: actor.userId ?? claimed.assignment.assigneeUserId,
          assigneeUserId: claimed.assignment.assigneeUserId,
          contactId: contact.contactId,
          contactName: contact.name,
          contactEmail: qualification.matchEmail,
          contactPhone: qualification.matchPhone,
          campaignId: qualification.campaignId,
          campaignName: qualification.campaignName ?? null,
          qualificationId: qualification.id,
          snapshotId: qualification.snapshotId ?? null,
          snapshotRecipientId: qualification.snapshotRecipientId ?? null,
          recipientFingerprint: qualification.recipientFingerprint,
          source: qualification.source ?? "marketing_engine",
          sourceDetail: qualification.sourceDetail ?? qualification.sourceTabName ?? null,
          productCode: qualification.advantageProductCode ?? qualification.product ?? null,
          productLabel: qualification.product ?? null,
          authorizedAdvantageCommittedAmount:
            qualification.authorizedAdvantageCommittedAmount ?? null,
        });
      }

      const handedOffAt = nowIso();
      const next = marketingQualificationStore.patch(qualification.id, {
        businessState: "HANDED_OFF",
        processState: "HANDOFF_COMPLETE",
        inboxStatus: "CONVERTED",
        assigneeUserId: claimed.assignment.assigneeUserId,
        contactId: contact.contactId,
        contactCreated: contact.created,
        opportunityId: opportunity?.opportunityId ?? null,
        opportunityCreated: opportunity?.created ?? false,
        handedOffAt,
        lastError: null,
      })!;

      recordMarketingAuditEvent({
        kind: "qualification.handoff.complete",
        organizationId,
        actorUserId: actor.userId ?? null,
        detail: {
          qualificationId: next.id,
          campaignId: next.campaignId,
          campaignName: next.campaignName,
          fingerprint: redactMarketingFingerprint(next.recipientFingerprint),
          businessState: next.businessState,
          processState: next.processState,
          handedOffAt,
          contactId: contact.contactId,
          contactCreated: contact.created,
          matchedBy: contact.matchedBy,
          opportunityId: opportunity?.opportunityId ?? null,
          opportunityCreated: opportunity?.created ?? false,
          assigneeUserId: claimed.assignment.assigneeUserId,
          routingMode: claimed.assignment.mode,
          sourceCampaign: next.campaignName ?? next.campaignId,
          snapshotId: next.snapshotId ?? opportunity?.snapshotId ?? qualification.snapshotId ?? null,
          snapshotRecipientId:
            next.snapshotRecipientId ?? opportunity?.snapshotRecipientId ?? qualification.snapshotRecipientId ?? null,
          recipientFingerprint: redactMarketingFingerprint(next.recipientFingerprint),
          filledFields: contact.filledFields ?? [],
          overwroteExisting: false,
          noLeadEntity: true,
        },
      });

      try {
        await emitMarketingEngagementEvent({
          organizationId,
          campaignId: next.campaignId,
          channel: next.channel,
          type: "HANDED_OFF",
          recipientFingerprint: next.recipientFingerprint,
          idempotencyKey: `handoff:${next.id}`,
        });
      } catch {
        /* engagement store is optional observability */
      }

      const notification = await notifyHandoffBestEffort({
        organizationId,
        actorUserId: actor.userId,
        qualification: next,
        assigneeUserId: claimed.assignment.assigneeUserId,
        contactName: contact.name,
        notificationPolicyId: input.notificationPolicyId,
      });
      const latest = marketingQualificationStore.getForOrg(next.id, organizationId) ?? next;

      return {
        qualification: toPublicDto(latest),
        contact,
        opportunity,
        assignment: claimed.assignment,
        notification,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Handoff failed";
      marketingQualificationStore.patch(qualification.id, {
        processState: "HANDOFF_FAILED",
        lastError: message,
      });
      recordMarketingAuditEvent({
        kind: "qualification.handoff.failed",
        organizationId,
        actorUserId: actor.userId ?? null,
        detail: { qualificationId: qualification.id, error: message },
      });
      throw err;
    }
  },

  async retryNotification(
    actor: MarketingPermissionActor,
    qualificationId: string,
    notificationPolicyId?: string | null,
  ) {
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.ROUTING_MANAGE);
    const organizationId = actor.organizationId ?? "default";
    const qualification = marketingQualificationStore.getForOrg(qualificationId, organizationId);
    if (!qualification) {
      throw Object.assign(new Error("Qualification not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    if (qualification.processState !== "HANDOFF_COMPLETE" || !qualification.assigneeUserId) {
      throw Object.assign(new Error("Retry is only available after a completed handoff"), {
        statusCode: 409,
        code: "HANDOFF_NOT_COMPLETE",
      });
    }
    const notification = await notifyHandoffBestEffort({
      organizationId,
      actorUserId: actor.userId,
      qualification,
      assigneeUserId: qualification.assigneeUserId,
      contactName: qualification.displayName,
      notificationPolicyId,
      retryFailedOnly: true,
    });
    const latest = marketingQualificationStore.getForOrg(qualificationId, organizationId) ?? qualification;
    return {
      qualification: toPublicDto(latest),
      notification,
      opportunityPreserved: Boolean(latest.opportunityId),
    };
  },

  refuseMassConvert() {
    assertMarketingMassHandoffForbidden("qualification.mass_convert");
  },
};
