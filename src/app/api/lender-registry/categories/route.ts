import {

  errorResponse,

  fromAuthError,

  requireAccessToken,

  successResponse,

} from "@/lib/api/auth-route-utils";

import type { ApiResponse } from "@/types/api";

import { lenderRegistryService } from "@server/services/lender-registry/lender-registry.service";

import {

  lenderRegistryPersistenceGuard,

  mapRouteError,

  parseListQuery,

  requireLenderRegistryAdmin,

  resolveActorDisplayName,

} from "../_lib/route-utils";



export async function GET(request: Request) {

  try {

    lenderRegistryPersistenceGuard();

    requireAccessToken(request);

    const url = new URL(request.url);

    const result = await lenderRegistryService.queryCategories(parseListQuery(url));

    return successResponse(result);

  } catch (err) {

    const mapped = mapRouteError(err);

    if (mapped.status === 401) {

      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });

    }

    return errorResponse(500, "LENDER_CATEGORY_QUERY_FAILED", "Failed to query lender categories");

  }

}



export async function POST(request: Request) {

  try {

    lenderRegistryPersistenceGuard();

    const actor = requireAccessToken(request);

    requireLenderRegistryAdmin(actor);

    const body = await request.json();



    const created = await lenderRegistryService.createCategory(

      {

        code: String(body.code ?? ""),

        label: String(body.label ?? ""),

        description: body.description ? String(body.description) : undefined,

        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,

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

    const message = err instanceof Error ? err.message : "Failed to create lender category";

    return errorResponse(400, "LENDER_CATEGORY_CREATE_FAILED", message);

  }

}


