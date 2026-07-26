import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import type {
  DocumentRegistryCategory,
  DocumentRegistryClassification,
  DocumentRegistryLifecycleStatus,
} from "@/types/enterprise-document-registry";
import { documentRegistryService } from "@server/services/document-registry/document-registry.service";
import {
  documentRegistryPersistenceGuard,
  mapRouteError,
  parseListQuery,
  requireDocumentRegistryAdmin,
  resolveActorDisplayName,
} from "../_lib/route-utils";

export async function GET(request: Request) {
  try {
    documentRegistryPersistenceGuard();
    requireAccessToken(request);
    const url = new URL(request.url);
    const result = await documentRegistryService.queryDefinitions({
      ...parseListQuery(url),
      typeId: url.searchParams.get("typeId") ?? undefined,
      category:
        (url.searchParams.get("category") as DocumentRegistryCategory | "all") ?? "all",
      lifecycleStatus:
        (url.searchParams.get("lifecycleStatus") as DocumentRegistryLifecycleStatus | "all") ??
        "all",
      classification:
        (url.searchParams.get("classification") as DocumentRegistryClassification | "all") ??
        "all",
    });
    return successResponse(result);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped.status === 401) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(500, "DOCUMENT_DEFINITION_QUERY_FAILED", "Failed to query document definitions");
  }
}

export async function POST(request: Request) {
  try {
    documentRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireDocumentRegistryAdmin(actor);
    const body = await request.json();

    const created = await documentRegistryService.createDefinition(
      {
        typeId: String(body.typeId ?? ""),
        code: String(body.code ?? ""),
        label: String(body.label ?? ""),
        description: body.description ? String(body.description) : undefined,
        category: body.category,
        classification: body.classification,
        lifecycleStatus: body.lifecycleStatus,
        status: body.status,
        enabled: body.enabled,
        notes: body.notes ? String(body.notes) : undefined,
        createdBy: actor.userId,
      },
      await resolveActorDisplayName(actor.userId),
    );
    return successResponse(created, 201);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped.status === 401 || mapped.status === 403) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Failed to create document definition";
    return errorResponse(400, "DOCUMENT_DEFINITION_CREATE_FAILED", message);
  }
}
