import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import type { CreateLenderContactInput, LenderContactDepartment } from "@/types/enterprise-lender-registry";
import { lenderRegistryService } from "@server/services/lender-registry/lender-registry.service";

import {
  lenderRegistryPersistenceGuard,
  mapRouteError,
  requireLenderRegistryAdmin,
  resolveActorDisplayName,
} from "../../../_lib/route-utils";

type RouteContext = { params: Promise<{ lenderId: string }> };

const DEPARTMENTS = new Set<LenderContactDepartment>([
  "relationship_manager",
  "credit",
  "sales",
  "operations",
  "legal",
  "technical",
  "escalation",
  "regional_head",
  "other",
]);

export async function GET(request: Request, context: RouteContext) {
  try {
    lenderRegistryPersistenceGuard();
    requireAccessToken(request);
    const { lenderId } = await context.params;
    const items = await lenderRegistryService.listContacts(lenderId);
    return successResponse(items);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped.status === 401) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    if (mapped.status === 400 || mapped.status === 403) {
      return errorResponse(mapped.status, "LENDER_CONTACTS_FAILED", mapped.body.error?.message ?? "Failed");
    }
    return errorResponse(500, "LENDER_CONTACTS_FAILED", "Failed to load lender contacts");
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    lenderRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireLenderRegistryAdmin(actor);
    const { lenderId } = await context.params;
    const body = await request.json();
    const raw = Array.isArray(body?.contacts) ? body.contacts : Array.isArray(body) ? body : null;
    if (!raw) {
      return errorResponse(400, "INVALID_BODY", "Expected { contacts: [...] }");
    }

    const contacts: CreateLenderContactInput[] = raw.map((c: Record<string, unknown>, i: number) => {
      const department = String(c.department ?? "other") as LenderContactDepartment;
      if (!DEPARTMENTS.has(department)) {
        throw Object.assign(new Error(`Invalid department at index ${i}`), { status: 400 });
      }
      return {
        id: typeof c.id === "string" ? c.id : undefined,
        lenderId,
        name: String(c.name ?? "").trim(),
        designation: c.designation != null ? String(c.designation) : undefined,
        department,
        mobile: c.mobile != null ? String(c.mobile) : undefined,
        email: c.email != null ? String(c.email) : undefined,
        preferredContactMethod:
          c.preferredContactMethod != null ? String(c.preferredContactMethod) : undefined,
        enabled: c.enabled === undefined ? true : Boolean(c.enabled),
        sortOrder: typeof c.sortOrder === "number" ? c.sortOrder : i,
        createdBy: actor.userId,
      };
    });

    for (const c of contacts) {
      if (!c.name) {
        return errorResponse(400, "INVALID_CONTACT", "Contact name is required");
      }
    }

    const actorName = await resolveActorDisplayName(actor.userId);
    const items = await lenderRegistryService.replaceContacts(
      lenderId,
      contacts,
      actor.userId,
      actorName,
    );
    return successResponse(items);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped.status === 401) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    if (mapped.status === 400 || mapped.status === 403) {
      return errorResponse(
        mapped.status,
        "LENDER_CONTACTS_REPLACE_FAILED",
        mapped.body.error?.message ?? "Failed",
      );
    }
    return errorResponse(500, "LENDER_CONTACTS_REPLACE_FAILED", "Failed to replace lender contacts");
  }
}
