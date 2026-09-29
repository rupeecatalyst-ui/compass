import { formatAuthError } from "@server/validators/auth.validators";
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { CustomFieldPlacementError } from "@/lib/field-control-master/custom-field-placement";
import { CustomFieldValueError } from "@/lib/field-control-master/custom-field-value";
import {
  loadOperationalCustomFields,
  saveOperationalCustomField,
} from "@/lib/field-control-master/operational-custom-field-commit";
import type { OperationalCustomFieldDomain, OperationalCustomFieldMode } from "@/lib/field-control-master/operational-custom-fields";

const DOMAINS = new Set<OperationalCustomFieldDomain>(["contact", "company", "opportunity", "deal"]);
const MODES = new Set<OperationalCustomFieldMode>(["create", "edit", "view"]);

function failure(error: unknown) {
  if (error instanceof CustomFieldValueError || error instanceof CustomFieldPlacementError) {
    return errorResponse(error.statusCode, error.code, error.message);
  }
  if (typeof error === "object" && error !== null && "status" in error) {
    return fromAuthError(error as { status: number; body: never });
  }
  return fromAuthError(formatAuthError(error));
}

function domainOf(value: unknown): OperationalCustomFieldDomain {
  if (typeof value !== "string" || !DOMAINS.has(value as OperationalCustomFieldDomain)) {
    throw new CustomFieldValueError(400, "VALIDATION_ERROR", "domain must be contact, company, opportunity, or deal.");
  }
  return value as OperationalCustomFieldDomain;
}

export async function GET(request: Request) {
  try {
    requireAccessToken(request);
    const url = new URL(request.url);
    if (url.searchParams.has("organizationId")) {
      return errorResponse(400, "ORGANIZATION_CONTEXT_REJECTED", "Organization is taken from the server context.");
    }
    const domain = domainOf(url.searchParams.get("domain"));
    const modeValue = url.searchParams.get("mode") ?? "edit";
    if (!MODES.has(modeValue as OperationalCustomFieldMode)) {
      return errorResponse(400, "VALIDATION_ERROR", "mode must be create, edit, or view.");
    }
    const fields = await loadOperationalCustomFields({
      domain,
      mode: modeValue as OperationalCustomFieldMode,
      entityId: url.searchParams.get("entityId"),
      productCode: url.searchParams.get("productCode"),
      employmentTypeCode: domain === "opportunity" ? url.searchParams.get("employmentTypeCode") : null,
    });
    return successResponse({ fields });
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(request: Request) {
  try {
    const token = requireAccessToken(request);
    const body = (await request.json()) as Record<string, unknown>;
    if ("organizationId" in body || "organisationId" in body) {
      return errorResponse(400, "ORGANIZATION_CONTEXT_REJECTED", "Organization is taken from the server context.");
    }
    if (typeof body.entityId !== "string" || typeof body.fieldLineageId !== "string") {
      return errorResponse(400, "VALIDATION_ERROR", "entityId and fieldLineageId are required.");
    }
    await saveOperationalCustomField({
      domain: domainOf(body.domain),
      entityId: body.entityId,
      fieldLineageId: body.fieldLineageId,
      value: body.value,
      mode: "edit",
      productCode: typeof body.productCode === "string" ? body.productCode : null,
      employmentTypeCode:
        body.domain === "opportunity" && typeof body.employmentTypeCode === "string" ? body.employmentTypeCode : null,
      actorUserId: token.userId,
    });
    return successResponse({ saved: true });
  } catch (error) {
    return failure(error);
  }
}
