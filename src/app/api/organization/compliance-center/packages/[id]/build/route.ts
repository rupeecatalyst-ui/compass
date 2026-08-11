import { fromAuthError, successResponse } from "@/lib/api/auth-route-utils";
import type { CccBuildPackageInstanceBody } from "@/types/corporate-compliance-center";
import { cccService } from "@server/services/corporate-compliance-center/ccc.service";
import {
  guardCccPrisma,
  handleCccRouteError,
  resolveCccActor,
} from "@/app/api/organization/compliance-center/_lib/route-utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    guardCccPrisma();
    const actor = await resolveCccActor(request);
    const { id } = await params;
    const body = (await request.json()) as CccBuildPackageInstanceBody;
    const instance = await cccService.buildPackageInstance(id, body, actor);
    return successResponse({ instance }, 201);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleCccRouteError(err);
  }
}
