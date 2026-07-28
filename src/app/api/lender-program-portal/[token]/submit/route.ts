/**
 * CO-LEND-001 — Submit program (staging only — no live publish).
 */
import { errorResponse, successResponse } from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { lenderProgramPortalService } from "@server/services/lender-program-portal/lender-program-portal.service";
import type {
  LenderProgramDocumentLink,
  LenderProgramPayload,
  LenderProgramVerifier,
} from "@/types/lender-program-portal";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma mode");
    }
    const { token } = await ctx.params;
    const body = (await request.json()) as {
      productCode?: string;
      programName?: string;
      payload?: LenderProgramPayload;
      documentLinks?: LenderProgramDocumentLink[];
      verifier?: LenderProgramVerifier;
    };
    if (!body.productCode?.trim() || !body.verifier || !body.payload) {
      return errorResponse(400, "VALIDATION", "productCode, verifier and payload are required");
    }
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
    const item = await lenderProgramPortalService.submitProgram(
      decodeURIComponent(token),
      {
        productCode: body.productCode,
        programName: body.programName || String(body.payload.programName || "Program"),
        payload: body.payload,
        documentLinks: body.documentLinks,
        verifier: body.verifier,
        ipAddress: ip,
      },
    );
    return successResponse(item, 201);
  } catch (err) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    return errorResponse(
      e.statusCode || 500,
      e.code || "LENDER_PROGRAM_PORTAL_ERROR",
      e.message || "Submit failed",
    );
  }
}
