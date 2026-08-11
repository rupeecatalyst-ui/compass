import { fromAuthError, successResponse } from "@/lib/api/auth-route-utils";
import type { CccDocumentPackageDefinitionCreateBody } from "@/types/corporate-compliance-center";
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
    const packages = await cccService.listPackageDefinitions();
    return successResponse({ packages });
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
    const body = (await request.json()) as CccDocumentPackageDefinitionCreateBody;
    const pkg = await cccService.createPackageDefinition(body, actor);
    return successResponse({ package: pkg }, 201);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleCccRouteError(err);
  }
}
