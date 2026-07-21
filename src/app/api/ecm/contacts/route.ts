import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { configureEcmPersistencePorts, syncEcmPortsFromPrisma } from "@/lib/enterprise-persistence";
import { ecmContactService } from "@server/services/ecm/contact.service";
import type { ApiResponse } from "@/types/api";
import type { EcmContactQuery, EcmContactRole, EcmContactStatus } from "@/types/enterprise-contact-master";

function persistenceGuard() {
  if (!isEnterprisePersistencePrisma()) {
    throw new Error("ECM REST API requires ENTERPRISE_PERSISTENCE_MODE=prisma");
  }
}

export async function GET(request: Request) {
  try {
    persistenceGuard();
    configureEcmPersistencePorts();
    requireAccessToken(request);
    const url = new URL(request.url);
    const query: EcmContactQuery = {
      page: Number(url.searchParams.get("page") ?? 1),
      pageSize: Number(url.searchParams.get("pageSize") ?? 100),
      search: url.searchParams.get("search") ?? undefined,
      sortBy: (url.searchParams.get("sortBy") as EcmContactQuery["sortBy"]) ?? "modifiedOn",
      sortDir: (url.searchParams.get("sortDir") as "asc" | "desc") ?? "desc",
      status: (url.searchParams.get("status") as EcmContactQuery["status"]) ?? "active",
      roles: url.searchParams.get("roles")?.split(",").filter(Boolean) as EcmContactRole[] | undefined,
    };
    const result = await ecmContactService.query(query);
    await syncEcmPortsFromPrisma();
    return successResponse(result);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Failed to query contacts";
    return errorResponse(500, "ECM_QUERY_FAILED", message);
  }
}

export async function POST(request: Request) {
  try {
    persistenceGuard();
    configureEcmPersistencePorts();
    const actor = requireAccessToken(request);
    const body = await request.json();
    const contact = await ecmContactService.register({
      name: String(body.name ?? ""),
      mobilePrimary: String(body.mobilePrimary ?? ""),
      createdBy: actor.userId,
      mobileSecondary: body.mobileSecondary,
      personalEmail: body.personalEmail,
      officialEmail: body.officialEmail,
      city: body.city,
      state: body.state,
      roles: body.roles,
      primaryRole: body.primaryRole,
      status: body.status as EcmContactStatus | undefined,
      ownerName: body.ownerName,
      ownerId: body.ownerId,
      strategicContact: body.strategicContact,
    });
    await syncEcmPortsFromPrisma();
    return successResponse(contact, 201);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Failed to create contact";
    return errorResponse(400, "ECM_CREATE_FAILED", message);
  }
}
