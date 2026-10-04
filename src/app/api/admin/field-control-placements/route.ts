import { formatAuthError } from "@server/validators/auth.validators";
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { recordCustomFieldAudit } from "@/lib/field-control-master/custom-field-audit";
import {
  createCustomFieldPlacement,
  CustomFieldPlacementError,
  listCustomFieldPlacements,
  type PlacementListFilter,
} from "@/lib/field-control-master/custom-field-placement";
import { isLaunchDomain } from "@/lib/field-control-master/custom-field-placement-catalogue";
import {
  loadPlacementDefinitions,
  prismaPlacementStore,
} from "@/lib/field-control-master/custom-field-persistence";

function failure(error: unknown) {
  if (error instanceof CustomFieldPlacementError) return errorResponse(error.statusCode, error.code, error.message);
  if (typeof error === "object" && error !== null && "status" in error) {
    return fromAuthError(error as { status: number; body: never });
  }
  return fromAuthError(formatAuthError(error));
}

export async function GET(request: Request) {
  try {
    const token = requireAccessToken(request);
    const url = new URL(request.url);
    const owningDomain = url.searchParams.get("owningDomain");
    const active = url.searchParams.get("active");
    const filter: PlacementListFilter = {
      ...(url.searchParams.get("fieldLineageId") ? { fieldLineageId: url.searchParams.get("fieldLineageId")! } : {}),
      ...(url.searchParams.get("screenId") ? { screenId: url.searchParams.get("screenId")! } : {}),
      ...(url.searchParams.get("sectionId") ? { sectionId: url.searchParams.get("sectionId")! } : {}),
      ...(owningDomain && isLaunchDomain(owningDomain) ? { owningDomain } : {}),
      ...(active === "true" || active === "false" ? { active: active === "true" } : {}),
    };
    if (owningDomain && !isLaunchDomain(owningDomain)) {
      return errorResponse(400, "DOMAIN_NOT_LAUNCH", "This owning domain is outside the placement launch set.");
    }
    const placements = await listCustomFieldPlacements({
      actor: { role: token.role, userId: token.userId },
      filter,
      store: prismaPlacementStore(),
    });
    return successResponse({ placements });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const token = requireAccessToken(request);
    const body: unknown = await request.json();
    const lineage =
      typeof body === "object" && body !== null && "fieldLineageId" in body
        ? String((body as { fieldLineageId?: unknown }).fieldLineageId ?? "")
        : "";
    const placement = await createCustomFieldPlacement({
      body,
      actor: { role: token.role, userId: token.userId },
      definitions: lineage ? await loadPlacementDefinitions(lineage) : [],
      store: prismaPlacementStore(),
      audit: recordCustomFieldAudit,
    });
    return successResponse({ placement }, 201);
  } catch (error) {
    return failure(error);
  }
}
