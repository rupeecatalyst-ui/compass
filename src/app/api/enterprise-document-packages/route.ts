/**
 * CO-DOC-005 — Document Package Registry API.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import {
  enterpriseDocumentPackageService,
  type DurablePackageUpsertInput,
} from "@server/services/enterprise-document-packages/enterprise-document-package.service";

function guard() {
  if (!isEnterprisePersistencePrisma()) {
    throw Object.assign(new Error("Requires ENTERPRISE_PERSISTENCE_MODE=prisma"), {
      statusCode: 503,
      code: "PERSISTENCE_REQUIRED",
    });
  }
}

function mapMissingTable(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  if (
    /enterprise_document_packages/i.test(message) ||
    /does not exist/i.test(message) ||
    /P2021/i.test(message)
  ) {
    return errorResponse(
      503,
      "PACKAGE_REGISTRY_MIGRATION_PENDING",
      "Document Package Registry tables are not applied yet. Migration pending approval.",
    );
  }
  return null;
}

export async function GET(request: Request) {
  try {
    guard();
    requireAccessToken(request);
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim();
    if (q) {
      const items = await enterpriseDocumentPackageService.search(q);
      return successResponse({ items });
    }
    const opportunityId = url.searchParams.get("opportunityId")?.trim();
    if (!opportunityId) {
      return errorResponse(400, "VALIDATION", "opportunityId or q is required");
    }
    const items = await enterpriseDocumentPackageService.listByOpportunity(opportunityId);
    return successResponse({ items });
  } catch (err) {
    const e = err as { statusCode?: number; code?: string; message?: string; status?: number };
    if (e.status === 401 || e.statusCode === 401) {
      return fromAuthError(err as never);
    }
    const missing = mapMissingTable(err);
    if (missing) return missing;
    return errorResponse(
      e.statusCode || 500,
      e.code || "DOCUMENT_PACKAGE_ERROR",
      e.message || "Failed to list document packages",
    );
  }
}

export async function POST(request: Request) {
  try {
    guard();
    const actor = requireAccessToken(request);
    const body = (await request.json()) as DurablePackageUpsertInput;
    if (!body.opportunityId?.trim() || !body.clientPackageId?.trim() || !body.folderName?.trim()) {
      return errorResponse(
        400,
        "VALIDATION",
        "opportunityId, clientPackageId and folderName are required",
      );
    }
    const item = await enterpriseDocumentPackageService.upsert({
      ...body,
      uploadedBy: body.uploadedBy || actor.email || actor.userId,
      createdBy: body.createdBy || body.uploadedBy || actor.email || actor.userId,
      documentIds: Array.isArray(body.documentIds) ? body.documentIds : [],
      relativePaths: body.relativePaths && typeof body.relativePaths === "object"
        ? body.relativePaths
        : {},
    });
    return successResponse({ item }, 201);
  } catch (err) {
    const e = err as { statusCode?: number; code?: string; message?: string; status?: number };
    if (e.status === 401 || e.statusCode === 401) {
      return fromAuthError(err as never);
    }
    const missing = mapMissingTable(err);
    if (missing) return missing;
    return errorResponse(
      e.statusCode || 500,
      e.code || "DOCUMENT_PACKAGE_ERROR",
      e.message || "Failed to upsert document package",
    );
  }
}
