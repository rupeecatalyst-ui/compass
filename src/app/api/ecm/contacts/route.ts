import {
  errorResponse,
  fromAuthError,
  jsonResponse,
  requireAccessToken,
  successResponse,
  withOpsRoute,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import {
  configureEcmPersistencePorts,
  syncEcmPortsFromPrisma,
} from "@/lib/enterprise-persistence/server";
import { recordBusinessAudit } from "@/lib/ops";
import { ecmContactService } from "@server/services/ecm/contact.service";
import {
  EcmContactActiveExistsError,
  EcmContactSoftDeletedError,
  ECM_CONTACT_ACTIVE_EXISTS,
  ECM_CONTACT_SOFT_DELETED,
} from "@server/services/ecm/contact-identity-errors";
import type { ApiResponse } from "@/types/api";
import type { EcmContactQuery, EcmContactRole, EcmContactStatus } from "@/types/enterprise-contact-master";

function persistenceGuard() {
  if (!isEnterprisePersistencePrisma()) {
    throw new Error("ECM REST API requires ENTERPRISE_PERSISTENCE_MODE=prisma");
  }
}

function identityConflictResponse(
  err: EcmContactActiveExistsError | EcmContactSoftDeletedError,
  correlationId: string,
) {
  if (err instanceof EcmContactSoftDeletedError) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: ECM_CONTACT_SOFT_DELETED,
          message:
            "A previously deleted Contact was found. Restore it to preserve Enterprise history.",
          statusCode: 409,
          correlationId,
          softDeletedContact: {
            contactId: err.snapshot.contactId,
            name: err.snapshot.name,
            mobilePrimary: err.snapshot.mobilePrimary,
            deletedAt: err.snapshot.deletedAt,
            deletedBy: err.snapshot.deletedBy,
            deletionReason: err.snapshot.deletionReason,
          },
        },
      },
      409,
      correlationId,
    );
  }

  return jsonResponse(
    {
      success: false,
      error: {
        code: ECM_CONTACT_ACTIVE_EXISTS,
        message: "An active Contact already exists for this mobile number.",
        statusCode: 409,
        correlationId,
        activeContact: {
          contactId: err.snapshot.contactId,
          name: err.snapshot.name,
          mobilePrimary: err.snapshot.mobilePrimary,
        },
      },
    },
    409,
    correlationId,
  );
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
      createdFrom: url.searchParams.get("createdFrom") ?? undefined,
      createdTo: url.searchParams.get("createdTo") ?? undefined,
      institutionKeys: url.searchParams.get("institutionKeys")?.split("|").filter(Boolean),
      skipTotal: url.searchParams.get("skipTotal") === "1",
    };
    const result = await ecmContactService.query(query);
    // CO-BUG-LSC-LOOKUP — Do NOT sync full registry (pageSize 5000) on every list GET.
    // That rehydrate was multiplying LSC latency into client timeouts. Mutations still sync.
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
  return withOpsRoute(
    request,
    { module: "Customer", action: "create", endpoint: "/api/ecm/contacts" },
    async ({ correlationId }) => {
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
          roleProfiles: body.roleProfiles,
          status: body.status as EcmContactStatus | undefined,
          ownerName: body.ownerName,
          ownerId: body.ownerId,
          strategicContact: body.strategicContact,
        });
        await syncEcmPortsFromPrisma();
        const entityId =
          contact && typeof contact === "object" && "id" in contact
            ? String((contact as { id: unknown }).id)
            : null;
        recordBusinessAudit({
          actorUserId: actor.userId,
          module: "Customer",
          action: "Customer Created",
          entityId,
          previousValue: null,
          newValue: entityId ? `contact:${entityId}` : "created",
          result: "Success",
          correlationId,
        });
        return successResponse(contact, 201, correlationId);
      } catch (err) {
        if (typeof err === "object" && err !== null && "status" in err) {
          return fromAuthError(err as { status: number; body: ApiResponse<unknown> }, {
            correlationId,
            endpoint: "/api/ecm/contacts",
          });
        }
        if (
          err instanceof EcmContactSoftDeletedError ||
          err instanceof EcmContactActiveExistsError
        ) {
          return identityConflictResponse(err, correlationId);
        }
        const message = err instanceof Error ? err.message : "Failed to create contact";
        const safe =
          /P2002|prisma|unique constraint|SQL/i.test(message)
            ? "This mobile number is already linked to an Enterprise Contact. Search the registry or restore a deleted Contact."
            : message;
        return errorResponse(400, "ECM_CREATE_FAILED", safe, undefined, {
          correlationId,
          module: "Customer",
          action: "create",
          endpoint: "/api/ecm/contacts",
        });
      }
    },
  );
}
