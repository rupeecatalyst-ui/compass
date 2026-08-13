/**
 * CO-MARKETING-MKT-12 — Marketing handoff internal notification.
 * In-app delivery reuses Enterprise Notification Engine. No parallel notification DB.
 * Email / WhatsApp are configurable dry-run attempts until live employee send is approved.
 */

import { ENE_EVENT_TYPES, ENE_SOURCE_SYSTEMS, buildEneDedupeKey, eneEventTitle } from "@/constants/enterprise-notification-engine";
import {
  MARKETING_DEFAULT_NOTIFICATION_CHANNELS,
  MARKETING_HANDOFF_REQUIRED_ACTION,
} from "@/constants/enterprise-marketing-engine/notification";
import { ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED } from "@/constants/enterprise-marketing-engine";
import type { MarketingNotificationPort } from "@/lib/enterprise-marketing-engine/ports/notification.port";
import {
  buildMarketingHandoffHref,
  buildMarketingHandoffNotificationBody,
  marketingQualificationReason,
} from "@/lib/enterprise-marketing-engine/qualification/handoff-notification";
import type {
  MarketingHandoffNotificationSummary,
  MarketingNotificationAttempt,
  MarketingQualificationRecord,
} from "@/types/enterprise-marketing-qualification";
import { marketingNotificationAttemptStore } from "./notification-attempt-store";
import { marketingNotificationPolicyStore } from "./notification-policy-store";
import { recordMarketingAuditEvent } from "./audit";

type Channel = "in_app" | "email" | "whatsapp";

const testFailures = new Set<Channel>();
let injectedPort: MarketingNotificationPort | null = null;

function nowIso() {
  return new Date().toISOString();
}

function summarize(attempts: MarketingNotificationAttempt[]): MarketingHandoffNotificationSummary {
  const failed = attempts.some((a) => a.status === "FAILED");
  const sent = attempts.some((a) => a.status === "SENT" || a.status === "DRY_RUN");
  const duplicate = attempts.some((a) => a.status === "SKIPPED");
  let status: MarketingHandoffNotificationSummary["status"] = "SKIPPED";
  if (failed && sent) status = "PARTIAL";
  else if (failed) status = "FAILED";
  else if (sent) status = "SENT";
  return { status, duplicate, attempts };
}

async function defaultEneNotify(
  request: Parameters<MarketingNotificationPort["notifyAssignee"]>[0],
): Promise<Awaited<ReturnType<MarketingNotificationPort["notifyAssignee"]>>> {
  // Lazy require: verify scripts must not load Next `server-only` ENE unless injected.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@server/services/enterprise-notification/enterprise-notification.service") as {
    enterpriseNotificationService: {
      fanOut: (input: Record<string, unknown>) => Promise<Array<{ id: string }>>;
    };
  };
  const items = await mod.enterpriseNotificationService.fanOut({
    organizationId: request.organizationId,
    eventType: ENE_EVENT_TYPES.MARKETING_QUALIFIED_HANDOFF,
    sourceEventId: request.qualificationId,
    sourceSystem: ENE_SOURCE_SYSTEMS.MARKETING,
    title: eneEventTitle(ENE_EVENT_TYPES.MARKETING_QUALIFIED_HANDOFF),
    body: buildMarketingHandoffNotificationBody({
      contactName: request.contactName,
      campaignName: request.campaignName,
      sourceLabel: request.sourceLabel,
      qualificationReason: request.qualificationReason,
      opportunityId: request.opportunityId,
      assigneeUserId: request.assigneeUserId,
      requiredAction: request.requiredAction,
      occurredAt: request.occurredAt ?? nowIso(),
    }),
    actorUserId: null,
    opportunityId: request.opportunityId ?? null,
    contactId: request.contactId ?? null,
    customerName: request.contactName ?? null,
    href: request.href,
    explicitRecipientUserIds: [request.assigneeUserId],
    occurredAt: request.occurredAt,
  });
  const first = items[0];
  return {
    notificationId: first?.id ?? null,
    duplicate: false,
    channelResults: [{ channel: "in_app", status: first ? "SENT" : "FAILED" }],
  };
}

async function deliverChannel(
  request: Parameters<MarketingNotificationPort["notifyAssignee"]>[0],
  channel: Channel,
): Promise<{ status: MarketingNotificationAttempt["status"]; notificationId: string | null; error: string | null }> {
  if (testFailures.has(channel)) {
    return { status: "FAILED", notificationId: null, error: `Simulated ${channel} delivery failure` };
  }

  if (channel === "in_app") {
    const port = injectedPort;
    const result = port
      ? await port.notifyAssignee(request)
      : await defaultEneNotify(request);
    return {
      status: result.notificationId || result.channelResults.some((c) => c.status === "SENT")
        ? result.duplicate
          ? "SKIPPED"
          : "SENT"
        : "FAILED",
      notificationId: result.notificationId,
      error: result.notificationId ? null : "In-app notification was not created",
    };
  }

  if (channel === "email") {
    if (ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED) {
      return {
        status: "FAILED",
        notificationId: null,
        error: "Live employee email from Marketing is not authorised",
      };
    }
    return { status: "DRY_RUN", notificationId: null, error: null };
  }

  if (ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED) {
    return {
      status: "FAILED",
      notificationId: null,
      error: "Live employee WhatsApp from Marketing is not authorised",
    };
  }
  return { status: "DRY_RUN", notificationId: null, error: null };
}

