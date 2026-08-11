import { fromAuthError, successResponse } from "@/lib/api/auth-route-utils";
import type { CccInstitutionProfileCreateBody } from "@/types/corporate-compliance-center";
import { cccService } from "@server/services/corporate-compliance-center/ccc.service";
import {
  guardCccPrisma,
  handleCccRouteError,
  resolveCccActor,
} from "@/app/api/organization/compliance-center/_lib/route-utils";

export async function GET(request: Request) {
  try {
    guardCccPrisma();
    await resolveCccActor(request);
    const institutions = await cccService.listInstitutions();
    return successResponse({ institutions });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleCccRouteError(err);
  }
}

export async function POST(request: Request) {
  try {
    guardCccPrisma();
    const actor = await resolveCccActor(request);
    const body = (await request.json()) as CccInstitutionProfileCreateBody;
    const institution = await cccService.createInstitution(body, actor);
    return successResponse({ institution }, 201);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleCccRouteError(err);
  }
}
