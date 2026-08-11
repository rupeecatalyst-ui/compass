/**
 * CO-WP-ACCESS-001 — Admin Wealth Partner Access & Entitlements API.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import type { PartnerExecutionMode } from "@/constants/enterprise-partner-entitlements";
import type { PartnerPermissionMap } from "@/constants/enterprise-partner-entitlements";
import { prisma } from "@server/lib/prisma";
import { partnerEntitlementsService } from "@server/services/partner-entitlements";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can manage Partner Entitlements"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

async function resolveActorLabel(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, email: true },
  });
  const name = user ? `${user.firstName} ${user.lastName}`.trim() : "";
  return name || user?.email || userId;
}

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const url = new URL(request.url);
    const view = url.searchParams.get("view") ?? "partners";
    const wealthPartnerId = url.searchParams.get("wealthPartnerId") ?? undefined;
    const entityKind = url.searchParams.get("entityKind") as "opportunity" | "deal" | null;
    const entityId = url.searchParams.get("entityId");

    if (view === "templates") {
      const templates = await partnerEntitlementsService.listTemplates();
      return successResponse({ templates });
    }

    if (view === "audits") {
      const audits = await partnerEntitlementsService.listAudits({
        wealthPartnerId,
        limit: Number(url.searchParams.get("limit") || 50),
      });
      return successResponse({ audits });
    }

    if (view === "effective" && wealthPartnerId) {
      const partner = await prisma.enterpriseWealthPartner.findFirst({
        where: { id: wealthPartnerId, isDeleted: false },
        select: { organizationId: true },
      });
      if (!partner) {
        return errorResponse(404, "NOT_FOUND", "Wealth Partner not found");
      }
      const effective = await partnerEntitlementsService.resolveForPartner({
        wealthPartnerId,
        organizationId: partner.organizationId,
        entityKind: entityKind || null,
        entityId: entityId || null,
      });
      const profile = await partnerEntitlementsService.getOrCreateProfile(wealthPartnerId, {
        userId: actor.userId,
        label: await resolveActorLabel(actor.userId),
      });
      const overrides = await partnerEntitlementsService.listTransactionEntitlements(wealthPartnerId);
      return successResponse({ effective, profile, overrides });
    }

    if (view === "overrides" && wealthPartnerId) {
      const overrides = await partnerEntitlementsService.listTransactionEntitlements(wealthPartnerId);
      return successResponse({ overrides });
    }

    const partners = await partnerEntitlementsService.listPartnersWithProfiles();
    const templates = await partnerEntitlementsService.listTemplates();
    return successResponse({ partners, templates });
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 401 || statusCode === 403) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      statusCode === 404 ? 404 : 500,
      "PARTNER_ENTITLEMENTS_FAILED",
      err instanceof Error ? err.message : "Failed to load partner entitlements",
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const label = await resolveActorLabel(actor.userId);
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      wealthPartnerId?: string;
      templateId?: string;
      templateCode?: string;
      defaultExecutionMode?: PartnerExecutionMode;
      permissions?: Partial<PartnerPermissionMap>;
      modules?: Record<string, boolean>;
      notes?: string | null;
      reason?: string;
      applyTemplateDefaults?: boolean;
      entityKind?: "opportunity" | "deal";
      entityId?: string;
      executionMode?: PartnerExecutionMode;
      enabled?: boolean;
      label?: string;
      description?: string;
    };

    const action = body.action || "save_profile";
    const actorMeta = { userId: actor.userId, label };

    if (action === "seed_templates") {
      const templates = await partnerEntitlementsService.ensureSystemTemplates(undefined, actorMeta);
      return successResponse({ templates });
    }

    if (action === "update_template") {
      if (!body.templateId) {
        return errorResponse(400, "VALIDATION", "templateId is required");
      }
      const template = await partnerEntitlementsService.updateTemplate(
        body.templateId,
        {
          label: body.label,
          description: body.description,
          permissions: body.permissions,
          modules: body.modules,
          enabled: body.enabled,
          reason: body.reason,
        },
        actorMeta,
      );
      return successResponse({ template });
    }

    if (action === "save_profile") {
      if (!body.wealthPartnerId) {
        return errorResponse(400, "VALIDATION", "wealthPartnerId is required");
      }
      const profile = await partnerEntitlementsService.updateProfile(
        body.wealthPartnerId,
        {
          templateId: body.templateId,
          templateCode: body.templateCode,
          defaultExecutionMode: body.defaultExecutionMode,
          permissions: body.permissions,
          modules: body.modules,
          notes: body.notes,
          reason: body.reason,
          applyTemplateDefaults: body.applyTemplateDefaults,
        },
        actorMeta,
      );
      return successResponse({ profile });
    }

    if (action === "save_transaction_override") {
      if (!body.wealthPartnerId || !body.entityKind || !body.entityId || !body.executionMode) {
        return errorResponse(
          400,
          "VALIDATION",
          "wealthPartnerId, entityKind, entityId, and executionMode are required",
        );
      }
      const override = await partnerEntitlementsService.upsertTransactionEntitlement(
        {
          wealthPartnerId: body.wealthPartnerId,
          entityKind: body.entityKind,
          entityId: body.entityId,
          executionMode: body.executionMode,
          permissions: body.permissions || {},
          reason: body.reason,
        },
        actorMeta,
      );
      return successResponse({ override });
    }

    return errorResponse(400, "UNKNOWN_ACTION", `Unknown action: ${action}`);
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 401 || statusCode === 403) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      statusCode === 404 ? 404 : 500,
      "PARTNER_ENTITLEMENTS_SAVE_FAILED",
      err instanceof Error ? err.message : "Failed to save partner entitlements",
    );
  }
}
