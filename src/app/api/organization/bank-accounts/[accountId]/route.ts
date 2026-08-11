import {
  fromAuthError,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { organizationWorkspaceService } from "@server/services/organization-workspace/organization-workspace.service";
import type { OrganizationBankAccountPatch } from "@/types/enterprise-organization-workspace";
import {
  guardOrganizationWorkspacePrisma,
  handleOrganizationRouteError,
  resolveOrganizationActor,
} from "../../_lib/route-utils";

type RouteContext = { params: Promise<{ accountId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    guardOrganizationWorkspacePrisma();
    const actor = await resolveOrganizationActor(request);
    const { accountId } = await context.params;
    const body = (await request.json()) as OrganizationBankAccountPatch;
    const account = await organizationWorkspaceService.updateBankAccount(accountId, body, actor);
    return successResponse(account);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleOrganizationRouteError(err);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    guardOrganizationWorkspacePrisma();
    const actor = await resolveOrganizationActor(request);
    const { accountId } = await context.params;
    await organizationWorkspaceService.deleteBankAccount(accountId, actor);
    return successResponse({ deleted: true });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleOrganizationRouteError(err);
  }
}
