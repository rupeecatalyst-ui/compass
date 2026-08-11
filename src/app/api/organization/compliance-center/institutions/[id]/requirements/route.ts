import { fromAuthError, successResponse } from "@/lib/api/auth-route-utils";
import type { CccInstitutionRequirementCreateBody } from "@/types/corporate-compliance-center";
import { cccService } from "@server/services/corporate-compliance-center/ccc.service";
import {
  guardCccPrisma,
  handleCccRouteError,
  resolveCccActor,
} from "@/app/api/organization/compliance-center/_lib/route-utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  try {
    guardCccPrisma();
    await resolveCccActor(request);
    const { id } = await params;
    const requirements = await cccService.listRequirements(id);
    return successResponse({ requirements });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleCccRouteError(err);
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    guardCccPrisma();
    const actor = await resolveCccActor(request);
    const { id } = await params;
    const body = (await request.json()) as CccInstitutionRequirementCreateBody;
    const requirement = await cccService.createRequirement(id, body, actor);
    return successResponse({ requirement }, 201);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleCccRouteError(err);
  }
}
