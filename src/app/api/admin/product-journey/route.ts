/**
 * Authorized Product Journey administration.
 * Preview uses the publication engine only. It does not create a Contact,
 * Opportunity, recommendation, or document.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { LEGACY_JOURNEY_ROLE_FALLBACK } from "@/lib/compass-customer-gateway/public-question-plan";
import { requireProductRegistryAdmin } from "@/app/api/product-registry/_lib/route-utils";
import { buildIdcJourneyDraft } from "@server/services/compass-customer-gateway/compass-journey-config.service";
import { resolveCompassGatewayOrganizationId } from "@server/services/compass-customer-gateway/compass-organization.resolver";
import {
  importJourneyDraft,
  previewProductJourney,
  publishProductJourney,
  readProductJourneyAdmin,
  retireProductJourney,
  rollbackProductJourney,
  saveProductJourneyDraft,
  setProductJourneyPublicEnabled,
  validateProductJourneyDraft,
  type JourneyDraft,
} from "@/lib/product-journey/publication";
import { ProductJourneyStoreError } from "@/lib/product-journey/store";

function adminFailure(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    "body" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    return fromAuthError(error as Parameters<typeof fromAuthError>[0]);
  }
  const message = error instanceof Error ? error.message : "The journey action was not accepted.";
  const status =
    error && typeof error === "object" && "statusCode" in error && typeof (error as { statusCode: unknown }).statusCode === "number"
      ? (error as { statusCode: number }).statusCode
      : 400;
  return errorResponse(status, "JOURNEY_ADMIN_ERROR", message);
}

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireProductRegistryAdmin(actor);
    const productCode = new URL(request.url).searchParams.get("productCode")?.trim() ?? "";
    if (!productCode) return errorResponse(400, "PRODUCT_REQUIRED", "A product code is required.");
    const organizationId = await resolveCompassGatewayOrganizationId();
    return successResponse({
      ...(await readProductJourneyAdmin(organizationId, productCode)),
      legacyJourneyRoleFallback: LEGACY_JOURNEY_ROLE_FALLBACK,
      authorities: {
        productMaster: "Enterprise Product Registry",
        customerJourney: "Customer Product Journey",
        lenderProgramme: "Enterprise Lender Programme",
        policyVersion: "Credit and policy versions",
      },
    });
  } catch (error) {
    if (error instanceof ProductJourneyStoreError) {
      return errorResponse(503, error.code, "The product journey registry is unavailable.");
    }
    return adminFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireProductRegistryAdmin(actor);
    const organizationId = await resolveCompassGatewayOrganizationId();
    const body = (await request.json()) as {
      action?: string;
      productCode?: string;
      version?: number;
      draft?: JourneyDraft;
      answers?: Record<string, unknown>;
      publiclyEnabled?: boolean;
    };
    const productCode = body.productCode?.trim() ?? "";
    if (!productCode) return errorResponse(400, "PRODUCT_REQUIRED", "A product code is required.");

    if (body.action === "import") {
      const draft = await buildIdcJourneyDraft(productCode);
      return successResponse(await importJourneyDraft({ organizationId, actorId: actor.userId, draft }));
    }
    if (body.action === "draft" && body.draft) {
      return successResponse(await saveProductJourneyDraft(organizationId, { ...body.draft, productCode }, actor.userId));
    }
    if (body.action === "validate") {
      return successResponse(await validateProductJourneyDraft(organizationId, productCode, actor.userId));
    }
    if (body.action === "preview") {
      return successResponse(await previewProductJourney(organizationId, productCode, body.answers ?? {}, actor.userId));
    }
    if (body.action === "publish") {
      return successResponse(await publishProductJourney(organizationId, productCode, actor.userId));
    }
    if (body.action === "rollback") {
      return successResponse(await rollbackProductJourney(organizationId, productCode, Number(body.version), actor.userId));
    }
    if (body.action === "retire") {
      return successResponse(await retireProductJourney(organizationId, productCode, actor.userId));
    }
    if (body.action === "public") {
      return successResponse(await setProductJourneyPublicEnabled(organizationId, productCode, body.publiclyEnabled !== false, actor.userId));
    }
    return errorResponse(400, "UNKNOWN_ACTION", "That journey action is not available.");
  } catch (error) {
    if (error instanceof ProductJourneyStoreError) {
      return errorResponse(503, error.code, "The product journey registry is unavailable.");
    }
    return adminFailure(error);
  }
}
