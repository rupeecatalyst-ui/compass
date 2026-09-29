import { formatAuthError } from "@server/validators/auth.validators";
import { prisma } from "@server/lib/prisma";
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { recordCustomFieldAudit } from "@/lib/field-control-master/custom-field-audit";
import {
  loadDealWorkspaceCustomFields,
  saveDealWorkspaceCustomField,
  type DealWorkspaceFieldDefinition,
} from "@/lib/field-control-master/deal-workspace-custom-fields";
import { CustomFieldPlacementError } from "@/lib/field-control-master/custom-field-placement";
import { CustomFieldValueError } from "@/lib/field-control-master/custom-field-value";
import {
  dealBelongsToOrganization,
  prismaCustomFieldValueStore,
  prismaPlacementStore,
  resolveCustomFieldOrganizationId,
} from "@/lib/field-control-master/custom-field-persistence";

type RouteContext = { params: Promise<{ dealId: string }> };

function failure(error: unknown) {
  if (error instanceof CustomFieldValueError || error instanceof CustomFieldPlacementError) {
    return errorResponse(error.statusCode, error.code, error.message);
  }
  if (typeof error === "object" && error !== null && "status" in error) {
    return fromAuthError(error as { status: number; body: never });
  }
  return fromAuthError(formatAuthError(error));
}

async function definitionsForLineage(lineageId: string): Promise<DealWorkspaceFieldDefinition[]> {
  const rows = await prisma.fieldControlDefinition.findMany({ where: { lineageId } });
  return rows.map((row) => ({
    id: row.id,
    fieldId: row.fieldId,
    lineageId: row.lineageId,
    versionNumber: row.versionNumber,
    classification: row.classification,
    owningDomain: row.owningDomain,
    lifecycleStatus: row.lifecycleStatus,
    fieldType: row.fieldType,
    controlsRuntime: row.controlsRuntime,
    customerFacingActivation: row.customerFacingActivation,
    selectOptionKeysJson: row.selectOptionKeysJson,
    currencyUnitsJson: row.currencyUnitsJson,
    applicabilityDeclared: row.applicabilityDeclared,
    productApplicabilityJson: row.productApplicabilityJson,
    friendlyLabel: row.friendlyLabel,
  }));
}

async function resolveDealProductCode(organizationId: string, dealId: string): Promise<string | null> {
  const deal = await prisma.enterpriseDeal.findFirst({
    where: { id: dealId, organizationId, isDeleted: false },
    select: { productCode: true },
  });
  return deal?.productCode ?? null;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const token = requireAccessToken(request);
    const { dealId } = await context.params;
    const url = new URL(request.url);
    if (url.searchParams.has("organizationId")) {
      return errorResponse(400, "ORGANIZATION_CONTEXT_REJECTED", "Organization is taken from the server context.");
    }
    const fields = await loadDealWorkspaceCustomFields({
      actor: { userId: token.userId, role: token.role },
      dealId,
      mode: "edit",
      resolveOrganizationId: resolveCustomFieldOrganizationId,
      dealInOrganization: dealBelongsToOrganization,
      placements: prismaPlacementStore(),
      definitionsForLineage,
      values: prismaCustomFieldValueStore(),
      resolveProductCode: resolveDealProductCode,
    });
    return successResponse({ fields });
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const token = requireAccessToken(request);
    const { dealId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    if ("organizationId" in body) {
      return errorResponse(400, "ORGANIZATION_CONTEXT_REJECTED", "Organization is taken from the server context.");
    }
    if (typeof body.fieldLineageId !== "string") {
      return errorResponse(400, "VALIDATION_ERROR", "fieldLineageId is required.");
    }
    const definitions = await definitionsForLineage(body.fieldLineageId);
    const saved = await saveDealWorkspaceCustomField({
      actor: { userId: token.userId, role: token.role },
      dealId,
      fieldLineageId: body.fieldLineageId,
      value: body.value,
      resolveOrganizationId: resolveCustomFieldOrganizationId,
      dealInOrganization: dealBelongsToOrganization,
      placements: prismaPlacementStore(),
      definitions,
      values: prismaCustomFieldValueStore(),
      audit: recordCustomFieldAudit,
      resolveProductCode: resolveDealProductCode,
    });
    return successResponse(saved);
  } catch (error) {
    return failure(error);
  }
}