export const marketingNotificationService = {
  configurePort(port: MarketingNotificationPort | null) {
    injectedPort = port;
  },

  setTestFailure(channel: Channel, fail: boolean) {
    if (fail) testFailures.add(channel);
    else testFailures.delete(channel);
  },

  resetTestState() {
    testFailures.clear();
    injectedPort = null;
  },

  resolveChannels(input: {
    organizationId: string;
    notificationPolicyId?: string | null;
    campaignChannels?: { inApp: boolean; email: boolean; whatsapp: boolean } | null;
  }): { inApp: boolean; email: boolean; whatsapp: boolean } {
    if (input.notificationPolicyId) {
      const policy = marketingNotificationPolicyStore.getForOrg(
        input.notificationPolicyId,
        input.organizationId,
      );
      if (policy) {
        return { inApp: policy.inApp, email: policy.email, whatsapp: policy.whatsapp };
      }
    }
    if (input.campaignChannels) return input.campaignChannels;
    return { ...MARKETING_DEFAULT_NOTIFICATION_CHANNELS };
  },

  async notifyAfterHandoff(input: {
    organizationId: string;
    actorUserId?: string | null;
    qualification: MarketingQualificationRecord;
    assigneeUserId: string;
    contactName?: string | null;
    sourceLabel?: string | null;
    notificationPolicyId?: string | null;
    campaignChannels?: { inApp: boolean; email: boolean; whatsapp: boolean } | null;
    retryFailedOnly?: boolean;
  }): Promise<MarketingHandoffNotificationSummary> {
    const channels = this.resolveChannels(input);
    const occurredAt = input.qualification.handedOffAt ?? nowIso();
    const href = buildMarketingHandoffHref({
      opportunityId: input.qualification.opportunityId,
      contactId: input.qualification.contactId,
    });
    const request = {
      organizationId: input.organizationId,
      assigneeUserId: input.assigneeUserId,
      qualificationId: input.qualification.id,
      campaignId: input.qualification.campaignId,
      campaignName: input.qualification.campaignName,
      sourceLabel: input.sourceLabel ?? input.qualification.source ?? input.qualification.channel,
      qualificationReason: marketingQualificationReason(input.qualification.intent),
      contactId: input.qualification.contactId,
      contactName: input.contactName ?? input.qualification.displayName,
      opportunityId: input.qualification.opportunityId,
      requiredAction: MARKETING_HANDOFF_REQUIRED_ACTION,
      occurredAt,
      href,
      channels,
    };

    const wanted: Channel[] = [];
    if (channels.inApp) wanted.push("in_app");
    if (channels.email) wanted.push("email");
    if (channels.whatsapp) wanted.push("whatsapp");

    const results: MarketingNotificationAttempt[] = [];
    for (const channel of wanted) {
      const existing = marketingNotificationAttemptStore.get(input.qualification.id, channel);
      if (existing && (existing.status === "SENT" || existing.status === "DRY_RUN")) {
        results.push(existing);
        continue;
      }
      if (input.retryFailedOnly && existing && existing.status !== "FAILED") {
        results.push(existing);
        continue;
      }
      const dedupeKey = buildEneDedupeKey({
        eventType: ENE_EVENT_TYPES.MARKETING_QUALIFIED_HANDOFF,
        sourceEventId: input.qualification.id,
        recipientKind: "user",
        recipientId: input.assigneeUserId,
      });
      try {
        const delivered = await deliverChannel(request, channel);
        results.push(
          marketingNotificationAttemptStore.upsert({
            organizationId: input.organizationId,
            qualificationId: input.qualification.id,
            channel,
            status: delivered.status,
            dedupeKey,
            notificationId: delivered.notificationId,
            error: delivered.error,
          }),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Notification delivery failed";
        results.push(
          marketingNotificationAttemptStore.upsert({
            organizationId: input.organizationId,
            qualificationId: input.qualification.id,
            channel,
            status: "FAILED",
            dedupeKey,
            notificationId: null,
            error: message,
          }),
        );
      }
    }

    const summary = summarize(results);
    recordMarketingAuditEvent({
      kind:
        summary.status === "FAILED"
          ? "qualification.notification.failed"
          : "qualification.notification.recorded",
      organizationId: input.organizationId,
      actorUserId: input.actorUserId ?? null,
      detail: {
        qualificationId: input.qualification.id,
        assigneeUserId: input.assigneeUserId,
        href,
        status: summary.status,
        duplicate: summary.duplicate,
        channels: results.map((a) => ({ channel: a.channel, status: a.status })),
      },
    });
    return summary;
  },
};
