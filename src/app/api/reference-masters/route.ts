import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ReferenceMasterDomain } from "@/types/enterprise-master-data";
import type { ApiResponse } from "@/types/api";
import { referenceMasterService } from "@server/services/reference-master/reference-master.service";
import {
  mapRouteError,
  referenceMasterPersistenceGuard,
  requireReferenceMasterAdmin,
  resolveActorDisplayName,
} from "./_lib/route-utils";

export async function GET(request: Request) {
  try {
    referenceMasterPersistenceGuard();
    requireAccessToken(request);
    const url = new URL(request.url);
    const domain = url.searchParams.get("domain") as ReferenceMasterDomain | null;
    if (!domain) {
      return errorResponse(400, "DOMAIN_REQUIRED", "Query parameter domain is required.");
    }

    const result = await referenceMasterService.query({
      domain,
      page: Number(url.searchParams.get("page") ?? 1),
      pageSize: Number(url.searchParams.get("pageSize") ?? 100),
      search: url.searchParams.get("search") ?? undefined,
      status: (url.searchParams.get("status") as "all" | "draft" | "active" | "inactive" | "archived") ?? "active",
      enabled:
        url.searchParams.get("enabled") === "true"
          ? true
          : url.searchParams.get("enabled") === "false"
            ? false
            : "all",
      parentId: url.searchParams.get("parentId") ?? undefined,
      sortBy: (url.searchParams.get("sortBy") as "sortOrder" | "label" | "code" | "modifiedOn" | "createdOn") ?? "sortOrder",
      sortDir: (url.searchParams.get("sortDir") as "asc" | "desc") ?? "asc",
    });
    return successResponse(result);
  } catch (err) {
    const mapped = mapRouteError(err);
    if ("status" in mapped && mapped.body) {
      if (mapped.status === 401 || mapped.status === 403) {
        return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
      }
    }
    const message = err instanceof Error ? err.message : "Failed to query reference masters";
    return errorResponse(500, "REF_MASTER_QUERY_FAILED", message);
  }
}

export async function POST(request: Request) {
  try {
    referenceMasterPersistenceGuard();
    const actor = requireAccessToken(request);
    requireReferenceMasterAdmin(actor);
    const body = await request.json();
    const domain = body.domain as ReferenceMasterDomain;
    if (!domain) {
      return errorResponse(400, "DOMAIN_REQUIRED", "domain is required.");
    }

    const created = await referenceMasterService.create(
      {
        domain,
        code: String(body.code ?? ""),
        label: String(body.label ?? ""),
        description: body.description ? String(body.description) : undefined,
        parentId: body.parentId ? String(body.parentId) : undefined,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
        meta: body.meta,
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
    const message = err instanceof Error ? err.message : "Failed to create reference master";
    return errorResponse(400, "REF_MASTER_CREATE_FAILED", message);
  }
}
