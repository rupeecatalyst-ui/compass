/**
 * Browser client — Post-disbursement confirmation + owner task hydrate.
 */
import { authenticatedJsonFetch } from "@/lib/api-client";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
};

async function pdcFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await authenticatedJsonFetch(url, init);
  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!res.ok || !body.success) {
    const err = new Error(
      body?.error?.message || `Post-disbursement API failed (${res.status})`,
    ) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = body?.error?.code;
    throw err;
  }
  return body.data as T;
}

export type PostDisbursementConfirmResult = {
  dealId: string;
  grossStage: string;
  subStage: string;
  rowVersion: number;
  accountingCaseId: string;
  confirmedAt: string;
  idempotentReplay?: boolean;
};

export type OwnerConfirmationTaskDto = {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  dueAt: string | null;
  assigneeUserId: string | null;
  dealId: string;
  dealNumber: string;
  opportunityId: string | null;
  customerName: string | null;
  productLabel: string | null;
  legacyLoanFileId: string | null;
  lenderId: string | null;
  lenderName: string | null;
  workspaceHref: string;
  requiredAction: string | null;
  autoRuleId: string | null;
  createdAt: string;
};

export const postDisbursementApiClient = {
  async confirmReceived(
    dealId: string,
    body: { rowVersion: number } & Record<string, unknown>,
  ): Promise<PostDisbursementConfirmResult> {
    return pdcFetch(`/api/enterprise-deals/${encodeURIComponent(dealId)}/post-disbursement-confirmation`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  async listMyOpenConfirmationTasks(): Promise<OwnerConfirmationTaskDto[]> {
    const data = await pdcFetch<{ items: OwnerConfirmationTaskDto[] }>(
      "/api/tasks/post-disbursement-confirmation",
    );
    return data.items ?? [];
  },
};
