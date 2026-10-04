import { formatAuthError } from "@server/validators/auth.validators";
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { recordCustomFieldAudit } from "@/lib/field-control-master/custom-field-audit";
import { CustomFieldPlacementError } from "@/lib/field-control-master/custom-field-placement";
import { CustomFieldValueError, clearCustomFieldValue, readCustomFieldValues, writeCustomFieldValue } from "@/lib/field-control-master/custom-field-value";
import {
  dealBelongsToOrganization,
  loadPlacementDefinitions,
  prismaCustomFieldValueStore,
  prismaPlacementStore,
  resolveCustomFieldOrganizationId,
} from "@/lib/field-control-master/custom-field-persistence";

function failure(error: unknown) {
  if (error instanceof CustomFieldValueError || error instanceof CustomFieldPlacementError) {
    return errorResponse(error.statusCode, error.code, error.message);
  }
  if (typeof error === "object" && error !== null && "status" in error) {
    return fromAuthError(error as { status: number; body: never });
  }
  return fromAuthError(formatAuthError(error));
}

export async function GET(request: Request) {
  try {
    const token = requireAccessToken(request);
    const url = new URL(request.url);
    if (url.searchParams.has("organizationId")) {
      return errorResponse(400, "ORGANIZATION_CONTEXT_REJECTED", "Organization is taken from the server context.");
    }
    const values = await readCustomFieldValues({
      actor: { userId: token.userId, role: token.role },
      entityDomain: url.searchParams.get("entityDomain") ?? "",
      entityId: url.searchParams.get("entityId") ?? "",
      resolveOrganizationId: resolveCustomFieldOrganizationId,
      dealInOrganization: dealBelongsToOrganization,
      store: prismaCustomFieldValueStore(),
    });
    return successResponse({ values });
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(request: Request) {
  try {
    const token = requireAccessToken(request);
    const body: unknown = await request.json();
    const lineage =
      typeof body === "object" && body !== null && "fieldLineageId" in body
        ? String((body as { fieldLineageId?: unknown }).fieldLineageId ?? "")
        : "";
    const value = await writeCustomFieldValue({
      actor: { userId: token.userId, role: token.role },
      body,
      definitions: lineage ? await loadPlacementDefinitions(lineage) : [],
      resolveOrganizationId: resolveCustomFieldOrganizationId,
      dealInOrganization: dealBelongsToOrganization,
      placements: prismaPlacementStore(),
      store: prismaCustomFieldValueStore(),
      audit: recordCustomFieldAudit,
    });
    return successResponse({ value });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const token = requireAccessToken(request);
    const url = new URL(request.url);
    const cleared = await clearCustomFieldValue({
      actor: { userId: token.userId, role: token.role },
      entityDomain: url.searchParams.get("entityDomain") ?? "",
      entityId: url.searchParams.get("entityId") ?? "",
      fieldLineageId: url.searchParams.get("fieldLineageId") ?? "",
      clientOrganizationId: url.searchParams.get("organizationId"),
      resolveOrganizationId: resolveCustomFieldOrganizationId,
      dealInOrganization: dealBelongsToOrganization,
      store: prismaCustomFieldValueStore(),
      audit: recordCustomFieldAudit,
    });
    return successResponse(cleared);
  } catch (error) {
    return failure(error);
  }
}
