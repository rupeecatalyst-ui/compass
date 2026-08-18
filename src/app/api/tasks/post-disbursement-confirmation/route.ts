import {
  errorResponse,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { postDisbursementConfirmationService } from "@server/services/post-disbursement-confirmation/post-disbursement-confirmation.service";

/** GET — open PDC confirmation tasks for the authenticated owner (Tasks hydrate). */
export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    const rows =
      await postDisbursementConfirmationService.listOpenOwnerConfirmationTasks(
        actor.userId,
      );
    return successResponse({
      items: rows.map((row) => {
        const payload = (row.payload ?? {}) as Record<string, unknown>;
        return {
          id: row.id,
          title: row.title,
          status: row.status,
          priority: row.priority,
          dueAt: row.dueAt?.toISOString() ?? null,
          assigneeUserId: row.assigneeUserId,
          dealId: row.dealId,
          dealNumber: row.deal.dealNumber,
          opportunityId: row.deal.opportunityId,
          customerName: row.deal.primaryContactName,
          productLabel: row.deal.productLabel,
          legacyLoanFileId: row.deal.legacyLoanFileId,
          lenderId: row.deal.lenderId,
          lenderName:
            row.deal.lender?.displayName || row.deal.lender?.legalName || null,
          workspaceHref: `/deals/${encodeURIComponent(row.dealId)}`,
          requiredAction:
            typeof payload.requiredAction === "string"
              ? payload.requiredAction
              : null,
          autoRuleId:
            typeof payload.autoRuleId === "string" ? payload.autoRuleId : null,
          createdAt: row.createdAt.toISOString(),
        };
      }),
    });
  } catch (error) {
    const auth = error as { status?: number; body?: unknown };
    if (auth.status && auth.body) {
      return errorResponse(auth.status, "AUTH_ERROR", "Authentication required");
    }
    return errorResponse(
      500,
      "PDC_TASK_LIST_FAILED",
      error instanceof Error ? error.message : "Failed to list confirmation tasks",
    );
  }
}
