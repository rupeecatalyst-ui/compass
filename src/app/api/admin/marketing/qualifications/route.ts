/**
 * CO-MARKETING-MKT-12 — Qualification queue + routing + ENE handoff notification API.
 * No mass conversion. No Lead entity. Unqualified responses cannot hand off.
 */

import {
  errorResponse,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { MARKETING_ROUTING_CRITERION_FIELDS } from "@/constants/enterprise-marketing-engine";
import { MARKETING_PERMISSIONS } from "@/constants/enterprise-marketing-engine/permissions";
import { assertMarketingPermission } from "@/lib/enterprise-marketing-engine/permissions";
import { fromMarketingUnknownError } from "@/lib/enterprise-marketing-engine/api-error";
import type { MarketingChannel } from "@/constants/enterprise-marketing-engine";
import type { MarketingRoutingMode } from "@/lib/enterprise-marketing-engine/ports/routing.port";
import type {
  MarketingQualificationBusinessState,
  MarketingQualificationInboxStatus,
  MarketingQualificationIntent,
  MarketingRoutingRule,
} from "@/types/enterprise-marketing-qualification";
import { resolveMarketingOrganizationId } from "@server/services/enterprise-marketing-engine/organization";
import { marketingNotificationPolicyStore } from "@server/services/enterprise-marketing-engine/notification-policy-store";
import { marketingQualificationService } from "@server/services/enterprise-marketing-engine/qualification.service";
import { marketingRoutingPolicyStore } from "@server/services/enterprise-marketing-engine/routing-policy-store";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can access Marketing qualification"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

function fromUnknown(err: unknown) {
  return fromMarketingUnknownError(
    err,
    "MARKETING_QUALIFICATION_FAILED",
    err instanceof Error ? err.message : "Marketing qualification request failed",
  );
}

async function actorCtx(actor: { userId: string; role: string }) {
  return {
    userId: actor.userId,
    role: actor.role,
    organizationId: await resolveMarketingOrganizationId(),
  };
}

function parseRules(raw: unknown): MarketingRoutingRule[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: MarketingRoutingRule[] = [];
  raw.forEach((item, index) => {
    const row = item as Record<string, unknown>;
    const field = String(row.field ?? "");
    if (!MARKETING_ROUTING_CRITERION_FIELDS.includes(field as (typeof MARKETING_ROUTING_CRITERION_FIELDS)[number])) {
      return;
    }
    const equals = String(row.equals ?? "").trim();
    if (!equals) return;
    out.push({
      id: typeof row.id === "string" && row.id.trim() ? row.id : `rule-${index + 1}`,
      field: field as MarketingRoutingRule["field"],
      equals,
      assigneeUserId: typeof row.assigneeUserId === "string" ? row.assigneeUserId : null,
      teamId: typeof row.teamId === "string" ? row.teamId : null,
    });
  });
  return out;
}

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const ctx = await actorCtx(actor);
    assertMarketingPermission(ctx, MARKETING_PERMISSIONS.QUALIFICATION_REVIEW);
    return successResponse(marketingQualificationService.list(ctx));
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const body = (await request.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const ctx = await actorCtx(actor);
    if (action === "handoff" || action === "mass_convert" || action === "mass_handoff") {
      assertMarketingPermission(ctx, MARKETING_PERMISSIONS.QUALIFICATION_CONVERT);
    } else {
      assertMarketingPermission(ctx, MARKETING_PERMISSIONS.QUALIFICATION_REVIEW);
    }

    if (action === "mass_convert" || action === "mass_handoff") {
      marketingQualificationService.refuseMassConvert();
    }

    if (action === "ingest") {
      const dto = await marketingQualificationService.ingestResponse(ctx, {
        campaignId: String(body.campaignId ?? ""),
        channel: body.channel as MarketingChannel | undefined,
        recipientFingerprint: String(body.recipientFingerprint ?? ""),
        matchEmail: typeof body.matchEmail === "string" ? body.matchEmail : null,
        matchPhone: typeof body.matchPhone === "string" ? body.matchPhone : null,
        displayName: typeof body.displayName === "string" ? body.displayName : null,
        city: typeof body.city === "string" ? body.city : null,
        territory: typeof body.territory === "string" ? body.territory : null,
        product: typeof body.product === "string" ? body.product : null,
        customerCategory: typeof body.customerCategory === "string" ? body.customerCategory : null,
        source: typeof body.source === "string" ? body.source : null,
        partnerId: typeof body.partnerId === "string" ? body.partnerId : null,
        teamId: typeof body.teamId === "string" ? body.teamId : null,
        snapshotId: typeof body.snapshotId === "string" ? body.snapshotId : null,
        snapshotRecipientId: typeof body.snapshotRecipientId === "string" ? body.snapshotRecipientId : null,
        sourceTabName: typeof body.sourceTabName === "string" ? body.sourceTabName : null,
        responseSummary: typeof body.responseSummary === "string" ? body.responseSummary : null,
        intent: (body.intent as MarketingQualificationIntent) ?? "none",
        evidenceEventId: typeof body.evidenceEventId === "string" ? body.evidenceEventId : null,
        operatorConfirmed: body.operatorConfirmed === true,
      });
      return successResponse({ qualification: dto });
    }

    if (action === "set_state") {
      const dto = await marketingQualificationService.setBusinessState(
        ctx,
        String(body.qualificationId ?? ""),
        body.businessState as MarketingQualificationBusinessState,
        typeof body.note === "string" ? body.note : undefined,
      );
      return successResponse({ qualification: dto });
    }

    if (action === "set_inbox_status") {
      const dto = await marketingQualificationService.setInboxStatus(
        ctx,
        String(body.qualificationId ?? ""),
        body.inboxStatus as MarketingQualificationInboxStatus,
      );
      return successResponse({ qualification: dto });
    }

    if (action === "handoff") {
      const result = await marketingQualificationService.handoff(ctx, {
        qualificationId: String(body.qualificationId ?? ""),
        routingPolicyId: String(body.routingPolicyId ?? ""),
        notificationPolicyId:
          typeof body.notificationPolicyId === "string" ? body.notificationPolicyId : null,
      });
      return successResponse(result);
    }

    if (action === "retry_notification") {
      const result = await marketingQualificationService.retryNotification(
        ctx,
        String(body.qualificationId ?? ""),
        typeof body.notificationPolicyId === "string" ? body.notificationPolicyId : null,
      );
      return successResponse(result);
    }

    if (action === "upsert_routing_policy") {
      const saved = marketingRoutingPolicyStore.upsert({
        id: typeof body.id === "string" ? body.id : undefined,
        organizationId: ctx.organizationId,
        name: String(body.name ?? "Routing policy"),
        mode: (body.mode as MarketingRoutingMode) ?? "SINGLE_USER",
        assigneeUserId: typeof body.assigneeUserId === "string" ? body.assigneeUserId : null,
        teamId: typeof body.teamId === "string" ? body.teamId : null,
        fallbackAssigneeUserId:
          typeof body.fallbackAssigneeUserId === "string" ? body.fallbackAssigneeUserId : null,
        members: Array.isArray(body.members)
          ? (body.members as Array<{
              userId: string;
              displayName: string;
              territory?: string | null;
              teamId?: string | null;
            }>)
          : undefined,
        rules: parseRules(body.rules),
      });
      return successResponse({ policy: saved });
    }

    if (action === "upsert_notification_policy") {
      const saved = marketingNotificationPolicyStore.upsert({
        id: typeof body.id === "string" ? body.id : undefined,
        organizationId: ctx.organizationId,
        name: String(body.name ?? "Handoff notification"),
        inApp: body.inApp !== false,
        email: body.email === true,
        whatsapp: body.whatsapp === true,
      });
      return successResponse({ policy: saved });
    }

    return errorResponse(400, "UNKNOWN_ACTION", "Unknown qualification action");
  } catch (err) {
    return fromUnknown(err);
  }
}
