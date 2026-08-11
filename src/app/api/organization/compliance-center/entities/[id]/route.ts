import { fromAuthError, successResponse } from "@/lib/api/auth-route-utils";
import type { CccLegalEntityPatchBody } from "@/types/corporate-compliance-center";
import { cccService } from "@server/services/corporate-compliance-center/ccc.service";
import {
  guardCccPrisma,
  handleCccRouteError,
  resolveCccActor,
} from "@/app/api/organization/compliance-center/_lib/route-utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    guardCccPrisma();
    const actor = await resolveCccActor(request);
    const { id } = await params;
    const body = (await request.json()) as CccLegalEntityPatchBody;
    const entity = await cccService.patchLegalEntity(id, body, actor);
    return successResponse({ entity });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleCccRouteError(err);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    guardCccPrisma();
    const actor = await resolveCccActor(request);
    const { id } = await params;
    await cccService.deleteLegalEntity(id, actor);
    return successResponse({ deleted: true });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleCccRouteError(err);
  }
}
