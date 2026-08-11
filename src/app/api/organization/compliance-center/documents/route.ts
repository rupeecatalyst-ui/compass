import { fromAuthError, successResponse } from "@/lib/api/auth-route-utils";
import type { CccApprovalStatus } from "@/constants/corporate-compliance-center";
import type { CccRepositoryKey } from "@/constants/corporate-compliance-center";
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
    const url = new URL(request.url);
    const repositoryKey = url.searchParams.get("repositoryKey") as CccRepositoryKey | null;
    const legalEntityId = url.searchParams.get("legalEntityId") ?? undefined;
    const financialYear = url.searchParams.get("financialYear") ?? undefined;
    const approvalStatus = url.searchParams.get("approvalStatus") as CccApprovalStatus | null;

    const documents = await cccService.listDocuments({
      ...(repositoryKey ? { repositoryKey } : {}),
      ...(legalEntityId ? { legalEntityId } : {}),
      ...(financialYear ? { financialYear } : {}),
      ...(approvalStatus ? { approvalStatus } : {}),
    });
    return successResponse({ documents });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleCccRouteError(err);
  }
}
