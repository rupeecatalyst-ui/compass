import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { configureEcmPersistencePorts, syncEcmPortsFromPrisma } from "@/lib/enterprise-persistence";
import { ecmContactService } from "@server/services/ecm/contact.service";
import { softDeleteService } from "@server/services/soft-delete/soft-delete.service";
import { prisma } from "@server/lib/prisma";
import type { ApiResponse } from "@/types/api";
import type { EcmContactRole, EcmContactStatus } from "@/types/enterprise-contact-master";

function persistenceGuard() {
  if (!isEnterprisePersistencePrisma()) {
    throw new Error("ECM REST API requires ENTERPRISE_PERSISTENCE_MODE=prisma");
  }
}

type RouteContext = { params: Promise<{ contactId: string }> };

async function actorDisplayName(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, email: true },
  });
  if (!user) return undefined;
  return `${user.firstName} ${user.lastName}`.trim() || user.email;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    persistenceGuard();
    requireAccessToken(_request);
    const { contactId } = await context.params;
    const contact = await ecmContactService.getById(contactId);
    if (!contact) return errorResponse(404, "NOT_FOUND", "Contact not found");
    return successResponse(contact);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(500, "ECM_GET_FAILED", "Failed to load contact");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    persistenceGuard();
    configureEcmPersistencePorts();
    const tokenActor = requireAccessToken(request);
    const { contactId } = await context.params;
    const body = await request.json();

    let result;
    if (body.action === "archive" || body.action === "soft_delete") {
      await softDeleteService.softDelete({
        module: "contacts",
        entityId: contactId,
        actor: {
          userId: tokenActor.userId,
          role: tokenActor.role,
          displayName: await actorDisplayName(tokenActor.userId),
        },
        reason: body.reason ? String(body.reason) : undefined,
      });
      result = await ecmContactService.getById(contactId);
      // Soft-deleted contacts are hidden from getById — return stub acknowledgement
      if (!result) {
        await syncEcmPortsFromPrisma();
        return successResponse({ id: contactId, status: "archived", isDeleted: true });
      }
    } else if (body.action === "promoteStatus" && body.status) {
      result = await ecmContactService.promoteStatus(
        contactId,
        body.status as EcmContactStatus,
        tokenActor.userId,
      );
    } else {
      result = await ecmContactService.update(
        contactId,
        {
          name: body.name,
          mobilePrimary: body.mobilePrimary,
          mobileSecondary: body.mobileSecondary,
          personalEmail: body.personalEmail,
          officialEmail: body.officialEmail,
          city: body.city,
          state: body.state,
          roles: body.roles as EcmContactRole[] | undefined,
          primaryRole: body.primaryRole as EcmContactRole | undefined,
          status: body.status as EcmContactStatus | undefined,
          ownerName: body.ownerName,
          ownerId: body.ownerId,
          strategicContact: body.strategicContact,
        },
        tokenActor.userId,
      );
    }
    await syncEcmPortsFromPrisma();
    return successResponse(result);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Failed to update contact";
    return errorResponse(400, "ECM_UPDATE_FAILED", message);
  }
}
