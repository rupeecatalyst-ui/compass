import {
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import type { WealthPartnerLegalLifecycleAction } from "@/types/enterprise-wealth-partner-legal-docket";
import { wealthPartnerRegistryService } from "@server/services/wealth-partner-registry";
import {
  mapRouteError,
  requireWealthPartnerWriteAccess,
  respondMappedError,
  wealthPartnerPersistenceGuard,
} from "../../../_lib/route-utils";

type Ctx = { params: Promise<{ partnerId: string }> };

const ACTIONS = new Set([
  "generate_docket",
  "renew_reactivate",
  "mark_sent",
  "mark_partner_signed",
  "mark_countersigned",
  "activate",
  "mark_expired",
  "suspend",
  "record_view",
  "record_download",
  "link_registry",
]);

/**
 * CO-WP-007 — Wealth Partner Legal Docket actions.
 * GET — compliance projection (via workspace compose).
 * POST — generate / lifecycle (writes complianceJson only; no migrations).
 */
export async function GET(request: Request, ctx: Ctx) {
  try {
    wealthPartnerPersistenceGuard();
    requireAccessToken(request);
    const { partnerId } = await ctx.params;
    const bundle = await wealthPartnerRegistryService.getWorkspace(partnerId);
    return successResponse({
      legalCompliance: bundle.legalCompliance,
      partnerId: bundle.partner.id,
      partnerCode: bundle.partner.code,
    });
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped?.status === 401) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return respondMappedError(err);
  }
}

export async function POST(request: Request, ctx: Ctx) {
  try {
    wealthPartnerPersistenceGuard();
    const actor = requireAccessToken(request);
    requireWealthPartnerWriteAccess(actor);
    const { partnerId } = await ctx.params;
    const body = (await request.json()) as {
      action?: string;
      documentId?: string | null;
      documentRegistryLinks?: Array<{
        documentId: string;
        documentRegistryRecordId: string;
      }>;
    };
    const action = body.action ?? "";
    if (!ACTIONS.has(action)) {
      return Response.json(
        {
          success: false,
          error: {
            code: "INVALID_ACTION",
            message: `Unknown Legal Docket action: ${action}`,
          },
        },
        { status: 400 },
      );
    }
    const bundle = await wealthPartnerRegistryService.runLegalDocketAction(
      partnerId,
      {
        action: action as WealthPartnerLegalLifecycleAction | "generate_docket" | "renew_reactivate",
        actorUserId: actor.userId,
        documentId: body.documentId,
        documentRegistryLinks: body.documentRegistryLinks,
      },
    );
    return successResponse(bundle);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped?.status === 401) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    if (mapped?.status === 400) {
      return Response.json(mapped.body, { status: 400 });
    }
    return respondMappedError(err);
  }
}
