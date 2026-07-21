import {

  errorResponse,

  fromAuthError,

  requireAccessToken,

  successResponse,

} from "@/lib/api/auth-route-utils";

import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";

import { configureEcmPersistencePorts } from "@/lib/enterprise-persistence";

import { ecmCompanyService } from "@server/services/ecm/company.service";

import type { ApiResponse } from "@/types/api";

import type { EcmCompanyRelationRole } from "@/types/enterprise-company-master";



function persistenceGuard() {

  if (!isEnterprisePersistencePrisma()) {

    throw new Error("ECM REST API requires ENTERPRISE_PERSISTENCE_MODE=prisma");

  }

}



type RouteContext = { params: Promise<{ companyId: string }> };



export async function GET(request: Request, context: RouteContext) {

  try {

    persistenceGuard();

    configureEcmPersistencePorts();

    requireAccessToken(request);

    const { companyId } = await context.params;

    const links = await ecmCompanyService.listLinks(companyId);

    return successResponse({ links });

  } catch (err) {

    if (typeof err === "object" && err !== null && "status" in err) {

      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });

    }

    return errorResponse(500, "ECM_LINKS_QUERY_FAILED", "Failed to list company links");

  }

}



export async function POST(request: Request, context: RouteContext) {

  try {

    persistenceGuard();

    configureEcmPersistencePorts();

    const actor = requireAccessToken(request);

    const { companyId } = await context.params;

    const body = await request.json();

    const link = await ecmCompanyService.linkContact({

      companyId,

      contactId: String(body.contactId ?? ""),

      relationRole: (body.relationRole as EcmCompanyRelationRole) || "other",

      createdBy: actor.userId,

    });

    return successResponse(link, 201);

  } catch (err) {

    if (typeof err === "object" && err !== null && "status" in err) {

      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });

    }

    const message = err instanceof Error ? err.message : "Failed to link contact";

    return errorResponse(400, "ECM_LINK_FAILED", message);

  }

}

