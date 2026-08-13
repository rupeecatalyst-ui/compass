/**
 * CO-MARKETING-MKT-12 — Qualification queue + routing + ENE handoff notification API.
 * No mass conversion. No Lead entity. Unqualified responses cannot hand off.
 */

import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { MARKETING_ROUTING_CRITERION_FIELDS } from "@/constants/enterprise-marketing-engine";
import { EnterpriseMarketingSafetyError } from "@/lib/enterprise-marketing-engine/safety";
import type { ApiResponse } from "@/types/api";
import type { MarketingChannel } from "@/constants/enterprise-marketing-engine";
import type { MarketingRoutingMode } from "@/lib/enterprise-marketing-engine/ports/routing.port";
import type {
  MarketingQualificationBusinessState,
  MarketingQualificationIntent,
  MarketingRoutingRule,
} from "@/types/enterprise-marketing-qualification";
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
  if (err instanceof EnterpriseMarketingSafetyError) {
    return errorResponse(403, err.code, err.message);
  }
  const statusCode = (err as { statusCode?: number }).statusCode;
  const code = (err as { code?: string }).code;
  if (statusCode === 401 || statusCode === 403) {
    return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
  }
  return errorResponse(
    statusCode && statusCode >= 400 && statusCode < 600 ? statusCode : 500,
    code ?? "MARKETING_QUALIFICATION_FAILED",
    err instanceof Error ? err.message : "Marketing qualification request failed",
  );
}

const actorCtx = (actor: { userId: string; role: string }) => ({
  userId: actor.userId,
  role: actor.role,
  organizationId: "default" as string | null,
});

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
    return successResponse(marketingQualificationService.list(actorCtx(actor)));
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
    const ctx = actorCtx(actor);

    if (action === "mass_convert" || action === "mass_handoff") {
      marketingQualificationService.refuseMassConvert();
    }

    if (action === "ingest") {
      const dto = marketingQualificationService.ingestResponse(ctx, {
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
        intent: (body.intent as MarketingQualificationIntent) ?? "none",
        evidenceEventId: typeof body.evidenceEventId === "string" ? body.evidenceEventId : null,
        operatorConfirmed: body.operatorConfirmed === true,
      });
      return successResponse({ qualification: dto });
    }

    if (action === "set_state") {
      const dto = marketingQualificationService.setBusinessState(
        ctx,
        String(body.qualificationId ?? ""),
        body.businessState as MarketingQualificationBusinessState,
        typeof body.note === "string" ? body.note : undefined,
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
        organizationId: "default",
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
        organizationId: "default",
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
