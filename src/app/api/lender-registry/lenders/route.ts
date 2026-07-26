import {

  errorResponse,

  fromAuthError,

  requireAccessToken,

  successResponse,

} from "@/lib/api/auth-route-utils";

import type { ApiResponse } from "@/types/api";

import type {

  LenderInstitutionCategory,

  LenderLifecycleStatus,

  LenderOperationalStatus,

} from "@/types/enterprise-lender-registry";

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

    const result = await lenderRegistryService.queryLenders({

      ...parseListQuery(url),

      categoryId: url.searchParams.get("categoryId") ?? undefined,

      institutionCategory:

        (url.searchParams.get("institutionCategory") as LenderInstitutionCategory | "all") ??

        "all",

      lifecycleStatus:

        (url.searchParams.get("lifecycleStatus") as LenderLifecycleStatus | "all") ?? "all",

      operationalStatus:

        (url.searchParams.get("operationalStatus") as LenderOperationalStatus | "all") ?? "all",

    });

    return successResponse(result);

  } catch (err) {

    const mapped = mapRouteError(err);

    if (mapped.status === 401) {

      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });

    }

    return errorResponse(500, "LENDER_QUERY_FAILED", "Failed to query lenders");

  }

}



export async function POST(request: Request) {

  try {

    lenderRegistryPersistenceGuard();

    const actor = requireAccessToken(request);

    requireLenderRegistryAdmin(actor);

    const body = await request.json();



    const created = await lenderRegistryService.createLender(

      {

        categoryId: String(body.categoryId ?? ""),

        code: String(body.code ?? ""),

        label: String(body.label ?? ""),

        description: body.description ? String(body.description) : undefined,

        institutionCategory: body.institutionCategory,

        lifecycleStatus: body.lifecycleStatus,

        operationalStatus: body.operationalStatus,

        countryReferenceId: body.countryReferenceId ? String(body.countryReferenceId) : undefined,

        stateReferenceId: body.stateReferenceId ? String(body.stateReferenceId) : undefined,

        cityReferenceId: body.cityReferenceId ? String(body.cityReferenceId) : undefined,

        headquartersLabel: body.headquartersLabel ? String(body.headquartersLabel) : undefined,

        website: body.website ? String(body.website) : undefined,

        tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,

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

    const message = err instanceof Error ? err.message : "Failed to create lender";

    return errorResponse(400, "LENDER_CREATE_FAILED", message);

  }

}


