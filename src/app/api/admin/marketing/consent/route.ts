/**
 * CO-MARKETING-REDESIGN-012 — Admin Consent and Suppression Centre API.
 * Fixture identities only. No live send. No real recipient ingest.
 */

import {
  errorResponse,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { fromMarketingUnknownError } from "@/lib/enterprise-marketing-engine/api-error";
import { MARKETING_PERMISSIONS } from "@/constants/enterprise-marketing-engine/permissions";
import { assertMarketingPermission } from "@/lib/enterprise-marketing-engine/permissions";
import type {
  MarketingConsentChannel,
  MarketingConsentRecordKind,
  MarketingConsentSource,
} from "@/constants/enterprise-marketing-engine/consent-suppression";
import { resolveMarketingOrganizationId } from "@server/services/enterprise-marketing-engine/organization";
import { marketingConsentService } from "@server/services/enterprise-marketing-engine";
import type { MarketingConsentPolicy } from "@/types/enterprise-marketing-consent";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can open Consent and Suppression Centre"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

function fromUnknown(err: unknown) {
  return fromMarketingUnknownError(
    err,
    "MARKETING_CONSENT_FAILED",
    err instanceof Error ? err.message : "Marketing consent request failed",
  );
}

async function actorCtx(actor: { userId: string; role: string }) {
  return {
    userId: actor.userId,
    role: actor.role,
    organizationId: await resolveMarketingOrganizationId(),
  };
}

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const ctx = await actorCtx(actor);
    assertMarketingPermission(ctx, MARKETING_PERMISSIONS.SUPPRESSION_VIEW);
    const url = new URL(request.url);
    const view = url.searchParams.get("view");
    if (view === "cards") {
      return successResponse({ cards: marketingConsentService.cards(ctx) });
    }
    if (view === "policy") {
      return successResponse({ policy: marketingConsentService.policy(ctx) });
    }
    if (view === "history") {
      const fingerprint = url.searchParams.get("fingerprint") ?? "";
      if (!fingerprint.trim()) {
        return errorResponse(400, "INVALID_INPUT", "fingerprint is required");
      }
      return successResponse({ history: marketingConsentService.history(ctx, fingerprint) });
    }
    if (view === "export") {
      return successResponse(marketingConsentService.prepareExport(ctx));
    }
    const records = marketingConsentService.list(ctx, {
      search: url.searchParams.get("search"),
      kind: (url.searchParams.get("kind") as MarketingConsentRecordKind | "all" | null) ?? "all",
      source: (url.searchParams.get("source") as MarketingConsentSource | "all" | null) ?? "all",
      campaignId: url.searchParams.get("campaignId"),
      status: url.searchParams.get("status"),
    });
    return successResponse({
      records,
      cards: marketingConsentService.cards(ctx),
      policy: marketingConsentService.policy(ctx),
    });
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const ctx = await actorCtx(actor);
    const body = (await request.json().catch(() => ({}))) as {
      action?: "add" | "lift" | "policy" | "export_prep" | "delete" | "evaluate";
      fingerprint?: string;
      reason?: string;
      recordId?: string;
      kind?: MarketingConsentRecordKind;
      channel?: MarketingConsentChannel;
      source?: MarketingConsentSource;
      campaignId?: string | null;
      expiresAt?: string | null;
      duration?: "PERMANENT" | "TEMPORARY";
      policy?: Partial<Omit<MarketingConsentPolicy, "organizationId">>;
      phase?: "snapshot_approval" | "delivery";
      consentValue?: string | null;
    };

    const action = body.action ?? "add";

    if (action === "delete") {
      marketingConsentService.delete(ctx, body.recordId ?? "");
    }

    if (action === "lift") {
      if (!body.recordId) {
        return errorResponse(400, "INVALID_INPUT", "recordId is required");
      }
      const record = marketingConsentService.lift(ctx, body.recordId, body.reason ?? "");
      return successResponse({ record });
    }

    if (action === "policy") {
      const policy = marketingConsentService.savePolicy(ctx, body.policy ?? {});
      return successResponse({ policy });
    }

    if (action === "export_prep") {
      return successResponse(marketingConsentService.prepareExport(ctx));
    }

    if (action === "evaluate") {
      const decision = marketingConsentService.evaluateDelivery(ctx, {
        fingerprints: body.fingerprint ? [body.fingerprint] : [],
        phase: body.phase ?? "delivery",
        campaignId: body.campaignId,
        consentValue: body.consentValue,
      });
      return successResponse({ decision });
    }

    if (!body.fingerprint) {
      return errorResponse(400, "INVALID_INPUT", "fingerprint is required");
    }
    const record = marketingConsentService.add(ctx, {
      fingerprint: body.fingerprint,
      reason: body.reason ?? "",
      kind: body.kind,
      channel: body.channel,
      source: body.source,
      campaignId: body.campaignId,
      expiresAt: body.expiresAt,
      duration: body.duration,
    });
    return successResponse({ record });
  } catch (err) {
    return fromUnknown(err);
  }
}
