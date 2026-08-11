/**
 * CO-MASTER-002 — Resolve Credit & Risk policy + Program LOD for a lender program.
 * GET /api/lender-registry/programs/[programId]/resolve
 */
import {
  fromAuthError,
  requireAccessToken,
  successResponse,
  errorResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { lenderRegistryService } from "@server/services/lender-registry/lender-registry.service";
import { resolvePolicyForProgram } from "@/lib/enterprise-lender-registry/resolve-program-policy";
import { resolveProgramLod } from "@/lib/document-requests/resolve-program-lod";
import {
  lenderRegistryPersistenceGuard,
  mapRouteError,
  notFound,
} from "../../../_lib/route-utils";

type Ctx = { params: Promise<{ programId: string }> };

export async function GET(request: Request, context: Ctx) {
  try {
    lenderRegistryPersistenceGuard();
    requireAccessToken(request);
    const { programId } = await context.params;
    const program = await lenderRegistryService.getProgramById(programId);
    if (!program || program.isDeleted) {
      return notFound("Program not found");
    }

    const url = new URL(request.url);
    const employmentType = url.searchParams.get("employmentType");

    const policy = resolvePolicyForProgram({ program });
    const lod = resolveProgramLod({
      program,
      employmentType,
    });

    return successResponse({
      programId: program.id,
      programCode: program.code,
      programLabel: program.label,
      lenderId: program.lenderId,
      productCode: program.productCode,
      employmentType: program.employmentType,
      policy: {
        ok: policy.ok,
        source: policy.source,
        ref: policy.ref ?? program.creditRiskPolicyRef ?? null,
        error: policy.error ?? null,
        policyId: policy.policy?.policyId ?? null,
        policyCode: policy.policy?.policyCode ?? null,
        policyName: policy.policy?.policyName ?? null,
        status: policy.policy?.status ?? null,
        lenderId: policy.policy?.lenderId ?? null,
        productId: policy.policy?.productId ?? null,
      },
      lod: {
        items: lod,
        mandatoryCount: lod.filter((i) => i.mandatory).length,
        optionalCount: lod.filter((i) => !i.mandatory).length,
      },
    });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const mapped = mapRouteError(err);
    return errorResponse(mapped.status, mapped.body.error?.code ?? "ERROR", mapped.body.error?.message ?? "Failed");
  }
}
